import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  buildPresupuestoLink,
  getPresupuestoBySlug,
  isPresupuestoExpired,
  markPresupuestoSent,
  PRESUPUESTO_TTL_DIAS,
} from '@/lib/presupuestos';
import { getResendCredentials } from '@/lib/resendCredentials';
import PresupuestoEmail from '@/emails/PresupuestoEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

interface SendBody {
  slug?: unknown;
  /** Override del destinatario; si se omite usa customer_email del presupuesto. */
  to?: unknown;
}

// IMPORTANTE: este es el dominio sandbox público de Resend, sólo válido para
// pruebas. Configura `RESEND_FROM` (o el campo `from` en la tarjeta Resend de
// /admin/integraciones) con una dirección de un dominio verificado en
// producción para evitar ser marcado como spam.
const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

function pickLogoUrl(requestUrl: string): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/+$/, '')}/logo.png`;
  try {
    const u = new URL(requestUrl);
    return `${u.origin}/logo.png`;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido (JSON requerido).' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });

  const presupuesto = await getPresupuestoBySlug(slug);
  if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });

  if (isPresupuestoExpired(presupuesto)) {
    return NextResponse.json(
      { error: 'El presupuesto ya está vencido; no se puede reenviar.' },
      { status: 410 },
    );
  }

  const overrideTo = typeof body.to === 'string' ? body.to.trim() : '';
  const recipient = overrideTo || presupuesto.customer_email || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return NextResponse.json(
      { error: 'El presupuesto no tiene email válido. Indícalo en el campo "to".' },
      { status: 400 },
    );
  }

  const creds = await getResendCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          'Resend no está configurado. Agrega la API Key en /admin/integraciones (tarjeta Resend) o define RESEND_API_KEY en variables de entorno.',
      },
      { status: 503 },
    );
  }

  const link = buildPresupuestoLink(slug, request.url);
  const logoUrl = pickLogoUrl(request.url);

  const resend = new Resend(creds.apiKey);
  const from = creds.from ?? DEFAULT_FROM;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: `Tu presupuesto Soluciones Fabrick — válido por ${PRESUPUESTO_TTL_DIAS} días`,
      react: PresupuestoEmail({
        customerName: presupuesto.customer_name,
        link,
        total: Number(presupuesto.total) || 0,
        expiraAt: presupuesto.expira_at,
        notas: presupuesto.notas,
        ttlDias: PRESUPUESTO_TTL_DIAS,
        logoUrl,
      }),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Resend rechazó el envío.', details: error },
        { status: 502 },
      );
    }

    await markPresupuestoSent(slug, 'email');
    return NextResponse.json({ ok: true, id: data?.id ?? null, to: recipient, link });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Error enviando email.' },
      { status: 500 },
    );
  }
}
