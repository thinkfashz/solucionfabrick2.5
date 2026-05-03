'use client';

/**
 * AdminActionGuard — "Acción Inteligente y Diagnóstico"
 *
 * A reusable wrapper for admin save/sync actions that:
 *   • Renders a thin status bar at the top of the card (yellow animated while
 *     running, green on success, red on failure) so the operator can see the
 *     end-to-end flow at a glance.
 *   • Owns the loading state of the primary (gold) action button.
 *   • Surfaces the *raw* InsForge SDK error (message + PostgreSQL code/details/
 *     hint) instead of generic "Error de red" toasts.
 *   • Detects "relation does not exist" / "table … does not exist" failures and
 *     offers an inline "Crear tabla faltante ahora" repair button that runs the
 *     supplied `missingTableSql` against `/api/admin/sql`.
 *   • Provides a "Ver Envío de Datos" toggle that reveals the JSON payload
 *     about to be sent to the backend, for debugging and transparency.
 *
 * It is purposely UI-only: callers pass `onExecute` (an async function that
 * actually talks to the API) and the guard handles state, visuals and repair.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Hammer, Loader2, Save } from 'lucide-react';

export type AdminActionState = 'idle' | 'loading' | 'success' | 'error';

/** Shape returned by `onExecute`. Mirrors the JSON shape used by /api/admin/* routes. */
export interface AdminActionResult {
  ok: boolean;
  /** Human-readable message (the raw `error` from the SDK when ok=false). */
  error?: string;
  /** PostgreSQL/PostgREST error code (e.g. `42P01`) or InsForge `error` string. */
  code?: string;
  /** Optional details/hint coming from PostgREST. */
  details?: string;
  hint?: string;
  /** HTTP status returned by the underlying call, when known. */
  statusCode?: number;
}

export interface AdminActionGuardProps {
  /** Short label shown on the action button (e.g. "Guardar credenciales"). */
  actionName: string;
  /** Payload that will be sent. Rendered verbatim under the "Ver Envío de Datos" toggle. */
  payload: unknown;
  /** Async executor. Should return `{ ok: false, error, code, details, hint }` on failure. */
  onExecute: () => Promise<AdminActionResult>;
  /**
   * SQL used by the inline repair button when the API reports that a required
   * table is missing. Should be safe to run multiple times (use
   * `CREATE TABLE IF NOT EXISTS …`).
   */
  missingTableSql?: string;
  /** Optional additional content rendered above the action bar (e.g. the form fields). */
  children?: ReactNode;
  /** Disables the primary button regardless of internal state. */
  disabled?: boolean;
  /** Optional className for the outer wrapper. */
  className?: string;
}

/**
 * Heuristic for "table missing" errors coming from PostgREST / InsForge.
 *
 * PostgreSQL raises SQLSTATE `42P01` ("undefined_table") with a message such as
 *   `relation "public.integrations" does not exist`
 * The same error sometimes surfaces as plain text from InsForge with the words
 *   `table … does not exist` or `Could not find the table 'public.integrations'`.
 */
export function isMissingTableError(result: Pick<AdminActionResult, 'error' | 'code' | 'details' | 'hint'>): boolean {
  if (result.code === '42P01') return true;
  const haystack = `${result.error ?? ''} ${result.details ?? ''} ${result.hint ?? ''}`.toLowerCase();
  if (!haystack.trim()) return false;
  return (
    (haystack.includes('relation') && haystack.includes('does not exist')) ||
    (haystack.includes('table') && haystack.includes('does not exist')) ||
    haystack.includes('could not find the table') ||
    haystack.includes('undefined_table')
  );
}

interface RepairState {
  status: AdminActionState;
  message?: string;
}

