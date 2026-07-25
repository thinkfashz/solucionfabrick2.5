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
        .select('id, name, description, price, stock, delivery_days, image_url, featured, activo, tagline, category_id, specifications, source, source_url, source_id, supplier_price, supplier_currency, shipping_fee, discount_percentage')
        .eq('id', id)
        .limit(1);

      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        const p = data[0] as Record<string, unknown>;
        const productSpecs = p.specifications && typeof p.specifications === 'object' ? p.specifications as Record<string, unknown> : {};
        setInitialData({
          name: String(p.name ?? ''), description: String(p.description ?? ''), price: p.price != null ? String(p.price) : '',
          category_id: String(p.category_id ?? ''), stock: p.stock != null ? String(p.stock) : '', delivery_days: p.delivery_days != null ? String(p.delivery_days) : '',
          tagline: String(p.tagline ?? ''), image_url: String(p.image_url ?? ''), activo: p.activo !== false, featured: Boolean(p.featured), specifications: productSpecs,
          source: String(p.source ?? ''), source_url: String(p.source_url ?? ''), source_id: String(p.source_id ?? ''),
          supplier_price: p.supplier_price != null ? String(p.supplier_price) : '', supplier_currency: String(p.supplier_currency ?? 'CLP'), shipping_fee: p.shipping_fee != null ? String(p.shipping_fee) : '',
          tax_percentage: productSpecs.tax_percentage != null ? String(productSpecs.tax_percentage) : '19',
          discount_percentage: p.discount_percentage != null ? String(p.discount_percentage) : String(productSpecs.discount_percentage ?? '0'),
        });
      }
      setLoading(false);
    }
    void load();
  }, [id]);

  if (loading) return <div className="grid min-h-[62vh] place-items-center rounded-[32px] bg-[#f6f0df] text-[#746d5d]"><div className="text-center"><span className="mx-auto mb-4 block size-9 animate-spin rounded-full border-2 border-[#d7cdb5] border-t-[#17170f]" /><p className="text-sm font-bold">Preparando editor de producto…</p></div></div>;
  if (notFound) return <div className="flex min-h-[62vh] flex-col items-center justify-center gap-3 rounded-[32px] bg-[#fffaf0] text-[#746d5d]"><span className="grid size-14 place-items-center rounded-2xl bg-[#17170f] text-2xl">🔍</span><p className="text-base font-black text-[#17170f]">Producto no encontrado</p><p className="text-sm">Comprueba que el producto siga disponible en el catálogo.</p></div>;
  return <ProductForm mode="edit" productId={id} initialData={initialData ?? undefined} />;
}
