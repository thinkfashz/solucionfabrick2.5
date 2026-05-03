'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivitySquare,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TestTube2,
  Wallet,
  XCircle,
} from 'lucide-react';
import LatencyBar from '@/components/checkout/LatencyBar';

type MpMode = 'production' | 'sandbox' | 'unknown';
type MpStatus = 'ok' | 'unconfigured' | 'unreachable' | 'invalid_token';

interface AdminMpStatus {
  status: MpStatus;
  publicKey: string;
  hasAccessToken: boolean;
  reachable: boolean;
  latencyMs: number | null;
  message: string;
  mode: MpMode;
  tokenPrefix: string;
  verifiedMode: MpMode;
  account: {
    id: string | number | null;
    email: string | null;
    nickname: string | null;
    siteId: string | null;
    isTestUser: boolean;
  } | null;
  kpis: {
    approved: number;
    pending: number;
    rejected: number;
    volume: number;
    sinceIso: string;
    currency: string;
  };
  recentOrders: Array<{
    id: string;
    total: number | string | null;
    status: string | null;
    payment_status: string | null;
    payment_id: string | null;
    cliente_email: string | null;
    created_at: string | null;
  }>;
}

const MP_DEV_PANEL = 'https://www.mercadopago.cl/developers/panel/app';
const MP_ACTIVITIES = 'https://www.mercadopago.cl/activities';
const MAX_LATENCY_HISTORY = 20;

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function maskKey(key: string) {
  if (!key) return '—';
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

function ModeBadge({ mode, hasToken }: { mode: MpMode; hasToken: boolean }) {
  if (!hasToken) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/40">
        <XCircle className="h-3.5 w-3.5" /> No configurado
      </span>
    );
  }
  if (mode === 'production') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40">
        <ShieldCheck className="h-3.5 w-3.5" /> Producción
      </span>
    );
  }
  if (mode === 'sandbox') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
        <TestTube2 className="h-3.5 w-3.5" /> Demo / Sandbox
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-300 ring-1 ring-zinc-400/40">
      <ShieldAlert className="h-3.5 w-3.5" /> Modo desconocido
    </span>
  );
}