export default function AdminActionGuard({
  actionName,
  payload,
  onExecute,
  missingTableSql,
  children,
  disabled,
  className,
}: AdminActionGuardProps) {
  const [state, setState] = useState<AdminActionState>('idle');
  const [result, setResult] = useState<AdminActionResult | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [repair, setRepair] = useState<RepairState>({ status: 'idle' });

  const payloadJson = useMemo(() => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return '/* payload no serializable */';
    }
  }, [payload]);

  const run = useCallback(async () => {
    setState('loading');
    setRepair({ status: 'idle' });
    try {
      const res = await onExecute();
      setResult(res);
      setState(res.ok ? 'success' : 'error');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red inesperado.';
      setResult({ ok: false, error: message });
      setState('error');
    }
  }, [onExecute]);

  const runRepair = useCallback(async () => {
    if (!missingTableSql) return;
    setRepair({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: missingTableSql }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: number;
        error?: string;
        data?: unknown;
      };
      const ok = res.ok && json.ok !== false;
      if (!ok) {
        const msg =
          json.error ||
          (typeof json.data === 'object' && json.data && 'error' in (json.data as Record<string, unknown>)
            ? String((json.data as Record<string, unknown>).error)
            : `HTTP ${res.status}`);
        setRepair({ status: 'error', message: msg });
        return;
      }
      setRepair({ status: 'success', message: 'Tabla creada. Reintenta la acción.' });
    } catch (err) {
      setRepair({
        status: 'error',
        message: err instanceof Error ? err.message : 'Error de red al ejecutar el SQL.',
      });
    }
  }, [missingTableSql]);

  const showRepair = state === 'error' && !!result && !!missingTableSql && isMissingTableError(result);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-black/40 ${className ?? ''}`}
      data-state={state}
      data-testid="admin-action-guard"
    >
      {/* Status bar — thin top progress indicator */}
      <div className="relative h-1 w-full overflow-hidden bg-zinc-900">
        {state === 'loading' && (
          <div
            className="absolute inset-y-0 left-0 w-1/3 animate-[adminGuardSlide_1.2s_ease-in-out_infinite] bg-yellow-400"
            aria-hidden
          />
        )}
        {state === 'success' && <div className="absolute inset-0 bg-green-500" aria-hidden />}
        {state === 'error' && <div className="absolute inset-0 bg-red-500" aria-hidden />}
        {/* Local keyframes for the loading animation. Scoped to the component. */}
        <style>{`@keyframes adminGuardSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
      </div>

      <div className="p-4 sm:p-5">
        {children}

        {/* "Ver Envío de Datos" toggle */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-300"
            aria-expanded={showPayload}
            aria-controls={`admin-action-payload-${actionName.replace(/\s+/g, '-')}`}
          >
            {showPayload ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showPayload ? 'Ocultar envío de datos' : 'Ver envío de datos'}
          </button>
          {showPayload && (
            <pre
              id={`admin-action-payload-${actionName.replace(/\s+/g, '-')}`}
              className="mt-2 max-h-60 overflow-auto rounded-lg border border-white/5 bg-zinc-950/80 p-3 text-[10px] leading-relaxed text-zinc-300"
            >
              {payloadJson}
            </pre>
          )}
        </div>

        {/* Error / success surface */}
        {state === 'error' && result && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="font-bold uppercase tracking-widest text-[10px] text-red-300">
                  Falla de InsForge
                </p>
                <p className="mt-1 break-words leading-relaxed">{result.error || 'Error desconocido.'}</p>
                {(result.code || result.statusCode) && (
                  <p className="mt-1 font-mono text-[10px] text-red-300/80">
                    {result.code ? `code: ${result.code}` : ''}
                    {result.code && result.statusCode ? ' · ' : ''}
                    {result.statusCode ? `status: ${result.statusCode}` : ''}
                  </p>
                )}
                {result.details && (
                  <p className="mt-1 break-words text-[10px] text-red-200/80">
                    <span className="font-semibold">details:</span> {result.details}
                  </p>
                )}
                {result.hint && (
                  <p className="mt-1 break-words text-[10px] text-red-200/80">
                    <span className="font-semibold">hint:</span> {result.hint}
                  </p>
                )}
              </div>
            </div>

            {showRepair && (
              <div className="mt-3 rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-300">
                  Reparación automática disponible
                </p>
                <p className="mt-1 text-[11px] text-yellow-100/80">
                  La tabla requerida no existe en InsForge. Puedes crearla ahora mismo sin abandonar esta pantalla.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void runRepair()}
                    disabled={repair.status === 'loading'}
                    className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-black transition hover:bg-yellow-300 disabled:opacity-60"
                  >
                    {repair.status === 'loading' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Hammer className="h-3.5 w-3.5" />
                    )}
                    {repair.status === 'loading' ? 'Creando tabla…' : 'Crear tabla faltante ahora'}
                  </button>
                  {repair.status === 'success' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {repair.message}
                    </span>
                  )}
                  {repair.status === 'error' && (
                    <span className="inline-flex items-center gap-1 break-words text-[11px] text-red-300">
                      <AlertTriangle className="h-3.5 w-3.5" /> {repair.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'success' && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[11px] font-semibold text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Acción ejecutada correctamente.
          </div>
        )}

        {/* Primary action button */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void run()}
            disabled={disabled || state === 'loading'}
            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {state === 'loading' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {actionName}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
