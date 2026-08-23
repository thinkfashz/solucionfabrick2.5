'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  Server,
  Terminal,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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
  method?: string;
  requestId?: string;
  host?: string;
  region?: string;
  statusCode?: number;
  durationMs?: number;
  function?: string;
  runtime?: string;
  userAgent?: string;
  referer?: string;
  rawJson?: string;
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
  return new Date(ms).toLocaleString('es-CL', { hour12: false });
}

function relativeTime(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hace segundos';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  return `hace ${Math.round(hr / 24)} d`;
}

const STATE_COLORS: Record<string, string> = {
  READY: 'bg-emerald-500/10 text-emerald-800',
  BUILDING: 'bg-amber-500/10 text-amber-800',
  ERROR: 'bg-rose-500/10 text-rose-800',
  CANCELED: 'bg-zinc-500/10 text-zinc-700',
  QUEUED: 'bg-sky-500/10 text-sky-800',
};

const LEVEL_COLORS: Record<LogRow['level'], string> = {
  error: 'border-rose-400/20 bg-rose-500/8',
  warning: 'border-amber-400/20 bg-amber-500/8',
  info: 'border-white/8 bg-white/[0.035]',
};

const SOURCE_LABELS: Record<LogRow['source'], string> = {
  build: 'BUILD',
  runtime: 'RUNTIME',
  edge: 'EDGE',
  static: 'STATIC',
  system: 'SYS',
};

function Meta({ k, v, mono, truncate }: { k: string; v: string; mono?: boolean; truncate?: boolean }) {
  return (
    <>
      <dt className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f887c]">{k}</dt>
      <dd className={`min-w-0 text-[#514b42] ${mono ? 'font-mono text-[10px]' : 'text-[11px]'} ${truncate ? 'truncate' : 'break-all'}`} title={truncate ? v : undefined}>
        {v}
      </dd>
    </>
  );
}

