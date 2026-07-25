import type { Metadata } from 'next';
import { insforge } from '@/lib/insforge';
import { buildProductMetaDescription } from '@/lib/utils';
import ProductoClient from './ProductoClient';

type Props = { params: Promise<{ id: string }> };

type ProductRow = {
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  rating: number | null;
  stock?: number | null;
  tagline?: string | null;
  specifications?: Record<string, unknown> | null;
};

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function productImages(product: ProductRow) {
  const specs = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications) ? product.specifications : {};
  const assets = Array.isArray(specs.gallery_assets) ? specs.gallery_assets : [];
  const gallery = Array.isArray(specs.gallery_images) ? specs.gallery_images : [];
  const urls: string[] = [];
  if (product.image_url) urls.push(product.image_url);
  assets.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const url = String(row.url || row.secure_url || '').trim();
    if (url) urls.push(url);
  });
  gallery.forEach((item) => { const url = String(item || '').trim(); if (url) urls.push(url); });
  return Array.from(new Set(urls)).slice(0, 10);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await insforge.database
    .from('products')
    .select('name, description, image_url, price, rating, stock, tagline, specifications')
    .eq('id', id)
    .single();

  const product = data as ProductRow | null;

  if (!product?.name) {
    return { title: 'Producto | Soluciones Fabrick' };
  }

  const specs = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications) ? product.specifications : {};
  const marketing = specs.marketing_ai && typeof specs.marketing_ai === 'object' && !Array.isArray(specs.marketing_ai) ? specs.marketing_ai as Record<string, unknown> : {};
  const title = String(specs.seo_title || marketing.seo_title || product.name).trim();
  const description = String(specs.seo_description || marketing.seo_description || product.description || buildProductMetaDescription(product.name, 'Descubre')).trim().slice(0, 165);
  const keywords = Array.from(new Set([
    String(specs.primary_keyword || marketing.primary_keyword || '').trim(),
    ...stringList(specs.secondary_keywords || marketing.secondary_keywords),
    ...stringList(specs.long_tail_keywords || marketing.long_tail_keywords),
    ...stringList(marketing.commercial_keywords),
    product.name,
    'Soluciones Fabrick',
  ].filter(Boolean))).slice(0, 24);
  const imageAltTexts = stringList(specs.image_alt_texts || marketing.image_alt_texts);
  const images = productImages(product).map((url, index) => ({ url, alt: imageAltTexts[index] || `${product.name}, vista ${index + 1}` }));
  const canonical = `https://www.solucionesfabrick.com/producto/${id}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: {
      title: `${title} | Soluciones Fabrick`,
      description,
      images,
      type: 'website',
      url: canonical,
      siteName: 'Soluciones Fabrick',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Soluciones Fabrick`,
      description,
      images: images.map((image) => image.url),
    },
    other: {
      'product:price:amount': String(product.price || 0),
      'product:price:currency': 'CLP',
      'product:availability': Number(product.stock || 0) > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default function ProductPage() {
  return <ProductoClient />;
}
