import type { Metadata } from 'next';
import { insforge } from '@/lib/insforge';
import ProductoClient from './ProductoClient';

type Props = { params: Promise<{ id: string }> };

type ProductRow = {
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  rating: number | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await insforge.database
    .from('products')
    .select('name, description, image_url, price, rating')
    .eq('id', id)
    .single();

  const product = data as ProductRow | null;

  if (!product?.name) {
    return { title: 'Producto | Soluciones Fabrick' };
  }

  const title = product.name;
  const description =
    product.description ||
    `Descubre ${product.name} en Soluciones Fabrick. Materiales premium para construcción y remodelación en la Región del Maule, Chile.`;

  const images = product.image_url ? [{ url: product.image_url }] : [];

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Soluciones Fabrick`,
      description,
      images,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Soluciones Fabrick`,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
    alternates: {
      canonical: `https://www.solucionesfabrick.com/producto/${id}`,
    },
  };
}

export default function ProductPage() {
  return <ProductoClient />;
}
