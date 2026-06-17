'use client';

import { useEffect, useState } from 'react';
import type { ProductShippingMode } from '@/lib/shipping';

type AdminProduct = {
  id: string;
  name: string;
  price: number;
  shipping_mode?: ProductShippingMode | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
};

function clp(value: number) {
  return '$' + Math.round(value || 0).toLocaleString('es-CL');
}

function parseMoney(value: string) {
  return Math.max(0, Math.round(Number(value.replace(/\D/g, '')) || 0));
}

export default function ProductShippingOverrides({ onNotice }: { onNotice: (notice: { type: 'success' | 'error'; message: string }) => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar productos.');
      setProducts(Array.isArray(json.products) ? json.products : []);
    } catch (err) {
      onNotice({ type: 'error', message: err instanceof Error ? err.message : 'Error cargando productos.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  function updateProduct(id: string, patch: Partial<AdminProduct>) {
    setProducts((current) => current.map((p) => p.id === id ? { ...p, ...patch } : p));
  }

  async function saveProduct(product: AdminProduct) {
    try {
      const res = await fetch(`/api/admin/products/shipping?id=${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_mode: product.shipping_mode || 'inherit',
          shipping_fee: product.shipping_fee ?? null,
          shipping_weight_kg: product.shipping_weight_kg ?? null,
          shipping_dimensions: product.shipping_dimensions || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar envío del producto.');
      onNotice({ type: 'success', message: `Envío actualizado: ${product.name}` });
    } catch (err) {
      onNotice({ type: 'error', message: err instanceof Error ? err.message : 'Error guardando producto.' });
    }
  }

  return (
    <section className="overflow-x-auto rounded-3xl border border-white/10 bg-zinc-950/70">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-black text-white">Overrides por producto</h2>
        <p className="mt-1 text-sm text-zinc-500">Controla si un producto hereda la tarifa global, usa prueba, producción, envío fijo o envío gratis.</p>
      </div>
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-black/30">
            {['Producto', 'Modo', 'Tarifa fija', 'Peso kg', 'Dimensiones', 'Acción'].map((h) => <th key={h} className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? <tr><td className="px-4 py-8 text-zinc-500" colSpan={6}>Cargando productos…</td></tr> : products.slice(0, 80).map((product) => (
            <tr key={product.id} className="hover:bg-white/[0.03]">
              <td className="min-w-[260px] px-4 py-4"><b className="line-clamp-1 text-white">{product.name}</b><p className="text-xs text-zinc-500">{clp(product.price)}</p></td>
              <td className="px-4 py-4"><select value={product.shipping_mode || 'inherit'} onChange={(e) => updateProduct(product.id, { shipping_mode: e.target.value as ProductShippingMode })} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-zinc-200 outline-none"><option value="inherit">Heredar global</option><option value="test">Forzar prueba</option><option value="production">Forzar producción</option><option value="fixed">Envío fijo</option><option value="free">Envío gratis</option></select></td>
              <td className="px-4 py-4"><MoneyInput value={product.shipping_fee || 0} onChange={(value) => updateProduct(product.id, { shipping_fee: value })} /></td>
              <td className="px-4 py-4"><input value={product.shipping_weight_kg ?? ''} onChange={(e) => updateProduct(product.id, { shipping_weight_kg: Number(e.target.value || 0) })} type="number" step="0.1" className="w-24 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-zinc-200 outline-none" /></td>
              <td className="px-4 py-4"><input value={product.shipping_dimensions || ''} onChange={(e) => updateProduct(product.id, { shipping_dimensions: e.target.value })} placeholder="20x15x8 cm" className="w-40 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-zinc-200 outline-none" /></td>
              <td className="px-4 py-4"><button onClick={() => void saveProduct(product)} className="rounded-xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black">Guardar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">$</span><input value={value.toLocaleString('es-CL')} onChange={(e) => onChange(parseMoney(e.target.value))} inputMode="numeric" className="w-36 rounded-xl border border-white/10 bg-black/35 py-2 pl-7 pr-3 font-bold text-white outline-none focus:border-yellow-300/40" /></div>;
}
