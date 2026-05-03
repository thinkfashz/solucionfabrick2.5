'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, Filter, RefreshCw, Server, Terminal } from 'lucide-react';

/**
 * /admin/vercel-logs
 *
 * Server-side bridge to the Vercel REST API. Lets the operator:
 *   1. Pick a recent deployment of the configured project.
 *   2. See its build + runtime logs filtered by level (error/warning/all).
 *   3. Refresh on demand and jump to the deployment in vercel.com.
 *
 * Credentials live in the InsForge `integrations` table (provider = 'vercel')
 * and are read server-side. The token never reaches the browser.
 */

interface DeploymentRow {
  id: string;
  url?: string;
  name?: string;
  state: string;
  target: string | null;
  createdAt: number;
  branch?: string;
  commit?: string;
  commitMessage?: string;
}

interface LogRow {
  id: string;
  ts: number;
  level: 'info' | 'warning' | 'error';
  source: 'build' | 'runtime' | 'edge' | 'static' | 'system';
  message: string;
  path?: string;
  deploymentId: string;
}

type LevelFilter = 'error' | 'warning' | 'all';

interface ApiError {
  error: string;
  code?: string;
  hint?: string;
  statusCode?: number;
}

function formatTimestamp(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return d.toLocaleString('es-CL', { hour12: false });
}

function relativeTime(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hace segundos';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.round(hr / 24);
  return `hace ${days} d`;
}

