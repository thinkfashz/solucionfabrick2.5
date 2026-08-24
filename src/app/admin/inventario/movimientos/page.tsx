'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, History, RefreshCw, RotateCcw, ScanLine, SlidersHorizontal } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Product = { id: string; name: string };
type Movement = {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'order' | 'return';
  quantity: number;
  stock_before: number;
  stock_after: number;
  barcode?: string | null;
  note?: string | null;
  actor_id?: string | null;
  created_at: string;
  reference_type?: string | null;
  reference_id?: string | null;
};

const LABELS: Record<Movement['movement_type'], string> = { in: 'Entrada', out: 'Salida', adjustment: 'Ajuste', order: 'Pedido', return: 'Devolución' };
const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white';

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [historyRes, catalogRes] = await Promise.all([
        fetch('/api/admin/inventory?history=1', { cache: 'no-store' }),
        fetch('/api/admin/inventory?catalog=1', { cache: 'no-store' }),
      ]);
      const history = await historyRes.json().catch(() => ({}));
      const catalog = await catalogRes.json().catch(() => ({}));
      if (!historyRes.ok) throw new Error(history.error ?? `HTTP ${historyRes.status}`);
      if (!catalogRes.ok) throw new Error(catalog.error ?? `HTTP ${catalogRes.status}`);
      setMovements(Array.isArray(history.movements) ? history.movements : []);
      setProducts(Array.isArray(catalog.products) ? catalog.products : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los movimientos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const names = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const stats = useMemo(() => ({
    total: movements.length,
    inbound: movements.filter((movement) => movement.quantity > 0).reduce((sum, movement) => sum + movement.quantity, 0),
    outbound: Math.abs(movements.filter((movement) => movement.quantity < 0).reduce((sum, movement) => sum + movement.quantity, 0)),
    adjustments: movements.filter((movement) => movement.movement_type === 'adjustment').length,
  }), [movements]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Auditoría"
        title="Movimientos de stock"
        description="Trazabilidad persistente de entradas, salidas, ajustes, devoluciones y referencias operativas."
        icon={History}
        actions={
          <>
            <button type="button" onClick={() => void load()} disabled={loading} className={actionClass}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
            <Link href="/admin/inventario/scan" className={actionClass}><ScanLine className="h-4 w-4" /> Escanear</Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Movimientos" value={stats.total} icon={History} hint="Últimos registros" />
        <AdminStat label="Entradas" value={stats.inbound} icon={ArrowDownToLine} accent="emerald" hint="Unidades positivas" />
        <AdminStat label="Salidas" value={stats.outbound} icon={ArrowUpFromLine} accent="rose" hint="Unidades descontadas" />
        <AdminStat label="Ajustes" value={stats.adjustments} icon={SlidersHorizontal} accent="yellow" hint="Correcciones manuales" />
      </section>

      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <AdminCard className="p-0 sm:p-0">
        {loading ? (
          <div className="px-5 py-14 text-sm text-[#817a6f]">Cargando movimientos…</div>
        ) : movements.length === 0 ? (
          <div className="px-5 py-14 text-sm text-[#817a6f]">Aún no hay movimientos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-black/8 bg-black/[0.025] text-left text-[10px] font-black uppercase tracking-[.16em] text-[#817a6f]"><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3 text-right">Cantidad</th><th className="px-5 py-3 text-right">Antes</th><th className="px-5 py-3 text-right">Después</th><th className="px-5 py-3">Código / referencia</th><th className="px-5 py-3">Actor</th></tr></thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-black/6 last:border-0">
                    <td className="px-5 py-4 text-[#716b60]">{new Date(movement.created_at).toLocaleString('es-CL')}</td>
                    <td className="px-5 py-4 font-black text-[#171612]">{names.get(movement.product_id) || movement.product_id.slice(0, 8)}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-[#5f594f]">{movement.movement_type === 'in' ? <ArrowDownToLine className="h-3.5 w-3.5" /> : movement.movement_type === 'out' ? <ArrowUpFromLine className="h-3.5 w-3.5" /> : movement.movement_type === 'return' ? <RotateCcw className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}{LABELS[movement.movement_type]}</span></td>
                    <td className={`px-5 py-4 text-right font-black ${movement.quantity > 0 ? 'text-emerald-700' : movement.quantity < 0 ? 'text-rose-700' : 'text-[#171612]'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td>
                    <td className="px-5 py-4 text-right text-[#716b60]">{movement.stock_before}</td>
                    <td className="px-5 py-4 text-right font-black text-[#171612]">{movement.stock_after}</td>
                    <td className="px-5 py-4 text-xs text-[#716b60]">{movement.barcode || movement.reference_id || '—'}</td>
                    <td className="px-5 py-4 text-xs text-[#716b60]">{movement.actor_id || 'admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}
