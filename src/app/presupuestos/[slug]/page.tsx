import type { Metadata } from 'next';
import { createClient } from '@insforge/sdk';
import PresupuestoPublicClient from './PresupuestoPublicClient';

const SITE_URL = 'https://www.solucionesfabrick.com';
const DEFAULT_IMAGE = `${SITE_URL}/icon-512.png`;

type PageProps = { params: Promise<{ slug: string }> };

type BudgetMeta = {
  titulo?: string;
  descripcion?: string;
  cliente?: string;
  empresa_cliente?: string;
  proveedor?: string;
  imagenes?: Array<{ url?: string; titulo?: string }>;
};

function getPublicInsforge() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_API_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
  return createClient({ baseUrl, anonKey });
}

async function getBudgetMeta(slug: string): Promise<BudgetMeta | null> {
  try {
    const db = getPublicInsforge();
    const { data, error } = await db.database
      .from('presupuestos')
      .select('*')
      .eq('slug', slug)
      .limit(1);
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return (row as BudgetMeta) || null;
  } catch {
    return null;
  }
}

function absoluteImage(url?: string) {
  if (!url) return DEFAULT_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function plainText(value?: string, fallback = '') {
  return (value || fallback).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const budget = await getBudgetMeta(slug);
  const client = budget?.empresa_cliente || budget?.cliente || 'Cliente';
  const provider = budget?.proveedor || 'Soluciones Fabris';
  const title = budget?.titulo ? `${budget.titulo} · ${client}` : 'Propuesta comercial · Soluciones Fabris';
  const description = plainText(
    budget?.descripcion,
    'Propuesta comercial de mobiliario técnico, fabricación modular e instalación profesional por Soluciones Fabris.',
  ).slice(0, 220);
  const image = absoluteImage(budget?.imagenes?.find((img) => img.url)?.url);
  const url = `${SITE_URL}/presupuestos/${slug}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: provider,
      type: 'article',
      locale: 'es_CL',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: budget?.titulo || 'Propuesta comercial Soluciones Fabris',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PresupuestoPublicPage({ params }: PageProps) {
  const { slug } = await params;
  return <PresupuestoPublicClient slug={slug} />;
}
