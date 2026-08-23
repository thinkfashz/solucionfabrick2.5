'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Image as ImageIcon,
  Info,
  Loader2,
  Plug,
  RefreshCw,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat, VerticalBar, type BarStatus } from '@/components/admin/ui';

type Severity = 'ok' | 'warn' | 'error' | 'info';
type Group = 'db' | 'schema' | 'storage' | 'content' | 'env' | 'integrations' | 'payments';

interface Check {
  id: string;
  label: string;
  group: Group;
  severity: Severity;
  detail?: string;
  suggestion?: string;
  latencyMs?: number;
}

interface EstadoResponse {
  overall: Severity;
  counts: Record<Severity, number>;
  checks: Check[];
  timestamp: string;
}

const GROUP_LABELS: Record<Group, { label: string; icon: typeof Database; href?: string }> = {
  db: { label: 'Base de datos', icon: Database },
  schema: { label: 'Esquema / migraciones', icon: ShieldAlert },
  storage: { label: 'Almacenamiento', icon: ImageIcon },
  content: { label: 'Calidad de contenido', icon: HardDrive },
  env: { label: 'Variables de entorno', icon: ShieldAlert },
  integrations: { label: 'Integraciones externas', icon: Plug },
  payments: { label: 'Pagos · MercadoPago', icon: Wallet, href: '/admin/pagos' },
};

const SEV_STYLES: Record<Severity, { badge: string; icon: string; Icon: typeof CheckCircle2; label: string }> = {
  ok: { badge: 'bg-emerald-500/10 text-emerald-800', icon: 'text-emerald-700', Icon: CheckCircle2, label: 'OK' },
  warn: { badge: 'bg-amber-500/10 text-amber-800', icon: 'text-amber-700', Icon: AlertTriangle, label: 'Aviso' },
  error: { badge: 'bg-rose-500/10 text-rose-800', icon: 'text-rose-700', Icon: XCircle, label: 'Error' },
  info: { badge: 'bg-zinc-500/10 text-zinc-700', icon: 'text-zinc-600', Icon: Info, label: 'Info' },
};

function worstSeverity(items: Check[]): Severity {
  if (items.some((item) => item.severity === 'error')) return 'error';
  if (items.some((item) => item.severity === 'warn')) return 'warn';
  if (items.some((item) => item.severity === 'ok')) return 'ok';
  return 'info';
}

