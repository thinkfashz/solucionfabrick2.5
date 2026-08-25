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
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
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

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertKind = 'negative-margin' | 'above-market' | 'stale' | 'missing-cost' | 'market-move';
type AlertFilter = 'all' | AlertSeverity;

type MarketAlert = {
  id: string;
  productId: string;
  product: MonitoredProduct;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metric: string;
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

function staleHours(product: MonitoredProduct) {
  const date = lastRefresh(product);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
}

function createAlerts(product: MonitoredProduct): MarketAlert[] {
  const intel = product.marketIntel;
  const alerts: MarketAlert[] = [];
  const netProfit = nullableNumber(intel.current_estimated_net_profit);
  const netMargin = nullableNumber(intel.current_estimated_net_margin_percentage);
  const gap = nullableNumber(intel.current_gap_to_market_median_percentage);
  const delta = nullableNumber(intel.market_delta_percentage);
  const median = nullableNumber(intel.market_median);
  const hours = staleHours(product);

  if (netProfit != null && netProfit < 0) {
    alerts.push({
      id: `${product.id}:negative-margin`,
      productId: product.id,
      product,
      kind: 'negative-margin',
      severity: 'critical',
      title: 'Utilidad estimada negativa',
      detail: `El precio actual no cubre costo + reserva operativa. Margen neto estimado ${netMargin == null ? 'sin dato' : `${netMargin.toFixed(1)}%`}.`,
      metric: money(netProfit),
    });
  }

  if (gap != null && gap > 10) {
    alerts.push({
      id: `${product.id}:above-market`,
      productId: product.id,
      product,
      kind: 'above-market',
      severity: gap >= 25 ? 'critical' : 'warning',
      title: 'Precio sobre la mediana',
      detail: `El precio actual está ${gap.toFixed(1)}% sobre la mediana de mercado${median ? ` (${money(median)})` : ''}. Revisa posicionamiento antes de cambiarlo.`,
      metric: `+${gap.toFixed(1)}%`,
    });
  }

  if (!Number.isFinite(hours) || hours >= 24) {
    const days = Number.isFinite(hours) ? Math.floor(hours / 24) : null;
    alerts.push({
      id: `${product.id}:stale`,
      productId: product.id,
      product,
      kind: 'stale',
      severity: hours >= 72 || !Number.isFinite(hours) ? 'warning' : 'info',
      title: 'Referencia de mercado vencida',
      detail: days == null ? 'Este producto aún no tiene una actualización fechada.' : `La última referencia tiene ${days} día${days === 1 ? '' : 's'}. Actualízala antes de tomar una decisión comercial.`,
      metric: days == null ? 'Pendiente' : `${days} d`,
    });
  }

  if (product.supplierPrice == null || product.supplierPrice <= 0) {
    alerts.push({
      id: `${product.id}:missing-cost`,
      productId: product.id,
      product,
      kind: 'missing-cost',
      severity: 'warning',
      title: 'Costo proveedor pendiente',
      detail: 'Sin costo real no se puede confiar en la utilidad ni en el margen calculado. Completa el costo en Product Studio.',
      metric: 'Sin costo',
    });
  }

  if (delta != null && Math.abs(delta) >= 8) {
    alerts.push({
      id: `${product.id}:market-move`,
      productId: product.id,
      product,
      kind: 'market-move',
      severity: Math.abs(delta) >= 15 ? 'warning' : 'info',
      title: delta > 0 ? 'Mercado subiendo con fuerza' : 'Mercado bajando con fuerza',
      detail: `La referencia promedio se movió ${Math.abs(delta).toFixed(1)}% frente al snapshot anterior. El precio de tu producto no fue modificado.`,
      metric: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`,
    });
  }

  return alerts;
}

const severityStyle: Record<AlertSeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const severityLabel: Record<AlertSeverity, string> = {
  critical: 'Crítica',
  warning: 'Revisar',
  info: 'Informativa',
};

function AlertIcon({ kind }: { kind: AlertKind }) {
  if (kind === 'negative-margin') return <CircleDollarSign className="h-4 w-4" />;
  if (kind === 'above-market') return <TrendingUp className="h-4 w-4" />;
  if (kind === 'stale') return <Clock3 className="h-4 w-4" />;
  if (kind === 'missing-cost') return <Package className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export default function MarketAlertsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<MonitoredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/market-intel/monitor', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: MonitoredProduct[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar las alertas.');
      setProducts(Array.isArray(json.products) ? json.products : []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las alertas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const alerts = useMemo(() => products.flatMap(createAlerts), [products]);
  const counts = useMemo(() => ({
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
    warning: alerts.filter((alert) => alert.severity === 'warning').length,
    info: alerts.filter((alert) => alert.severity === 'info').length,
  }), [alerts]);

  const visible = useMemo(() => {
    const clean = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (filter !== 'all' && alert.severity !== filter) return false;
      if (!clean) return true;
      return alert.product.name.toLowerCase().includes(clean)
        || alert.title.toLowerCase().includes(clean)
        || String(alert.product.marketIntel.query || '').toLowerCase().includes(clean);
    });
  }, [alerts, filter, search]);

  async function refreshProduct(id: string) {
    setBusyIds((current) => Array.from(new Set([...current, id])));
    setError('');
    setNotice('Actualizando referencia. El precio de venta permanecerá intacto.');
    try {
      const response = await fetch('/api/admin/market-intel/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await response.json().catch(() => ({})) as { product?: MonitoredProduct; error?: string };
      if (!response.ok || !json.product) throw new Error(json.error || 'No se pudo actualizar el mercado.');
      setProducts((current) => current.map((product) => product.id === id ? json.product! : product));
      setNotice(`Referencia actualizada para “${json.product.name}”. Las alertas se recalcularon sin cambiar su precio.`);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar el mercado.');
    } finally {
      setBusyIds((current) => current.filter((item) => item !== id));
    }
  }

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="overflow-hidden rounded-[1.9rem] border border-black/7 bg-[#fffaf0] shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Alertas de mercado</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-800"><ShieldCheck className="h-3 w-3" />Solo recomendaciones</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.065em] sm:text-5xl">Detecta qué producto necesita atención.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/45">Las alertas se calculan sobre el contexto de mercado ya guardado en cada producto. Señalan riesgo o desactualización, pero nunca cambian precio, stock ni publicación por sí solas.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => router.push('/admin/inteligencia-mercado/monitoreo')} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white"><BarChart3 className="h-4 w-4 text-[#f5c75d]" />Abrir monitoreo<ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => router.push('/admin/inteligencia-mercado')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-xs font-black text-black/55">Radar</button>
            <button type="button" onClick={() => router.push('/admin/productos')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f]">Product Studio</button>
          </div>
        </div>
      </section>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <button type="button" onClick={() => setFilter('all')} className={`rounded-2xl border p-4 text-left shadow-sm ${filter === 'all' ? 'border-black bg-[#111214] text-white' : 'border-black/7 bg-[#fffaf0]'}`}><span className={`text-[9px] font-black uppercase tracking-[.16em] ${filter === 'all' ? 'text-white/35' : 'text-black/35'}`}>Todas</span><p className="mt-3 text-2xl font-black">{alerts.length}</p><p className={`mt-1 text-[11px] ${filter === 'all' ? 'text-white/40' : 'text-black/40'}`}>Señales detectadas</p></button>
        <button type="button" onClick={() => setFilter('critical')} className={`rounded-2xl border p-4 text-left shadow-sm ${filter === 'critical' ? 'border-red-300 bg-red-100 text-red-950' : 'border-red-100 bg-red-50 text-red-900'}`}><span className="text-[9px] font-black uppercase tracking-[.16em] opacity-45">Críticas</span><p className="mt-3 text-2xl font-black">{counts.critical}</p><p className="mt-1 text-[11px] opacity-50">Pérdida o gran desviación</p></button>
        <button type="button" onClick={() => setFilter('warning')} className={`rounded-2xl border p-4 text-left shadow-sm ${filter === 'warning' ? 'border-amber-300 bg-amber-100 text-amber-950' : 'border-amber-100 bg-amber-50 text-amber-900'}`}><span className="text-[9px] font-black uppercase tracking-[.16em] opacity-45">Revisar</span><p className="mt-3 text-2xl font-black">{counts.warning}</p><p className="mt-1 text-[11px] opacity-50">Requieren decisión humana</p></button>
        <button type="button" onClick={() => setFilter('info')} className={`rounded-2xl border p-4 text-left shadow-sm ${filter === 'info' ? 'border-blue-300 bg-blue-100 text-blue-950' : 'border-blue-100 bg-blue-50 text-blue-900'}`}><span className="text-[9px] font-black uppercase tracking-[.16em] opacity-45">Informativas</span><p className="mt-3 text-2xl font-black">{counts.info}</p><p className="mt-1 text-[11px] opacity-50">Cambios para observar</p></button>
      </section>

      <section className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-black">Centro de decisiones</p><p className="mt-1 text-[11px] text-black/40">Filtros calculados en tiempo real a partir de los productos monitoreados.</p></div>
          <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o alerta" className="min-h-11 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#d18b16]" /></div>
        </div>
      </section>

      {loading ? (
        <section className="grid min-h-64 place-items-center rounded-2xl border border-black/7 bg-[#fffaf0]"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#b7750c]" /><p className="mt-3 text-sm font-black">Calculando alertas…</p></div></section>
      ) : !visible.length ? (
        <section className="rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] p-10 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-emerald-600/50" /><h2 className="mt-4 text-lg font-black">{alerts.length ? 'No hay alertas con este filtro' : 'Sin alertas activas'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/40">{alerts.length ? 'Cambia el filtro o la búsqueda para revisar otras señales.' : 'Los productos monitoreados no presentan las condiciones de alerta configuradas en este momento.'}</p></section>
      ) : (
        <section className="space-y-3">
          {visible.map((alert) => {
            const busy = busyIds.includes(alert.productId);
            const TrendIcon = alert.kind === 'market-move' && numberValue(alert.product.marketIntel.market_delta_percentage) < 0 ? TrendingDown : TrendingUp;
            return (
              <article key={alert.id} className={`rounded-2xl border p-4 shadow-sm ${severityStyle[alert.severity]}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/70 shadow-sm">{alert.kind === 'market-move' ? <TrendIcon className="h-4 w-4" /> : <AlertIcon kind={alert.kind} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em]">{severityLabel[alert.severity]}</span><span className="text-[10px] font-bold opacity-50">{alert.product.active ? 'Activo' : 'Borrador/oculto'}</span></div>
                      <h2 className="mt-2 text-sm font-black">{alert.title}</h2>
                      <p className="mt-1 text-xs leading-5 opacity-65">{alert.detail}</p>
                      <p className="mt-2 truncate text-[11px] font-bold opacity-50">{alert.product.name}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
                    <span className="min-w-20 rounded-xl bg-white/70 px-3 py-2.5 text-center text-xs font-black shadow-sm">{alert.metric}</span>
                    {(alert.kind === 'stale' || alert.kind === 'market-move' || alert.kind === 'above-market') ? <button type="button" onClick={() => void refreshProduct(alert.productId)} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black shadow-sm disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refrescar</button> : null}
                    <button type="button" onClick={() => router.push(`/admin/productos?studio=${encodeURIComponent(alert.productId)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111214] px-3 text-xs font-black text-white">Revisar<ArrowRight className="h-4 w-4 text-[#f5c75d]" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-black/7 bg-[#111214] p-5 text-white shadow-sm">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/7 text-[#f5c75d]"><ShieldAlert className="h-4 w-4" /></span><div><p className="text-sm font-black">Umbrales actuales</p><p className="mt-1 max-w-4xl text-xs leading-5 text-white/45">Crítico: utilidad negativa o precio ≥25% sobre mediana. Revisar: costo faltante, referencia ≥72 h, precio >10% sobre mediana o movimiento de mercado ≥15%. Informativo: referencia ≥24 h o movimiento ≥8%. Son señales de decisión; ninguna ejecuta cambios comerciales automáticamente.</p></div></div>
      </section>
    </AdminPage>
  );
}
