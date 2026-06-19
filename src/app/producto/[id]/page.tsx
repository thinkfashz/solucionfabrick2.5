import { cache } from 'react';
import type { Metadata } from 'next';
import { insforge } from '@/lib/insforge';
import { buildProductMetaDescription } from '@/lib/utils';
import ProductoClient from './ProductoClient';

type Props = { params: Promise<{ id: string }> };

type ProductRow = {
  id?: string;
  name: string;
  tagline?: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  rating: number | null;
  category_id?: string | null;
  stock?: number | null;
  discount_percentage?: number | null;
  delivery_days?: number | string | null;
  specifications?: Record<string, unknown> | null;
};

const SITE_URL = 'https://www.solucionesfabrick.com';
const FALLBACK_IMAGE = `${SITE_URL}/logo-soluciones-fabrick.svg`;

const getProduct = cache(async (id: string) => {
  const { data } = await insforge.database
    .from('products')
    .select('id, name, tagline, description, image_url, price, rating, category_id, stock, discount_percentage, delivery_days, specifications')
    .eq('id', id)
    .single();

  return data as ProductRow | null;
});

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
}

function validImage(url?: string | null) {
  return url && /^https?:\/\//i.test(url) ? url : FALLBACK_IMAGE;
}

function finalPrice(product: ProductRow) {
  const discount = Number(product.discount_percentage || 0);
  return discount > 0 ? Math.round(product.price * (1 - discount / 100)) : product.price;
}

function availability(product: ProductRow) {
  if (typeof product.stock === 'number' && product.stock <= 0) return 'out of stock';
  return 'in stock';
}

function productSummary(product: ProductRow) {
  const pieces = [
    product.tagline,
    product.description,
    `Precio ${formatCLP(finalPrice(product))}.`,
    product.rating ? `Calificación ${product.rating}/5.` : null,
    product.stock !== null && product.stock !== undefined ? `Stock: ${product.stock}.` : 'Stock por confirmar.',
    'Ficha con compra directa, carrito, asesoría y opción de instalación con Soluciones Fabrick.',
  ].filter(Boolean);
  return pieces.join(' ').slice(0, 240);
}

function productJsonLd(id: string, product: ProductRow) {
  const image = validImage(product.image_url);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productSummary(product),
    image: [image],
    category: product.category_id || 'Productos y servicios',
    brand: { '@type': 'Brand', name: 'Soluciones Fabrick' },
    aggregateRating: product.rating
      ? { '@type': 'AggregateRating', ratingValue: String(product.rating), reviewCount: '1' }
      : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/producto/${id}`,
      priceCurrency: 'CLP',
      price: String(finalPrice(product)),
      availability: availability(product) === 'in stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product?.name) {
    return {
      title: 'Producto | Soluciones Fabrick',
      description: 'Ficha de producto o servicio en Soluciones Fabrick.',
    };
  }

  const title = `${product.name} | ${formatCLP(finalPrice(product))}`;
  const description = productSummary(product) || buildProductMetaDescription(product.name, 'Descubre');
  const image = validImage(product.image_url);
  const canonical = `${SITE_URL}/producto/${id}`;

  return {
    title,
    description,
    keywords: [product.name, product.category_id || 'producto', 'Soluciones Fabrick', 'compra online', 'instalación', 'servicios'],
    alternates: { canonical },
    openGraph: {
      title: `${product.name} | Soluciones Fabrick`,
      description,
      url: canonical,
      siteName: 'Soluciones Fabrick',
      locale: 'es_CL',
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Soluciones Fabrick`,
      description,
      images: [image],
    },
    other: {
      'product:price:amount': String(finalPrice(product)),
      'product:price:currency': 'CLP',
      'product:availability': availability(product),
      'product:category': product.category_id || 'Productos y servicios',
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  return (
    <>
      {product?.name && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(id, product)) }}
        />
      )}
      <ProductoClient />
    </>
  );
}
