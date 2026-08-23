'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { AdminBaseButton, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

type Product = { id: string; name: string };
type Movement = {
  id: string; product_id: string; movement_type: 'in' | 'out' | 'adjustment' | 'order' | 'return'; quantity: number;
  stock_before: number; stock_after: number; barcode?: string | null; note?: string | null; actor_id?: string | null;
  created_at: string; reference_type?: string | null; reference_id?: string | null;
};

const LABELS: Record<Movement['movement_type'], string> = { in: 'Entrada', out: 'Salida', adjustment: 'Ajuste', order: 'Pedido', return: 'Devolución' };

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/inventory?history=1', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/inventory?catalog=1', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([history, catalog]) => {
      setMovements(Array.isArray(history.movements) ? history.movements : []);
      setProducts(Array.isArray(catalog.products) ? catalog.products : []);
    }).finally(() => setLoading(false));
  }, []);

  const names = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const stats = useMemo(() => ({
    total: movements.length,
    inbound: movements.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0),
    outbound: Math.abs(movements.filter((m) => m.quantity < 0).reduce((s, m) => s + m.quantity, 0)),
    adjustments: movements.filter((m) => m.movement_type === 'adjustment').length,
  }), [movements]);

  return <AdminBasePage eyebrow="Inventario" title="Movimientos de stock" description="Trazabilidad persistente de entradas, salidas, ajustes, devoluciones y referencias operativas." actions={<><AdminBaseButton href="/admin/inventario" variant="ghost">Inventario</AdminBaseButton><AdminBaseButton href="/admin/inventario/scan">Escanear</AdminBaseButton></>}>
    <AdminBaseGrid cols="4">
      <AdminBaseMetric label="Movimientos" value={stats.total} hint="últimos 100" />
      <AdminBaseMetric label="Entradas" value={stats.inbound} hint="unidades" />
      <AdminBaseMetric label="Salidas" value={stats.outbound} hint="unidades" />
      <AdminBaseMetric label="Ajustes" value={stats.adjustments} hint="correcciones manuales" />
    </AdminBaseGrid>

    <section className="overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/72">
      {loading ? <div className="px-5 py-14 text-sm text-[#82776C]">Cargando movimientos…</div> : movements.length === 0 ? <div className="px-5 py-14 text-sm text-[#82776C]">Aún no hay movimientos registrados.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b border-black/8 bg-black/[0.025] text-left text-[10px] font-black uppercase tracking-[.16em] text-[#82776C]"><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3 text-right">Cantidad</th><th className="px-5 py-3 text-right">Antes</th><th className="px-5 py-3 text-right">Después</th><th className="px-5 py-3">Código / referencia</th><th className="px-5 py-3">Actor</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id} className="border-b border-black/6 last:border-0"><td className="px-5 py-4 text-[#6D6258]">{new Date(m.created_at).toLocaleString('es-CL')}</td><td className="px-5 py-4 font-bold text-[#08090A]">{names.get(m.product_id) || m.product_id.slice(0, 8)}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6EFE7] px-2.5 py-1 text-xs font-bold text-[#51463C]">{m.movement_type === 'in' ? <ArrowDownToLine className="h-3.5 w-3.5" /> : m.movement_type === 'out' ? <ArrowUpFromLine className="h-3.5 w-3.5" /> : m.movement_type === 'return' ? <RotateCcw className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}{LABELS[m.movement_type]}</span></td><td className={`px-5 py-4 text-right font-black ${m.quantity > 0 ? 'text-emerald-700' : m.quantity < 0 ? 'text-red-700' : 'text-[#08090A]'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td><td className="px-5 py-4 text-right text-[#6D6258]">{m.stock_before}</td><td className="px-5 py-4 text-right font-black text-[#08090A]">{m.stock_after}</td><td className="px-5 py-4 text-xs text-[#6D6258]">{m.barcode || m.reference_id || '—'}</td><td className="px-5 py-4 text-xs text-[#6D6258]">{m.actor_id || 'admin'}</td></tr>)}</tbody></table></div>}
    </section>
  </AdminBasePage>;
}