export default function VercelLogsPage() {
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [counts, setCounts] = useState<{ error: number; warning: number; info: number } | null>(null);
  const [level, setLevel] = useState<LevelFilter>('error');
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const loadDeployments = useCallback(async () => {
    setLoadingDeployments(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vercel/deployments?limit=20', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as { ok: true; deployments: DeploymentRow[] } | ApiError;
      if (!res.ok || !('ok' in json)) {
        setError(('error' in json ? json : { error: `HTTP ${res.status}` }) as ApiError);
        return;
      }
      setDeployments(json.deployments);
      if (!selectedDeployment) {
        const ready = json.deployments.find((deployment) => deployment.state === 'READY');
        const pick = ready ?? json.deployments[0];
        if (pick) setSelectedDeployment(pick.id);
      }
    } catch (err) {
      setError({ error: err instanceof Error ? err.message : 'Error de red.' });
    } finally {
      setLoadingDeployments(false);
    }
  }, [selectedDeployment]);

  const loadLogs = useCallback(async (deploymentId: string, filter: LevelFilter) => {
    if (!deploymentId) return;
    setLoadingLogs(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vercel/logs?deployment=${encodeURIComponent(deploymentId)}&level=${filter}&limit=400`, { cache: 'no-store' });
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
  }, []);

  useEffect(() => {
    void loadDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDeployment) void loadLogs(selectedDeployment, level);
  }, [selectedDeployment, level, loadLogs]);

  const selectedRow = useMemo(() => deployments.find((deployment) => deployment.id === selectedDeployment), [deployments, selectedDeployment]);

  const visibleLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) => [
      log.message,
      log.path,
      log.requestId,
      String(log.statusCode ?? ''),
      log.host,
      log.region,
      log.function,
      log.method,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [logs, search]);

  const isMissingCreds = error?.code === 'VERCEL_NOT_CONFIGURED';
  const stats = counts ?? { error: 0, warning: 0, info: 0 };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Observabilidad"
        title="Logs de Vercel"
        description="Inspecciona deployments, builds y eventos runtime sin salir del panel. Las credenciales permanecen del lado del servidor."
        icon={Terminal}
        actions={
          <button
            type="button"
            onClick={() => {
              void loadDeployments();
              if (selectedDeployment) void loadLogs(selectedDeployment, level);
            }}
            disabled={loadingDeployments || loadingLogs}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingDeployments || loadingLogs ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Deployments" value={deployments.length} icon={Server} />
        <AdminStat label="Errores" value={stats.error} icon={TriangleAlert} accent="rose" />
        <AdminStat label="Warnings" value={stats.warning} icon={AlertTriangle} />
        <AdminStat label="Info" value={stats.info} icon={Info} accent="cyan" />
      </section>

      {isMissingCreds ? (
        <div className="rounded-xl border border-amber-600/15 bg-amber-500/8 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong className="font-black">Vercel no está configurado.</strong>
              <p className="mt-1">{error?.error}</p>
              {error?.hint ? <p className="mt-1 text-xs text-amber-800/80">{error.hint}</p> : null}
              <Link href="/admin/integraciones" className="mt-3 inline-flex rounded-xl bg-[#171612] px-3 py-2 text-xs font-black text-white">Configurar integración</Link>
            </div>
          </div>
        </div>
      ) : null}

      {error && !isMissingCreds ? (
        <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 p-4 text-sm text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <strong className="font-black">Error de Vercel</strong>
              <p className="mt-1 break-words">{error.error}</p>
              {(error.code || error.statusCode) ? <p className="mt-1 font-mono text-[10px]">{error.code ?? ''}{error.code && error.statusCode ? ' · ' : ''}{error.statusCode ? `HTTP ${error.statusCode}` : ''}</p> : null}
              {error.hint ? <p className="mt-1 text-xs opacity-80">{error.hint}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {!isMissingCreds ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <AdminCard className="h-fit p-0 sm:p-0">
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Deployments</p>
                <p className="mt-1 text-xs text-[#817a6f]">Selecciona una versión para inspeccionarla.</p>
              </div>
              {loadingDeployments ? <RefreshCw className="h-4 w-4 animate-spin text-[#9a9286]" /> : null}
            </div>
            {deployments.length === 0 && !loadingDeployments ? <p className="px-4 py-8 text-center text-xs text-[#817a6f]">Sin deployments para mostrar.</p> : null}
            <div className="max-h-[68vh] divide-y divide-black/8 overflow-y-auto px-3 py-2">
              {deployments.map((deployment) => {
                const active = deployment.id === selectedDeployment;
                return (
                  <button
                    key={deployment.id}
                    type="button"
                    onClick={() => setSelectedDeployment(deployment.id)}
                    className={`my-1 w-full rounded-xl px-3 py-3 text-left transition ${active ? 'bg-[#ffb000]/10' : 'hover:bg-black/[.035]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] font-bold text-[#514b42]">{deployment.commit ?? deployment.id.slice(-8)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${STATE_COLORS[deployment.state] ?? 'bg-zinc-500/10 text-zinc-700'}`}>{deployment.state}</span>
                    </div>
                    {deployment.commitMessage ? <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-[#27241f]">{deployment.commitMessage}</p> : null}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[#9a9286]">
                      <span className="truncate">{deployment.branch ?? deployment.target ?? '—'}</span>
                      <span title={formatTimestamp(deployment.createdAt)}>{relativeTime(deployment.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </AdminCard>

          <AdminCard className="p-0 sm:p-0">
            <div className="flex flex-col gap-3 border-b border-black/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Eventos</p>
                {selectedRow ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#716b60]">
                    <span className="font-mono">{selectedRow.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${STATE_COLORS[selectedRow.state] ?? 'bg-zinc-500/10 text-zinc-700'}`}>{selectedRow.state}</span>
                    {selectedRow.url ? (
                      <a href={selectedRow.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#8a620f] hover:underline">
                        Abrir deployment <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                ) : <p className="mt-1 text-xs text-[#817a6f]">Selecciona un deployment.</p>}
              </div>
              <div className="inline-flex self-start rounded-xl border border-black/10 bg-white/55 p-1">
                <Filter className="mx-2 my-auto h-3.5 w-3.5 text-[#9a9286]" />
                {(['error', 'warning', 'all'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLevel(option)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${level === option ? 'bg-[#171612] text-white' : 'text-[#716b60] hover:bg-black/[.04]'}`}
                  >
                    {option === 'error' ? 'Errores' : option === 'warning' ? 'Warnings+' : 'Todo'}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-black/8 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2.5">
                <Search className="h-4 w-4 text-[#9a9286]" />
                <input
                  type="search"
                  placeholder="Buscar mensaje, ruta, requestId o status…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#171612] outline-none placeholder:text-[#aaa298]"
                />
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto bg-[#171713] p-3" data-log-console>
              {loadingLogs && logs.length === 0 ? <p className="px-2 py-8 text-center text-xs text-zinc-500">Cargando eventos…</p> : null}
              {!loadingLogs && visibleLogs.length === 0 && !error ? (
                <div className="px-2 py-12 text-center text-xs text-zinc-500">
                  <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
                  {search.trim() ? `Sin coincidencias para “${search}”.` : 'Sin eventos para el filtro seleccionado.'}
                </div>
              ) : null}

              <ul className="space-y-2">
                {visibleLogs.map((log) => {
                  const isOpen = expanded.has(log.id);
                  const hasMeta = Boolean(log.requestId || log.host || log.region || log.statusCode != null || log.durationMs != null || log.function || log.runtime || log.userAgent || log.referer || log.method);
                  return (
                    <li key={log.id} className={`overflow-hidden rounded-xl border ${LEVEL_COLORS[log.level]}`}>
                      <button type="button" onClick={() => toggleExpanded(log.id)} className="flex w-full items-start gap-2 p-3 text-left" aria-expanded={isOpen}>
                        <span className="mt-0.5 text-zinc-500">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-zinc-400">
                            <span>{formatTimestamp(log.ts)}</span>
                            <span className="rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-black">{SOURCE_LABELS[log.source]}</span>
                            <span className="rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-black uppercase">{log.level}</span>
                            {log.method ? <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-black text-sky-300">{log.method}</span> : null}
                            {typeof log.statusCode === 'number' ? (
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${log.statusCode >= 500 ? 'bg-rose-500/12 text-rose-300' : log.statusCode >= 400 ? 'bg-amber-500/12 text-amber-300' : 'bg-emerald-500/12 text-emerald-300'}`}>{log.statusCode}</span>
                            ) : null}
                            {typeof log.durationMs === 'number' ? <span>{log.durationMs}ms</span> : null}
                            {log.region ? <span>{log.region}</span> : null}
                            {log.path ? <span className="truncate">{log.path}</span> : null}
                          </div>
                          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-100">{log.message}</pre>
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="border-t border-white/8 bg-black/25 p-3">
                          {hasMeta ? (
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                              {log.requestId ? <Meta k="requestId" v={log.requestId} mono /> : null}
                              {log.host ? <Meta k="host" v={log.host} /> : null}
                              {log.region ? <Meta k="region" v={log.region} /> : null}
                              {log.statusCode != null ? <Meta k="status" v={String(log.statusCode)} /> : null}
                              {log.durationMs != null ? <Meta k="duration" v={`${log.durationMs}ms`} /> : null}
                              {log.function ? <Meta k="function" v={log.function} /> : null}
                              {log.runtime ? <Meta k="runtime" v={log.runtime} /> : null}
                              {log.method ? <Meta k="method" v={log.method} /> : null}
                              {log.userAgent ? <Meta k="userAgent" v={log.userAgent} truncate /> : null}
                              {log.referer ? <Meta k="referer" v={log.referer} truncate /> : null}
                            </dl>
                          ) : null}
                          {log.rawJson ? (
                            <details className="mt-3">
                              <summary className="cursor-pointer select-none text-[10px] font-black uppercase tracking-[.14em] text-zinc-400 hover:text-amber-300">Ver JSON crudo</summary>
                              <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-zinc-300">{log.rawJson}</pre>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </AdminPage>
  );
}
