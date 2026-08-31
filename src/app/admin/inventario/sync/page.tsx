'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Cloud, RefreshCw, RotateCw, XCircle } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type SyncEvent = {
  id: string;
  provider: string;
  external_event_id: string;
  event_type: string;
  direction: string;
  status: string;
  attempts: number;
  last_error?: string | null;
  created_at: string;
  applied_at?: string | null;
};

const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:opacity-50';

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    mercadolibre: 'Mercado Libre',
    mercado_libre: 'Mercado Libre',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    manual: 'Manual',
  };
  return labels[provider.toLowerCase()] || provider;
}

export default function InventorySyncPage() {
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/inventory/sync?limit=75', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar las sincronizaciones.');
      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sincronizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const applied = events.filter((event) => event.status === 'applied').length;
  const failed = events.filter((event) => event.status === 'error').length;
  const pending = events.filter((event) => !['applied', 'error'].includes(event.status)).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Integraciones"
        title="Sincronizaciones de stock"
        description="Registro central de eventos externos. Cada evento y cada línea tienen identidad propia para que un reintento no descuente ni sume existencias dos veces."
        icon={Cloud}
        actions={<><Link href="/admin/inventario" className={buttonClass}><ArrowLeft className="h-4 w-4" /> Inventario</Link><button type="button" className={buttonClass} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Eventos" value={loading ? '…' : events.length} icon={Cloud} hint="Últimos registros" />
        <AdminStat label="Aplicados" value={loading ? '…' : applied} icon={CheckCircle2} accent="cyan" hint="Stock conciliado" />
        <AdminStat label="Pendientes" value={loading ? '…' : pending} icon={RotateCw} accent="yellow" hint="Por procesar" />
        <AdminStat label="Con error" value={loading ? '…' : failed} icon={XCircle} accent="rose" hint="Requieren revisión" />
      </section>

      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <AdminCard className="p-0">
        <div className="border-b border-black/10 px-4 py-4 sm:px-5">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Ledger externo</p>
          <h2 className="mt-1 text-lg font-black text-[#171612]">Historial de integración</h2>
          <p className="mt-1 text-xs leading-5 text-[#817a6f]">Mercado Libre y futuros conectores pueden enviar eventos hacia la misma capa de inventario. El sistema enlaza el ID del producto externo con el producto local y registra el resultado.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#faf8f3] text-[10px] uppercase tracking-[.08em] text-[#817a6f]"><tr><th className="px-4 py-3">Sistema</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Intentos</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Detalle</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {!loading && events.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#aaa294]">Todavía no hay eventos de sincronización registrados.</td></tr> : events.map((event) => <tr key={event.id} className="bg-white/50">
                <td className="whitespace-nowrap px-4 py-3 font-black text-[#171612]">{providerLabel(event.provider)}</td>
                <td className="px-4 py-3"><strong className="block text-[#39352f]">{event.event_type}</strong><span className="block max-w-52 truncate text-[10px] text-[#aaa294]">{event.external_event_id}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${event.status === 'applied' ? 'bg-emerald-500/10 text-emerald-800' : event.status === 'error' ? 'bg-rose-500/10 text-rose-800' : 'bg-amber-500/10 text-amber-800'}`}>{event.status}</span></td>
                <td className="px-4 py-3 font-bold text-[#5f594f]">{event.attempts}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#817a6f]">{new Date(event.created_at).toLocaleString('es-CL')}</td>
                <td className="max-w-80 px-4 py-3 text-[#817a6f]">{event.last_error || (event.applied_at ? `Aplicado ${new Date(event.applied_at).toLocaleString('es-CL')}` : 'Sin observaciones')}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="text-xs leading-5 text-[#817a6f]">
        <strong className="text-[#171612]">Diseñado para crecer:</strong> la API de sincronización acepta eventos por proveedor, ID externo y líneas de producto. En vez de permitir que cada plataforma escriba directamente en <code>products.stock</code>, todos los cambios pasan por el ledger atómico del inventario.
      </AdminCard>
    </AdminPage>
  );
}