export default function MercadoPagoPanelClient() {
  const [data, setData] = useState<AdminMpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/payments/mp-status', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const json = (await res.json().catch(() => null)) as AdminMpStatus | { error?: string } | null;
      if (!res.ok) {
        throw new Error((json as { error?: string } | null)?.error || `HTTP ${res.status}`);
      }
      const next = json as AdminMpStatus;
      setData(next);
      if (typeof next.latencyMs === 'number' && next.latencyMs >= 0) {
        setLatencyHistory((prev) => {
          const copy = [...prev, next.latencyMs as number];
          return copy.length > MAX_LATENCY_HISTORY ? copy.slice(-MAX_LATENCY_HISTORY) : copy;
        });
      }
    } catch (e) {
      setError((e as Error).message || 'No se pudo cargar el estado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => void fetchOnce(), 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchOnce]);

  const stats = useMemo(() => {
    if (latencyHistory.length === 0) return { p50: null, p95: null, peak: null };
    const sorted = [...latencyHistory].sort((a, b) => a - b);
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    return { p50: at(0.5), p95: at(0.95), peak: sorted[sorted.length - 1] };
  }, [latencyHistory]);

  const verifiedMode = data?.verifiedMode ?? 'unknown';
  const isDemo = verifiedMode === 'sandbox';
  const isProd = verifiedMode === 'production';

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pagos · MercadoPago</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Estado en vivo de la pasarela, modo de operación verificado (producción /
            demo) y latencia real de la API. Verifica aquí si el ambiente está cobrando
            de verdad o si solo está simulando.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 accent-yellow-400"
            />
            Auto-refresh 10 s
          </label>
          <button
            type="button"
            onClick={() => void fetchOnce()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_2px_10px_rgba(250,204,21,0.45)] transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
          <a
            href={MP_DEV_PANEL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-yellow-400/50 hover:bg-yellow-400/10"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir panel de Mercado Pago
          </a>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Mode + Account */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-yellow-400/10 p-2 ring-1 ring-yellow-400/30">
                <Wallet className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Estado de la pasarela</h2>
                <p className="text-xs text-zinc-400">
                  {data?.message ?? 'Cargando estado…'}
                </p>
              </div>
            </div>
            <ModeBadge mode={verifiedMode} hasToken={!!data?.hasAccessToken} />
          </div>

          {isDemo && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Estás operando en modo <strong>DEMO</strong>: ningún cobro es real.
                Para producción, reemplaza el access token por uno con prefijo{' '}
                <code className="rounded bg-black/40 px-1">APP_USR-</code> en Vercel
                → Environment Variables.
              </span>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Public Key</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-200">
                {maskKey(data?.publicKey ?? '')}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Access Token</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-200">
                {data?.tokenPrefix ? `${data.tokenPrefix}-…` : '—'}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Cuenta MP</dt>
              <dd className="mt-1 truncate text-xs text-zinc-200">
                {data?.account?.email ?? data?.account?.nickname ?? '—'}
                {data?.account?.id ? (
                  <span className="ml-2 text-zinc-500">#{String(data.account.id)}</span>
                ) : null}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Sitio MP</dt>
              <dd className="mt-1 text-xs text-zinc-200">
                {data?.account?.siteId ?? '—'}
                {data?.account?.isTestUser ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    test_user
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>

        {/* Latency live */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-5 w-5 text-yellow-400" />
            <h2 className="text-base font-semibold text-white">Latencia API MP</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Tiempo real de respuesta de <code>api.mercadopago.com</code>.
          </p>
          <div className="mt-3">
            <LatencyBar
              history={latencyHistory}
              currentMs={data?.latencyMs ?? null}
              status={data?.status ?? 'unconfigured'}
              mode={verifiedMode}
            />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/5 p-2">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">p50</dt>
              <dd className="text-zinc-100">{stats.p50 != null ? `${stats.p50} ms` : '—'}</dd>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">p95</dt>
              <dd className="text-zinc-100">{stats.p95 != null ? `${stats.p95} ms` : '—'}</dd>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">peor</dt>
              <dd className="text-zinc-100">{stats.peak != null ? `${stats.peak} ms` : '—'}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Aprobados (7d)',
            value: data?.kpis.approved ?? 0,
            icon: CheckCircle2,
            tint: 'text-emerald-300',
          },
          {
            label: 'Pendientes (7d)',
            value: data?.kpis.pending ?? 0,
            icon: Loader2,
            tint: 'text-amber-300',
          },
          {
            label: 'Rechazados (7d)',
            value: data?.kpis.rejected ?? 0,
            icon: XCircle,
            tint: 'text-rose-300',
          },
          {
            label: 'Volumen aprobado',
            value: formatCLP(Number(data?.kpis.volume ?? 0)),
            icon: Wallet,
            tint: 'text-yellow-300',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.tint}`} />
              {kpi.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{kpi.value}</div>
          </div>
        ))}
      </section>

      {/* Recent orders */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Últimas órdenes</h2>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            últimos 7 días
          </span>
        </header>
        {data && data.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Estado MP</th>
                  <th className="px-2 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => {
                  const ps = (o.payment_status ?? '').toLowerCase();
                  const tint =
                    ps === 'approved'
                      ? 'text-emerald-300'
                      : ps === 'rejected' || ps === 'cancelled' || ps === 'refunded'
                        ? 'text-rose-300'
                        : 'text-amber-300';
                  return (
                    <tr key={o.id} className="border-t border-white/5">
                      <td className="px-2 py-2 text-zinc-300">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleString('es-CL')
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-zinc-300">{o.cliente_email ?? '—'}</td>
                      <td className="px-2 py-2 font-mono text-zinc-200">
                        {formatCLP(Number(o.total ?? 0))}
                      </td>
                      <td className={`px-2 py-2 font-semibold ${tint}`}>
                        {o.payment_status ?? o.status ?? '—'}
                      </td>
                      <td className="px-2 py-2">
                        {o.payment_id ? (
                          <a
                            href={`${MP_ACTIVITIES}/?searchQuery=${encodeURIComponent(
                              o.payment_id,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-yellow-300 hover:border-yellow-400/50"
                          >
                            Ver en MP
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            {loading ? 'Cargando órdenes…' : 'Sin pagos en los últimos 7 días.'}
          </p>
        )}
      </section>

      {/* Test payment shortcut */}
      {isDemo && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-amber-200">
                Probar pago (modo demo)
              </h2>
              <p className="mt-1 text-xs text-amber-200/70">
                Estás en sandbox: cualquier &quot;cobro&quot; aquí es simulado. Para
                un pago real necesitas un token <code>APP_USR-</code>.
              </p>
            </div>
            <a
              href="/checkout"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
            >
              <TestTube2 className="h-4 w-4" />
              Ir al checkout
            </a>
          </div>
        </section>
      )}

      {isProd && (
        <p className="text-center text-[11px] text-emerald-300/60">
          ✓ Modo producción: los cobros se procesan en la cuenta real de Mercado Pago.
        </p>
      )}
    </div>
  );
}
