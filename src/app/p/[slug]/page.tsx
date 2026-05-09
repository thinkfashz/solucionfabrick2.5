import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  getPresupuestoBySlug,
  isPresupuestoExpired,
  PRESUPUESTO_TTL_DIAS,
} from '@/lib/presupuestos';
import PresupuestoVigenteView from './PresupuestoVigenteView';
import PresupuestoExpiradoView from './PresupuestoExpiradoView';

export const dynamic = 'force-dynamic';

const COMPANY_PHONE = (process.env.NEXT_PUBLIC_FABRICK_PHONE ?? '').replace(/[^0-9]/g, '');

async function resolveOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return '';
}

function buildWhatsappLink(origin: string, slug: string, name: string, expirado: boolean): string {
  const linkTxt = `${origin}/p/${slug}`;
  const text = encodeURIComponent(
    expirado
      ? `Hola, soy ${name || 'cliente'}. Mi presupuesto (${linkTxt}) caducó. ¿Podrían generarme uno nuevo con los precios actualizados? Gracias.`
      : `Hola, soy ${name || 'cliente'}. Tengo dudas sobre mi presupuesto: ${linkTxt}`,
  );
  return COMPANY_PHONE ? `https://wa.me/${COMPANY_PHONE}?text=${text}` : `https://wa.me/?text=${text}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPresupuestoBySlug(slug);
  if (!p) return { title: 'Presupuesto · Soluciones Fabrick', robots: { index: false, follow: false } };
  return {
    title: `Presupuesto · ${p.customer_name} · Soluciones Fabrick`,
    description: `Presupuesto válido por ${PRESUPUESTO_TTL_DIAS} días desde la emisión.`,
    robots: { index: false, follow: false },
  };
}

export default async function PresupuestoPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const presupuesto = await getPresupuestoBySlug(slug);
  if (!presupuesto) notFound();

  const expirado = isPresupuestoExpired(presupuesto);
  const origin = await resolveOrigin();

  if (expirado) {
    return (
      <PresupuestoExpiradoView
        customerName={presupuesto.customer_name}
        whatsappLink={buildWhatsappLink(origin, slug, presupuesto.customer_name, true)}
      />
    );
  }

  const expiraLabel = new Date(presupuesto.expira_at).toLocaleString('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  });

  return (
    <PresupuestoVigenteView
      presupuesto={presupuesto}
      expiraLabel={expiraLabel}
      whatsappLink={buildWhatsappLink(origin, slug, presupuesto.customer_name, false)}
    />
  );
}
