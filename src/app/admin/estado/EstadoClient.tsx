'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  XCircle,
} from 'lucide-react';

type Severity = 'ok' | 'warn' | 'error' | 'info';
type Group = 'db' | 'schema' | 'storage' | 'content' | 'env' | 'integrations';

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

const GROUP_LABELS: Record<Group, { label: string; icon: typeof Database }> = {
  db: { label: 'Base de datos', icon: Database },
  schema: { label: 'Esquema / migraciones', icon: ShieldAlert },
  storage: { label: 'Almacenamiento (imágenes)', icon: ImageIcon },
  content: { label: 'Calidad de contenido', icon: HardDrive },
  env: { label: 'Variables de entorno', icon: ShieldAlert },
  integrations: { label: 'Integraciones externas', icon: Plug },
};

const SEV_STYLES: Record<
  Severity,
  { color: string; bg: string; ring: string; Icon: typeof CheckCircle2; label: string }
> = {
  ok: { color: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/30', Icon: CheckCircle2, label: 'OK' },
  warn: { color: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/30', Icon: AlertTriangle, label: 'Aviso' },
  error: { color: 'text-rose-300', bg: 'bg-rose-400/10', ring: 'ring-rose-400/30', Icon: XCircle, label: 'Error' },
  info: { color: 'text-zinc-300', bg: 'bg-white/5', ring: 'ring-white/10', Icon: Info, label: 'Info' },
};

export default function EstadoClient() {
  const [data, setData] = useState<EstadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/estado', { cache: 'no-store' });
      const json = (await res.json()) as EstadoResponse | { error?: string };
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setData(json as EstadoResponse);
      lastFetchRef.current = Date.now();
    } catch (e) {
      setError((e as Error).message || 'No se pudo cargar el diagnóstico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void fetchOnce(), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchOnce]);

  const grouped = useMemo(() => {
    const by: Record<Group, Check[]> = {
      db: [], schema: [], storage: [], content: [], env: [], integrations: [],
    };
    for (const c of data?.checks ?? []) by[c.group].push(c);
    return by;
  }, [data]);

  const counts = data?.counts ?? { ok: 0, warn: 0, error: 0, info: 0 };
  const overall = data?.overall ?? 'info';
  const overallStyle = SEV_STYLES[overall];
  const OverallIcon = overallStyle.Icon;

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Estado del sistema</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Análisis continuo del CMS, la base de datos, el almacenamiento, las variables de entorno y las
            integraciones externas. Cada chequeo incluye una sugerencia accionable cuando detecta un problema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 accent-yellow-400"
            />
            Auto-refresh 30 s
          </label>
          <button
            type="button"
            onClick={() => void fetchOnce()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_2px_10px_rgba(250,204,21,0.45)] transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Re-evaluar ahora
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section
        className={`flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 p-4 ring-1 ${overallStyle.ring} ${overallStyle.bg}`}
      >
        <OverallIcon className={`h-6 w-6 ${overallStyle.color}`} />
        <div className="flex-1">
          <div className={`text-sm font-semibold uppercase tracking-wide ${overallStyle.color}`}>
            Estado general · {overallStyle.label}
          </div>
          <div className="mt-0.5 text-xs text-zinc-300">
            {counts.ok} OK · {counts.warn} avisos · {counts.error} errores · {counts.info} info
            {data?.timestamp && ` · actualizado ${new Date(data.timestamp).toLocaleTimeString()}`}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(Object.keys(GROUP_LABELS) as Group[]).map((g) => {
          const items = grouped[g];
          if (!items || items.length === 0) return null;
          const { label, icon: Icon } = GROUP_LABELS[g];
          const worst = items.reduce<Severity>((acc, c) => {
            if (c.severity === 'error') return 'error';
            if (c.severity === 'warn' && acc !== 'error') return 'warn';
            if (c.severity === 'ok' && acc === 'info') return 'ok';
            return acc;
          }, 'info');
          const sty = SEV_STYLES[worst];
          return (
            <section
              key={g}
              className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 shadow-sm"
            >
              <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-yellow-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">{label}</h2>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sty.color} ${sty.bg}`}
                >
                  {sty.label}
                </span>
              </header>
              <ul className="mt-3 space-y-2">
                {items.map((c) => {
                  const s = SEV_STYLES[c.severity];
                  const ItemIcon = s.Icon;
                  return (
                    <li
                      key={c.id}
                      className={`rounded-xl border border-white/5 ${s.bg} px-3 py-2 ring-1 ${s.ring}`}
                    >
                      <div className="flex items-start gap-2">
                        <ItemIcon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${s.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <span className="text-[13px] font-medium text-zinc-100">{c.label}</span>
                            {typeof c.latencyMs === 'number' && (
                              <span className="text-[10px] text-zinc-500">{c.latencyMs} ms</span>
                            )}
                          </div>
                          {c.detail && <div className="mt-0.5 text-[11.5px] text-zinc-400">{c.detail}</div>}
                          {c.suggestion && (
                            <div className="mt-1 text-[11.5px] text-yellow-200/90">💡 {c.suggestion}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {!data && !loading && !error && (
        <p className="text-sm text-zinc-400">Sin datos todavía.</p>
      )}
    </div>
  );
}