export default function EstadoClient() {
  const [data, setData] = useState<EstadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/estado', { cache: 'no-store' });
      const json = (await res.json()) as EstadoResponse | { error?: string };
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setData(json as EstadoResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el estado del sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void fetchOnce(), 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, fetchOnce]);

  const grouped = useMemo(() => {
    const by: Record<Group, Check[]> = {
      db: [], schema: [], storage: [], content: [], env: [], integrations: [], payments: [],
    };
    for (const check of data?.checks ?? []) by[check.group].push(check);
    return by;
  }, [data]);

  const counts = data?.counts ?? { ok: 0, warn: 0, error: 0, info: 0 };
  const overall = data?.overall ?? 'info';
  const OverallIcon = SEV_STYLES[overall].Icon;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Observabilidad"
        title="Estado del sistema"
        description="Supervisa base de datos, esquema, almacenamiento, variables, integraciones, pagos y contenido desde una sola vista."
        icon={ShieldAlert}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-semibold text-[#716b60]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#c77a00]"
              />
              Auto 30 s
            </label>
            <button
              type="button"
              onClick={() => void fetchOnce()}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Re-evaluar
            </button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Correctos" value={counts.ok} icon={CheckCircle2} accent="emerald" />
        <AdminStat label="Avisos" value={counts.warn} icon={AlertTriangle} />
        <AdminStat label="Errores" value={counts.error} icon={XCircle} accent="rose" />
        <AdminStat label="Informativos" value={counts.info} icon={Info} accent="cyan" />
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${SEV_STYLES[overall].badge}`}>
              <OverallIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a9286]">Estado general</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">{SEV_STYLES[overall].label}</h2>
              <p className="mt-1 text-sm text-[#716b60]">
                {data?.timestamp ? `Actualizado ${new Date(data.timestamp).toLocaleString('es-CL')}` : loading ? 'Consultando servicios…' : 'Sin lectura disponible'}
              </p>
            </div>
          </div>
          <span className={`self-start rounded-full px-3 py-1.5 text-xs font-black ${SEV_STYLES[overall].badge}`}>
            {counts.error ? `${counts.error} error(es)` : counts.warn ? `${counts.warn} aviso(s)` : 'Operativo'}
          </span>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-2 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-.025em] text-[#171612]">Pulso de servicios</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">La altura resume salud; el color indica el peor estado detectado en cada grupo.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a9286]">Actualización automática opcional</span>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(72px,1fr))] sm:overflow-visible">
          {(Object.keys(GROUP_LABELS) as Group[]).map((group) => {
            const items = grouped[group];
            const ok = items.filter((check) => check.severity === 'ok').length;
            const warn = items.filter((check) => check.severity === 'warn').length;
            const err = items.filter((check) => check.severity === 'error').length;
            const total = items.length || 1;
            const value = Math.round(((ok + warn * 0.5) / total) * 100);
            const status: BarStatus = items.length === 0 ? 'idle' : err > 0 ? 'error' : warn > 0 ? 'warn' : 'ok';
            const latencies = items.filter((check) => typeof check.latencyMs === 'number');
            const avgLatency = latencies.length
              ? Math.round(latencies.reduce((sum, check) => sum + (check.latencyMs ?? 0), 0) / latencies.length)
              : null;
            return (
              <div key={group} className="snap-start flex-shrink-0">
                <VerticalBar
                  value={value}
                  status={status}
                  label={group.toUpperCase()}
                  sublabel={avgLatency !== null ? `${avgLatency} ms` : `${ok}/${items.length}`}
                  height={132}
                />
              </div>
            );
          })}
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {(Object.keys(GROUP_LABELS) as Group[]).map((group) => {
          const items = grouped[group];
          if (!items.length) return null;
          const meta = GROUP_LABELS[group];
          const status = worstSeverity(items);
          const StatusIcon = SEV_STYLES[status].Icon;
          const GroupIcon = meta.icon;

          return (
            <AdminCard key={group} className="p-0 sm:p-0">
              <div className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]">
                    <GroupIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-[#171612]">{meta.label}</h2>
                    <p className="mt-0.5 text-[10px] text-[#9a9286]">{items.length} comprobación{items.length === 1 ? '' : 'es'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {meta.href ? <a href={meta.href} className="text-[10px] font-black text-[#9b6a12] hover:underline">Ver detalle</a> : null}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${SEV_STYLES[status].badge}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {SEV_STYLES[status].label}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-black/8 px-4 sm:px-5">
                {items.map((check) => {
                  const style = SEV_STYLES[check.severity];
                  const ItemIcon = style.Icon;
                  return (
                    <div key={check.id} className="flex gap-3 py-3.5">
                      <ItemIcon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <strong className="text-sm text-[#27241f]">{check.label}</strong>
                          {typeof check.latencyMs === 'number' ? <span className="text-[10px] font-semibold text-[#9a9286]">{check.latencyMs} ms</span> : null}
                        </div>
                        {check.detail ? <p className="mt-1 text-xs leading-5 text-[#716b60]">{check.detail}</p> : null}
                        {check.suggestion ? <p className="mt-1.5 text-xs font-medium leading-5 text-[#8a620f]">Sugerencia: {check.suggestion}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          );
        })}
      </div>

      {!data && !loading && !error ? (
        <div className="border-y border-black/8 py-12 text-center text-sm text-[#817a6f]">Sin datos disponibles todavía.</div>
      ) : null}
    </AdminPage>
  );
}
