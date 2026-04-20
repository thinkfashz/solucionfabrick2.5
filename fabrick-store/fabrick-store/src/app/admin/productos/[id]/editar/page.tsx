'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import ProductForm, { ProductFormData } from '../../ProductForm';

export default function EditarProductoPage() {
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<Partial<ProductFormData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await insforge.database
        .from('products')
        .select('id, name, description, price, stock, image_url, featured, activo, tagline, category_id')
        .eq('id', id)
        .limit(1);

      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        const p = data[0] as {
          name?: string;
          description?: string;
          price?: number;
          category_id?: string;
          stock?: number;
          tagline?: string;
          image_url?: string;
          activo?: boolean;
          featured?: boolean;
        };
        setInitialData({
          name: p.name ?? '',
          description: p.description ?? '',
          price: p.price != null ? String(p.price) : '',
          category_id: p.category_id ?? 'General',
          stock: p.stock != null ? String(p.stock) : '',
          tagline: p.tagline ?? '',
          image_url: p.image_url ?? '',
          activo: p.activo !== false,
          featured: !!p.featured,
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-sm">
        Cargando producto…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-zinc-500">
        <span className="text-3xl">🔍</span>
        <p className="text-sm">Producto no encontrado</p>
      </div>
    );
  }

  return <ProductForm mode="edit" productId={id} initialData={initialData ?? undefined} />;
}
