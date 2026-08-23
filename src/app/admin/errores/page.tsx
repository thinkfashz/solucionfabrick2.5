'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Trash2,
  Loader2,
  Filter,
  Activity,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

interface ErrorLog {
  id: string;
  endpoint: string | null;
  method: string | null;
  payload: unknown;
  error_message: string | null;
  status_code: number | null;
  resolved: boolean;
  created_at: string;
}

type FilterMode = 'all' | 'open' | 'resolved';

const filterLabels: Record<FilterMode, string> = {
  open: 'Pendientes',
  resolved: 'Resueltos',
  all: 'Todos',
};

export default function AdminErroresPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('open');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('resolved', 'false');
      if (filter === 'resolved') params.set('resolved', 'true');
      params.set('limit', '200');

      const res = await fetch(`/api/admin/error-logs?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`);
        if (data?.hint) setHint(data.hint);
        setLogs([]);
        return;
      }
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const updateResolved = async (id: string, resolved: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/error-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Error ${res.status}`);
        return;
      }
      await fetchLogs();
    } finally {
      setBusyId(null);
    }
  };

  const deleteLog = async (id: string) => {
    if (!confirm('¿Borrar este registro de error?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/error-logs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Error ${res.status}`);
        return;
      }
      await fetchLogs();
    } finally {
      setBusyId(null);
    }
  };

  const clearResolved = async () => {
    if (clearing || !confirm('¿Borrar TODOS los errores marcados como resueltos?')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/admin/error-logs?scope=resolved', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Error ${res.status}`);
        return;
      }
      await fetchLogs();
    } finally {
      setClearing(false);
    }
  };

  const counts = useMemo(() => {
    const open = logs.filter((l) => !l.resolved).length;
    const resolved = logs.filter((l) => l.resolved).length;
    return { open, resolved, total: logs.length };
  }, [logs]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Observabilidad"
        title="Monitor de errores"
        description="Revisa incidencias capturadas por la API, resuelve registros y conserva una vista operativa limpia sin mezclar un segundo tema oscuro dentro del admin."
        icon={AlertTriangle}
        actions={
          <button
            type="button"
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-bold text-[#5f584d] transition hover:bg-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
        }
      />

      <AdminMotion className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Pendientes" value={counts.open} icon={AlertTriangle} accent={counts.open ? 'rose' : 'emerald'} hint="Requieren revisión" />
        <AdminStat label="Resueltos" value={counts.resolved} icon={CheckCircle2} accent="emerald" hint="Dentro del filtro actual" />
        <AdminStat label="Registros" value={counts.total} icon={Activity} accent="yellow" hint={`Vista: ${filterLabels[filter]}`} />
      </AdminMotion>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[#8f887c]" />
            {(['open', 'resolved', 'all'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filter === mode
                    ? 'border-[#c77a00]/20 bg-[#ffb000]/12 text-[#77500a]'
                    : 'border-black/10 bg-white/55 text-[#716b60] hover:bg-white'
                }`}
              >
                {filterLabels[mode]}
              </button>
            ))}
          </div>
          {filter !== 'open' ? (
            <button
              type="button"
              onClick={() => void clearResolved()}
              disabled={clearing}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-rose-600/15 bg-rose-500/5 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Limpiar resueltos
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-rose-600/15 bg-rose-500/7 px-4 py-3 text-sm text-rose-800">
            <p className="font-bold">{error}</p>
            {hint ? <p className="mt-1 text-xs text-rose-700/75">{hint}</p> : null}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#817a6f]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando errores…
          </div>
        ) : logs.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
            <div className="max-w-sm">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
              <h2 className="mt-3 text-lg font-black text-[#171612]">Sin incidencias en esta vista</h2>
              <p className="mt-2 text-sm leading-6 text-[#817a6f]">No hay registros que coincidan con el filtro seleccionado.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-black/8">
            {logs.map((log) => (
              <article key={log.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-black/[0.045] px-2 py-1 font-mono text-[11px] font-semibold text-[#5f584d]">
                        {log.method || '?'} {log.endpoint || '(sin endpoint)'}
                      </span>
                      {log.status_code ? <span className="rounded-lg bg-rose-500/8 px-2 py-1 font-mono text-[11px] font-bold text-rose-700">HTTP {log.status_code}</span> : null}
                      <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${log.resolved ? 'bg-emerald-500/8 text-emerald-800' : 'bg-[#ffb000]/10 text-[#77500a]'}`}>
                        {log.resolved ? 'Resuelto' : 'Pendiente'}
                      </span>
                    </div>

                    <p className="mt-3 break-words text-sm font-bold leading-6 text-[#2a2722]">{log.error_message || '(sin mensaje)'}</p>

                    {log.payload != null ? (
                      <details className="mt-3 text-sm text-[#716b60]">
                        <summary className="cursor-pointer font-semibold hover:text-[#171612]">Ver payload</summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#171612] p-3 text-xs leading-5 text-[#f3eee4]">
                          {(() => {
                            try { return JSON.stringify(log.payload, null, 2); } catch { return String(log.payload); }
                          })()}
                        </pre>
                      </details>
                    ) : null}

                    <p className="mt-3 text-xs text-[#9a9286]">{formatDate(log.created_at)}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === log.id}
                      onClick={() => void updateResolved(log.id, !log.resolved)}
                      className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition disabled:opacity-50 ${
                        log.resolved
                          ? 'border border-black/10 bg-white/60 text-[#5f584d] hover:bg-white'
                          : 'bg-[#171612] text-white hover:bg-[#2a2823]'
                      }`}
                    >
                      {busyId === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : log.resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {log.resolved ? 'Reabrir' : 'Resolver'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === log.id}
                      onClick={() => void deleteLog(log.id)}
                      aria-label="Borrar registro"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-rose-600/15 bg-rose-500/5 text-rose-700 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('es-CL');
  } catch {
    return value;
  }
}
