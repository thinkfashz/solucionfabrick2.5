'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';

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
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(numberValue(value)));
}

function pct(value: unknown) {
  const parsed = nullableNumber(value);
  if (parsed == null) return '—';
  return `${parsed > 0 ? '+' : ''}${parsed.toFixed(1)}%`;
}

function dateValue(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function lastRefresh(product: MonitoredProduct) {
  return dateValue(product.marketIntel.market_refreshed_at)
    || dateValue(product.marketIntel.last_reviewed_at)
    || dateValue(product.marketIntel.captured_at);
}

function ageLabel(product: MonitoredProduct) {
  const date = lastRefresh(product);
  if (!date) return 'Sin actualización';
  const hours = Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return 'Actualizado hace menos de 1 h';
  if (hours < 24) return `Actualizado hace ${Math.floor(hours)} h`;
  const days = Math.floor(hours / 24);
  return `Actualizado hace ${days} día${days === 1 ? '' : 's'}`;
}

function isStale(product: MonitoredProduct) {
  const date = lastRefresh(product);
  if (!date) return true;
  return Date.now() - date.getTime() > 24 * 60 * 60 * 1000;
}

function trendIcon(trend: unknown) {
  if (trend === 'up') return TrendingUp;
  if (trend === 'down') return TrendingDown;
  return Activity;
}

function Metric({ label, value, note, icon: Icon, dark = false }: { label: string; value: string; note: string; icon: typeof Package; dark?: boolean }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${dark ? 'border-black bg-[#111214] text-white' : 'border-black/7 bg-[#fffaf0] text-[#111214]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[9px] font-black uppercase tracking-[.16em] ${dark ? 'text-white/35' : 'text-black/35'}`}>{label}</span>
        <Icon className={`h-4 w-4 ${dark ? 'text-[#f5c75d]' : 'text-black/30'}`} />
      </div>
      <p className="mt-3 truncate text-2xl font-black tracking-[-.045em]">{value}</p>
      <p className={`mt-1 text-[11px] ${dark ? 'text-white/40' : 'text-black/40'}`}>{note}</p>
    </article>
  );
}

export default function MarketMonitoringPage() {
  const router = useRouter();
  const [products, setProducts] = useState<MonitoredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/market-intel/monitor', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: MonitoredProduct[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el monitoreo.');
      setProducts(Array.isArray(json.products) ? json.products : []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el monitoreo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const clean = filter.trim().toLowerCase();
    if (!clean) return products;
    return products.filter((product) => {
      const query = String(product.marketIntel.query || '').toLowerCase();
      return product.name.toLowerCase().includes(clean) || query.includes(clean) || String(product.source || '').toLowerCase().includes(clean);
    });
  }, [filter, products]);

  const staleCount = useMemo(() => products.filter(isStale).length, [products]);
  const positiveMarginCount = useMemo(() => products.filter((product) => numberValue(product.marketIntel.current_estimated_net_profit) > 0).length, [products]);
  const aboveMarketCount = useMemo(() => products.filter((product) => numberValue(product.marketIntel.current_gap_to_market_median_percentage) > 10).length, [products]);

  async function refreshProduct(id: string, silent = false) {
    setBusyIds((current) => Array.from(new Set([...current, id])));
    if (!silent) {
      setError('');
      setNotice('Actualizando referencias de mercado. El precio de venta no se modificará.');
    }
    try {
      const response = await fetch('/api/admin/market-intel/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await response.json().catch(() => ({})) as { product?: MonitoredProduct; error?: string; priceChanged?: boolean };
      if (!response.ok || !json.product) throw new Error(json.error || 'No se pudo actualizar el producto.');
      setProducts((current) => current.map((product) => product.id === id ? json.product! : product));
      if (!silent) setNotice(`Mercado actualizado para “${json.product.name}”. El precio de venta se mantuvo intacto.`);
      return true;
    } catch (refreshError) {
      if (!silent) setError(refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar el mercado.');
      return false;
    } finally {
      setBusyIds((current) => current.filter((item) => item !== id));
    }
  }

  async function refreshVisible() {
    const targets = visibleProducts.slice(0, 12);
    if (!targets.length) return;
    setRefreshingAll(true);
    setError('');
    setNotice(`Actualizando ${targets.length} producto${targets.length === 1 ? '' : 's'} sin cambiar precios…`);
    let updated = 0;
    for (let index = 0; index < targets.length; index += 2) {
      const batch = targets.slice(index, index + 2);
      const results = await Promise.all(batch.map((product) => refreshProduct(product.id, true)));
      updated += results.filter(Boolean).length;
    }
    setRefreshingAll(false);
    setNotice(`${updated}/${targets.length} productos actualizados. Se refrescaron referencias y márgenes; ningún precio de venta fue modificado.${visibleProducts.length > 12 ? ' El lote se limita a 12 para cuidar las cuotas de búsqueda.' : ''}`);
  }

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="overflow-hidden rounded-[1.9rem] border border-black/7 bg-[#fffaf0] shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Monitoreo vivo</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-800"><ShieldCheck className="h-3 w-3" />Sin cambios automáticos de precio</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.065em] sm:text-5xl">Vigila el mercado después de importar.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/45">Cada producto proveniente del radar conserva su consulta original. Aquí puedes volver a consultar el mercado, guardar un nuevo snapshot y ver cómo cambia tu posición sin tocar precio, stock ni publicación.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void refreshVisible()} disabled={refreshingAll || loading || !visibleProducts.length} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white disabled:opacity-45">{refreshingAll ? <Loader2 className="h-4 w-4 animate-spin text-[#f5c75d]" /> : <RefreshCw className="h-4 w-4 text-[#f5c75d]" />}{refreshingAll ? 'Actualizando mercado…' : `Actualizar visibles${visibleProducts.length ? ` (${Math.min(visibleProducts.length, 12)})` : ''}`}</button>
            <button type="button" onClick={() => router.push('/admin/inteligencia-mercado/oportunidades')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-xs font-black text-black/55"><Target className="h-4 w-4" />Bandeja</button>
            <button type="button" onClick={() => router.push('/admin/productos')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f]"><Package className="h-4 w-4" />Productos</button>
          </div>
        </div>
      </section>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Monitoreados" value={String(products.length)} note="Productos con market_intel" icon={BarChart3} />
        <Metric label="Revisar" value={String(staleCount)} note="Referencia >24 h o pendiente" icon={Clock3} />
        <Metric label="Utilidad positiva" value={`${positiveMarginCount}/${products.length || 0}`} note="Según costo y reserva actuales" icon={TrendingUp} />
        <Metric label=">10% sobre mediana" value={String(aboveMarketCount)} note="Posible revisión de precio" icon={Target} dark />
      </section>

      <section className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-black">Productos conectados al radar</p><p className="mt-1 text-[11px] text-black/40">La actualización escribe solo contexto de mercado dentro de specifications.market_intel.</p></div>
          <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar producto, consulta o fuente" className="min-h-11 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#d18b16]" /></div>
        </div>
      </section>

      {loading ? (
        <section className="grid min-h-64 place-items-center rounded-2xl border border-black/7 bg-[#fffaf0]"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#b7750c]" /><p className="mt-3 text-sm font-black">Cargando monitoreo…</p></div></section>
      ) : !visibleProducts.length ? (
        <section className="rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] p-10 text-center"><BarChart3 className="mx-auto h-9 w-9 text-black/20" /><h2 className="mt-4 text-lg font-black">{products.length ? 'No hay coincidencias' : 'Todavía no hay productos monitoreados'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/40">{products.length ? 'Prueba otro término de búsqueda.' : 'Exporta candidatos desde el Radar o la Bandeja. Al quedar guardados en Productos con market_intel aparecerán aquí automáticamente.'}</p>{!products.length ? <button type="button" onClick={() => router.push('/admin/inteligencia-mercado')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white">Abrir Radar<ArrowRight className="h-4 w-4 text-[#f5c75d]" /></button> : null}</section>
      ) : (
        <section className="grid gap-3 xl:grid-cols-2">
          {visibleProducts.map((product) => {
            const intel = product.marketIntel;
            const median = numberValue(intel.market_median);
            const previousMedian = numberValue(intel.previous_market_median);
            const gap = nullableNumber(intel.current_gap_to_market_median_percentage);
            const netProfit = nullableNumber(intel.current_estimated_net_profit);
            const netMargin = nullableNumber(intel.current_estimated_net_margin_percentage);
            const delta = nullableNumber(intel.market_delta_percentage);
            const trend = String(intel.market_trend || 'unknown');
            const TrendIcon = trendIcon(trend);
            const busy = busyIds.includes(product.id);
            const stale = isStale(product);
            const query = String(intel.query || product.name);
            const refs = numberValue(intel.market_refs_count);
            return (
              <article key={product.id} className={`overflow-hidden rounded-2xl border bg-[#fffaf0] shadow-sm ${stale ? 'border-amber-200' : 'border-black/7'}`}>
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4">
                  <div className="relative h-28 overflow-hidden rounded-xl bg-[#f1e8d8] sm:h-32">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-1" /> : <Package className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-black/20" />}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${stale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{stale ? 'Revisar' : 'Al día'}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${product.active ? 'bg-blue-100 text-blue-800' : 'bg-black/[0.06] text-black/45'}`}>{product.active ? 'Activo' : 'Borrador/oculto'}</span></div><h2 className="mt-2 line-clamp-2 text-sm font-black leading-5">{product.name}</h2><p className="mt-1 line-clamp-1 text-[11px] text-black/40">Radar: {query}</p></div>{product.sourceUrl ? <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/8 bg-white text-black/35 hover:text-black" aria-label="Abrir fuente"><ExternalLink className="h-4 w-4" /></a> : null}</div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-black/35"><Clock3 className="h-3.5 w-3.5" />{ageLabel(product)}{refs > 0 ? ` · ${refs} refs` : ''}</div>
                  </div>
                </div>

                <div className="border-t border-black/7 bg-[#f8f1e5] p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-white p-2.5"><span className="text-[8px] font-black uppercase tracking-[.1em] text-black/30">Precio actual</span><b className="mt-1 block text-sm">{money(product.price)}</b></div>
                    <div className="rounded-xl bg-[#111214] p-2.5 text-white"><span className="text-[8px] font-black uppercase tracking-[.1em] text-white/35">Mediana mercado</span><b className="mt-1 block text-sm text-[#f5c75d]">{median ? money(median) : '—'}</b>{previousMedian > 0 && previousMedian !== median ? <small className="text-[9px] text-white/30">antes {money(previousMedian)}</small> : null}</div>
                    <div className={`rounded-xl p-2.5 ${gap != null && gap > 10 ? 'bg-amber-50 text-amber-900' : 'bg-white'}`}><span className="text-[8px] font-black uppercase tracking-[.1em] opacity-40">Vs. mediana</span><b className="mt-1 block text-sm">{gap == null ? '—' : `${gap > 0 ? '+' : ''}${gap.toFixed(1)}%`}</b><small className="text-[9px] opacity-45">precio sin modificar</small></div>
                    <div className={`rounded-xl p-2.5 ${netProfit != null && netProfit >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}><span className="text-[8px] font-black uppercase tracking-[.1em] opacity-45">Utilidad estimada</span><b className="mt-1 block text-sm">{netProfit == null ? '—' : money(netProfit)}</b><small className="text-[9px] opacity-50">{netMargin == null ? 'sin margen' : `${netMargin.toFixed(1)}% neto`}</small></div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 rounded-xl border border-black/7 bg-white/65 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${trend === 'up' ? 'bg-emerald-100 text-emerald-800' : trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-black/[0.05] text-black/45'}`}><TrendIcon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-black">Movimiento del mercado {delta == null ? 'sin comparación previa' : pct(delta)}</p><p className="mt-0.5 text-[10px] text-black/40">{String(intel.market_sources || '').replace(/,/g, ' · ') || String(intel.source_label || product.source || 'Mercado')} · costo {product.supplierPrice != null ? money(product.supplierPrice) : 'pendiente'}</p></div></div>
                    <div className="flex shrink-0 gap-2"><button type="button" onClick={() => void refreshProduct(product.id)} disabled={busy || refreshingAll} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f] disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Actualizar</button><button type="button" onClick={() => router.push(`/admin/productos?studio=${encodeURIComponent(product.id)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111214] px-3 text-xs font-black text-white">Product Studio<ArrowRight className="h-4 w-4 text-[#f5c75d]" /></button></div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-black/7 bg-[#111214] p-5 text-white shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/7 text-[#f5c75d]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-black">Política de actualización segura</p><p className="mt-1 max-w-4xl text-xs leading-5 text-white/45">Actualizar mercado guarda un snapshot tenant-aware y reemplaza únicamente las referencias analíticas dentro de market_intel. El precio, stock, estado activo/destacado y contenido comercial del producto permanecen iguales hasta que tú los edites explícitamente en Product Studio.</p></div></div></section>
    </AdminPage>
  );
}
