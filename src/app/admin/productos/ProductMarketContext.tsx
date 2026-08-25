'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type MarketIntel = Record<string, unknown>;

type MonitoredProduct = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number | null;
  stock: number | null;
  active: boolean;
  imageUrl: string | null;
  source: string | null;
  sourceUrl: string | null;
  sourceId: string | null;
  createdAt: string | null;
  marketIntel: MarketIntel;
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(numberValue(value)));
}

function formatDate(value: unknown) {
  if (!value) return 'Sin actualización';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Sin actualización';
  return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ProductMarketContext() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studioId = searchParams.get('studio')?.trim() || '';
  const validStudio = studioId && studioId !== 'new';
  const [product, setProduct] = useState<MonitoredProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!validStudio) {
      setProduct(null);
      setError('');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/admin/market-intel/monitor', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: MonitoredProduct[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el contexto de mercado.');
      const match = (Array.isArray(json.products) ? json.products : []).find((item) => item.id === studioId) || null;
      setProduct(match);
      setError('');
    } catch (loadError) {
      setProduct(null);
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el contexto de mercado.');
    } finally {
      setLoading(false);
    }
  }, [studioId, validStudio]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    if (!product) return null;
    const intel = product.marketIntel;
    return {
      median: numberValue(intel.market_median),
      previousMedian: numberValue(intel.previous_market_median),
      netProfit: nullableNumber(intel.current_estimated_net_profit),
      netMargin: nullableNumber(intel.current_estimated_net_margin_percentage),
      gap: nullableNumber(intel.current_gap_to_market_median_percentage),
      trend: String(intel.market_trend || 'unknown'),
      refs: numberValue(intel.market_refs_count),
      refreshedAt: intel.market_refreshed_at || intel.last_reviewed_at || intel.captured_at,
    };
  }, [product]);

  async function refreshMarket() {
    if (!product || refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/admin/market-intel/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      });
      const json = await response.json().catch(() => ({})) as { product?: MonitoredProduct; error?: string };
      if (!response.ok || !json.product) throw new Error(json.error || 'No se pudo actualizar la referencia de mercado.');
      setProduct(json.product);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar la referencia de mercado.');
    } finally {
      setRefreshing(false);
    }
  }

  if (!validStudio || (!loading && !product && !error)) return null;

  const trend = metrics?.trend || 'unknown';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;

  return (
    <aside className="fixed bottom-[76px] right-3 z-[190] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-black/10 bg-[#fffaf0]/98 text-[#111214] shadow-[0_22px_70px_rgba(0,0,0,.28)] backdrop-blur-xl sm:bottom-20 sm:right-5">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-12 w-full items-center gap-3 bg-[#111214] px-4 text-left text-white"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/8 text-[#f5c75d]"><Target className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[.16em] text-white/35">Product Studio · Mercado</span><span className="block truncate text-xs font-black">{product?.name || 'Cargando referencia…'}</span></span>
        {expanded ? <ChevronDown className="h-4 w-4 text-white/45" /> : <ChevronUp className="h-4 w-4 text-white/45" />}
      </button>

      {expanded ? (
        <div className="p-3.5">
          {loading ? <div className="flex min-h-20 items-center justify-center gap-2 text-xs font-bold text-black/40"><Loader2 className="h-4 w-4 animate-spin" />Cargando referencia…</div> : null}
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{error}</div> : null}
          {product && metrics ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-black/30">Referencia actual</p><p className="mt-1 text-xl font-black">{metrics.median > 0 ? money(metrics.median) : 'Sin mediana'}</p><p className="mt-0.5 text-[10px] text-black/35">{metrics.refs ? `${metrics.refs} referencias · ` : ''}{formatDate(metrics.refreshedAt)}</p></div>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${trend === 'up' ? 'bg-emerald-100 text-emerald-800' : trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-black/[0.05] text-black/45'}`}><TrendIcon className="h-4 w-4" /></span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white p-2.5 shadow-sm"><span className="text-[8px] font-black uppercase tracking-[.1em] text-black/30">Precio</span><b className="mt-1 block truncate text-xs">{money(product.price)}</b></div>
                <div className={`rounded-xl p-2.5 shadow-sm ${metrics.netProfit != null && metrics.netProfit < 0 ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}><span className="text-[8px] font-black uppercase tracking-[.1em] opacity-45">Utilidad</span><b className="mt-1 block truncate text-xs">{metrics.netProfit == null ? '—' : money(metrics.netProfit)}</b></div>
                <div className="rounded-xl bg-white p-2.5 shadow-sm"><span className="text-[8px] font-black uppercase tracking-[.1em] text-black/30">Margen neto</span><b className="mt-1 block text-xs">{metrics.netMargin == null ? '—' : `${metrics.netMargin.toFixed(1)}%`}</b></div>
              </div>

              <div className="mt-3 rounded-xl border border-black/7 bg-[#f7efdc] px-3 py-2.5 text-[10px] leading-5 text-black/45">
                {metrics.gap == null ? 'No hay mediana suficiente para comparar.' : `Tu precio está ${Math.abs(metrics.gap).toFixed(1)}% ${metrics.gap > 0 ? 'sobre' : 'bajo'} la mediana.`}
                {metrics.previousMedian > 0 && metrics.previousMedian !== metrics.median ? ` Mediana anterior: ${money(metrics.previousMedian)}.` : ''}
              </div>

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void refreshMarket()} disabled={refreshing} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f5c75d] px-3 text-xs font-black text-[#111214] disabled:opacity-50">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{refreshing ? 'Actualizando…' : 'Actualizar mercado'}</button>
                <button type="button" onClick={() => router.push('/admin/inteligencia-mercado/monitoreo')} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/8 bg-white text-black/50" aria-label="Abrir monitoreo"><ArrowRight className="h-4 w-4" /></button>
              </div>

              <p className="mt-3 flex items-start gap-2 text-[9px] leading-4 text-black/35"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />Actualizar consulta el mercado y guarda únicamente la referencia analítica. No modifica precio, stock ni publicación.</p>
            </>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
