import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProductoClient from './ProductoClient';
import { insforge } from '@/lib/insforge';

const BASE_URL = 'https://www.solucionesfabrick.com';

interface ProductMeta {
  name: string;
  description?: string;
  tagline?: string;
  image_url?: string;
  price?: number;
}

async function fetchProductMeta(id: string): Promise<ProductMeta | null> {
  try {
    const { data } = await insforge.database
      .from('products')
      .select('name,description,tagline,image_url,price')
      .eq('id', id)
      .single();
    return data as ProductMeta | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchProductMeta(id);

  if (!p) {
    return {
      title: 'Producto | Catálogo Fabrick',
      alternates: { canonical: `${BASE_URL}/tienda/${id}` },
    };
  }

  const title = `${p.name} | Catálogo Fabrick`;
  const description =
    p.description ||
    p.tagline ||
    `${p.name} disponible en el catálogo de Soluciones Fabrick. Construcción y remodelación en la Región del Maule.`;

  return {
    title,
    description,
    openGraph: {
      title: p.name,
      description,
      url: `${BASE_URL}/tienda/${id}`,
      siteName: 'Soluciones Fabrick',
      ...(p.image_url
        ? { images: [{ url: p.image_url, width: 1200, height: 630, alt: p.name }] }
        : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      description,
      ...(p.image_url ? { images: [p.image_url] } : {}),
    },
    alternates: { canonical: `${BASE_URL}/tienda/${id}` },
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await fetchProductMeta(id);

  const jsonLd = p
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.description || p.tagline || p.name,
        ...(p.image_url ? { image: p.image_url } : {}),
        brand: { '@type': 'Brand', name: 'Soluciones Fabrick' },
        offers: {
          '@type': 'Offer',
          url: `${BASE_URL}/tienda/${id}`,
          priceCurrency: 'CLP',
          price: p.price ?? 0,
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'Soluciones Fabrick' },
        },
      })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <Suspense>
        <ProductoClient id={id} />
      </Suspense>
    </>
  );
}
