import type { Metadata } from 'next';
import { insforge } from '@/lib/insforge';
import { buildProductMetaDescription } from '@/lib/utils';
import ProductoTiendaClient from './ProductoTiendaClient';

type Props = { params: Promise<{ id: string }> };

type ProductRow = {
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await insforge.database
    .from('products')
    .select('name, description, image_url, price')
    .eq('id', id)
    .single();

  const product = data as ProductRow | null;

  if (!product?.name) {
    return { title: 'Producto | Soluciones Fabrick' };
  }

  const title = product.name;
  const description =
    product.description ?? buildProductMetaDescription(product.name, 'Compra');

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
      canonical: `https://www.solucionesfabrick.com/tienda/${id}`,
    },
  };
}

export default function TiendaProductPage() {
  return <ProductoTiendaClient />;
}
