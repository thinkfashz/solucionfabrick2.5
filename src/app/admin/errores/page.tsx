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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ──────────────────────────────────────────────────────────
 * Tipos
 * ─────────────────────────────────────────────────────────*/

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

/* ──────────────────────────────────────────────────────────
 * Página: Monitor de Errores (/admin/errores)
 *
 * Lista los logs de la tabla `admin_error_logs` (alimentada por
 * `withErrorLogging` desde `src/lib/apiHandler.ts`). Permite:
 *   - Filtrar por estado (todos / pendientes / resueltos)
 *   - Marcar un error como resuelto o re-abrirlo
 *   - Borrar un error individual
 *   - Borrar en bloque todos los resueltos
 * ─────────────────────────────────────────────────────────*/

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

      const res = await fetch(`/api/admin/error-logs?${params.toString()}`, {
        cache: 'no-store',
      });
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
    fetchLogs();
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
    if (clearing) return;
    if (!confirm('¿Borrar TODOS los errores marcados como resueltos?')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/admin/error-logs?scope=resolved', {
        method: 'DELETE',
      });
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-yellow-electric flex items-center gap-2">
              <AlertTriangle className="w-7 h-7" />
              Monitor de Sistema
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Errores capturados automáticamente por las rutas API envueltas con{' '}
              <code className="text-yellow-glow">withErrorLogging</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="border-gray-700 text-gray-200 hover:bg-gray-800"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          {(['open', 'resolved', 'all'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                filter === mode
                  ? 'bg-yellow-electric text-black border-yellow-electric'
                  : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }`}
            >
              {mode === 'open' && 'Pendientes'}
              {mode === 'resolved' && 'Resueltos'}
              {mode === 'all' && 'Todos'}
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-auto">
            {counts.total} registro{counts.total === 1 ? '' : 's'} · {counts.open} pendiente
            {counts.open === 1 ? '' : 's'}
          </span>
          {filter !== 'open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearResolved}
              disabled={clearing}
              className="border-red-900 text-red-300 hover:bg-red-950"
            >
              {clearing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              {clearing ? 'Limpiando…' : 'Limpiar resueltos'}
            </Button>
          )}
        </div>

        {/* Errores de la API */}
        {error && (
          <div className="border border-red-700 bg-red-950/30 rounded-lg p-4 mb-4">
            <p className="text-red-300 font-semibold">{error}</p>
            {hint && <p className="text-xs text-red-200/70 mt-1">{hint}</p>}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Cargando errores…
          </div>
        ) : logs.length === 0 ? (
          <div className="border border-green-700/40 bg-green-950/20 rounded-lg p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-green-200 font-semibold">No hay errores registrados.</p>
            <p className="text-xs text-gray-400 mt-1">¡Todo funciona perfecto! 🚀</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <article
                key={log.id}
                className={`p-4 rounded-lg border ${
                  log.resolved
                    ? 'border-green-700/50 bg-green-950/10 opacity-70'
                    : 'border-red-700/60 bg-red-950/10'
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono">
                        {log.method || '?'} {log.endpoint || '(sin endpoint)'}
                      </span>
                      {log.status_code && (
                        <span className="text-xs bg-red-900/60 px-2 py-0.5 rounded text-red-200 font-mono">
                          {log.status_code}
                        </span>
                      )}
                      {log.resolved && (
                        <span className="text-xs bg-green-900/60 px-2 py-0.5 rounded text-green-200">
                          Resuelto
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-red-300 font-semibold break-words">
                      {log.error_message || '(sin mensaje)'}
                    </p>

                    {log.payload != null && (
                      <details className="mt-2 text-sm text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-200">
                          Ver datos enviados (payload)
                        </summary>
                        <pre className="mt-1 bg-gray-900 p-2 rounded text-xs overflow-x-auto max-h-64">
                          {(() => {
                            try {
                              return JSON.stringify(log.payload, null, 2);
                            } catch {
                              return String(log.payload);
                            }
                          })()}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {log.resolved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === log.id}
                        onClick={() => updateResolved(log.id, false)}
                        className="border-gray-600 text-gray-200 hover:bg-gray-800"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Reabrir
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busyId === log.id}
                        onClick={() => updateResolved(log.id, true)}
                        className="bg-yellow-electric text-black hover:bg-yellow-glow font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Solucionar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === log.id}
                      onClick={() => deleteLog(log.id)}
                      aria-label="Borrar registro"
                      className="border-red-900 text-red-300 hover:bg-red-950"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {(() => {
                    try {
                      return new Date(log.created_at).toLocaleString('es-CL');
                    } catch {
                      return log.created_at;
                    }
                  })()}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