const STATE_COLORS: Record<string, string> = {
  READY: 'border-green-500/30 bg-green-500/10 text-green-400',
  BUILDING: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  ERROR: 'border-red-500/30 bg-red-500/10 text-red-400',
  CANCELED: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  QUEUED: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

const LEVEL_COLORS: Record<LogRow['level'], string> = {
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
  info: 'border-white/10 bg-zinc-900/60 text-zinc-300',
};

const SOURCE_LABELS: Record<LogRow['source'], string> = {
  build: 'BUILD',
  runtime: 'RUNTIME',
  edge: 'EDGE',
  static: 'STATIC',
  system: 'SYS',
};

export default function VercelLogsPage() {
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string>('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [counts, setCounts] = useState<{ error: number; warning: number; info: number } | null>(null);
  const [level, setLevel] = useState<LevelFilter>('error');
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadDeployments = useCallback(async () => {
    setLoadingDeployments(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vercel/deployments?limit=20', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as
        | { ok: true; deployments: DeploymentRow[] }
        | ApiError;
      if (!res.ok || !('ok' in json)) {
        setError(('error' in json ? json : { error: `HTTP ${res.status}` }) as ApiError);
        return;
      }
      setDeployments(json.deployments);
      // Auto-select the first READY (or first overall) deployment.
      if (!selectedDeployment) {
        const ready = json.deployments.find((d) => d.state === 'READY');
        const pick = ready ?? json.deployments[0];
        if (pick) setSelectedDeployment(pick.id);
      }
    } catch (err) {
      setError({ error: err instanceof Error ? err.message : 'Error de red.' });
    } finally {
      setLoadingDeployments(false);
    }
  }, [selectedDeployment]);

  const loadLogs = useCallback(
    async (deploymentId: string, filter: LevelFilter) => {
      if (!deploymentId) return;
      setLoadingLogs(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/vercel/logs?deployment=${encodeURIComponent(deploymentId)}&level=${filter}&limit=400`,
          { cache: 'no-store' },
        );
        const json = (await res.json().catch(() => ({}))) as
          | { ok: true; logs: LogRow[]; counts: { error: number; warning: number; info: number } }
          | ApiError;
        if (!res.ok || !('ok' in json)) {
          setError(('error' in json ? json : { error: `HTTP ${res.status}` }) as ApiError);
          setLogs([]);
          return;
        }
        setLogs(json.logs);
        setCounts(json.counts);
      } catch (err) {
        setError({ error: err instanceof Error ? err.message : 'Error de red.' });
      } finally {
        setLoadingLogs(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDeployments();
    // We only want to load deployments once on mount; later refreshes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDeployment) {
      void loadLogs(selectedDeployment, level);
    }
  }, [selectedDeployment, level, loadLogs]);

  const selectedRow = useMemo(
    () => deployments.find((d) => d.id === selectedDeployment),
    [deployments, selectedDeployment],
  );

  const isMissingCreds = error?.code === 'VERCEL_NOT_CONFIGURED';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-yellow-400">Sistema</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Logs de Vercel</h1>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-zinc-400">
              Lee los eventos de build y runtime del deployment seleccionado directamente desde la API de Vercel.
              Usa el filtro por nivel para acotar a errores reales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadDeployments();
              if (selectedDeployment) void loadLogs(selectedDeployment, level);
            }}
            disabled={loadingDeployments || loadingLogs}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs || loadingDeployments ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>

        {isMissingCreds && (
          <div className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-[12px] text-yellow-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-yellow-300">Vercel sin configurar</p>
                <p className="mt-1">{error?.error}</p>
                {error?.hint && <p className="mt-1 text-yellow-100/80">{error.hint}</p>}
                <Link
                  href="/admin/configuracion"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-yellow-300"
                >
                  Ir a configuración →
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && !isMissingCreds && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-[12px] text-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0">
                <p className="font-bold uppercase tracking-widest text-[10px] text-red-300">Error de Vercel</p>
                <p className="mt-1 break-words">{error.error}</p>
                {(error.code || error.statusCode) && (
                  <p className="mt-1 font-mono text-[10px] text-red-300/80">
                    {error.code ? `code: ${error.code}` : ''}
                    {error.code && error.statusCode ? ' · ' : ''}
                    {error.statusCode ? `status: ${error.statusCode}` : ''}
                  </p>
                )}
                {error.hint && <p className="mt-1 text-red-200/80">{error.hint}</p>}
              </div>
            </div>
          </div>
        )}

        {!isMissingCreds && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Deployments sidebar */}
            <aside className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <Server className="mr-1 inline h-3 w-3 text-yellow-400" />
                  Deployments
                </p>
                {loadingDeployments && (
                  <span className="text-[10px] text-zinc-500">Cargando…</span>
                )}
              </div>
              {deployments.length === 0 && !loadingDeployments && (
                <p className="px-2 py-4 text-[11px] text-zinc-500">Sin deployments para mostrar.</p>
              )}
              <ul className="space-y-1.5">
                {deployments.map((d) => {
                  const active = d.id === selectedDeployment;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDeployment(d.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-yellow-400/50 bg-yellow-400/10'
                            : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-black/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-mono text-zinc-300">
                            {d.commit ?? d.id.slice(-8)}
                          </span>
                          <span
                            className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${
                              STATE_COLORS[d.state] ?? 'border-zinc-700 bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {d.state}
                          </span>
                        </div>
                        {d.commitMessage && (
                          <p className="mt-1 truncate text-[11px] text-zinc-200">{d.commitMessage}</p>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                          <span className="truncate">{d.branch ?? d.target ?? '—'}</span>
                          <span title={formatTimestamp(d.createdAt)}>{relativeTime(d.createdAt)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Logs panel */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/60">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    <Terminal className="mr-1 inline h-3 w-3 text-yellow-400" />
                    Eventos
                  </p>
                  {selectedRow ? (
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="font-mono text-zinc-200">{selectedRow.id}</span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          STATE_COLORS[selectedRow.state] ?? 'border-zinc-700 bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {selectedRow.state}
                      </span>
                      {selectedRow.url && (
                        <a
                          href={selectedRow.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-yellow-300"
                        >
                          {selectedRow.url.replace('https://', '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">Selecciona un deployment</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 p-1">
                  <Filter className="ml-1.5 h-3 w-3 text-zinc-500" />
                  {(['error', 'warning', 'all'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLevel(opt)}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                        level === opt
                          ? 'bg-yellow-400 text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt === 'error' && 'Errores'}
                      {opt === 'warning' && 'Warnings+'}
                      {opt === 'all' && 'Todo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Counts strip */}
              {counts && (
                <div className="flex flex-wrap gap-3 border-b border-white/5 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-400">
                  <span>
                    <span className="text-red-400">{counts.error}</span> errores
                  </span>
                  <span>
                    <span className="text-yellow-300">{counts.warning}</span> warnings
                  </span>
                  <span>
                    <span className="text-zinc-300">{counts.info}</span> info
                  </span>
                </div>
              )}

              {/* Logs list */}
              <div className="max-h-[70vh] overflow-y-auto p-3">
                {loadingLogs && logs.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11px] text-zinc-500">Cargando eventos…</p>
                )}
                {!loadingLogs && logs.length === 0 && !error && (
                  <p className="px-2 py-10 text-center text-[12px] text-zinc-500">
                    <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-green-400" />
                    Sin eventos para el filtro seleccionado.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className={`rounded-lg border p-3 ${LEVEL_COLORS[log.level]}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-400">
                        <span>{formatTimestamp(log.ts)}</span>
                        <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] font-bold tracking-widest">
                          {SOURCE_LABELS[log.source]}
                        </span>
                        <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                          {log.level}
                        </span>
                        {log.path && (
                          <span className="truncate text-zinc-300">{log.path}</span>
                        )}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-100">
                        {log.message}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
