'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Play, RotateCcw, Copy, ChevronDown, ChevronUp, Database, Wrench, Loader2, Rocket, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const QUICK_QUERIES = [
  { label: 'Ver tablas', sql: `SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size\nFROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;` },
  { label: 'Crear tabla (template)', sql: `-- Reemplaza "mi_tabla" y los campos.\n-- IF NOT EXISTS evita el error 42P07 si la tabla ya existe.\nCREATE TABLE IF NOT EXISTS public.mi_tabla (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  created_at timestamptz DEFAULT now()\n);` },
  { label: 'Ver productos', sql: `SELECT id, name, price, stock, activo, featured\nFROM public.products\nORDER BY created_at DESC\nLIMIT 20;` },
  { label: 'Ver órdenes', sql: `SELECT id, customer_name, customer_email, total, status, created_at\nFROM public.orders\nORDER BY created_at DESC\nLIMIT 20;` },
  { label: 'Ver leads', sql: `SELECT id, nombre, email, telefono, estado, created_at\nFROM public.leads\nORDER BY created_at DESC\nLIMIT 20;` },
  { label: 'Ver columnas de products', sql: `SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_schema = 'public' AND table_name = 'products'\nORDER BY ordinal_position;` },
  { label: 'Deshabilitar RLS en todo', sql: `DO $$\nDECLARE tbl TEXT;\n  tablas TEXT[] := ARRAY['products','orders','leads','projects','categories','admin_users','banners','site_config','business_config','deliveries','payment_webhooks','posts_social','observatory_logs','notifications','integrations','push_subscriptions','cupones','servicios','testimonios','admin_invitations'];\nBEGIN\n  FOREACH tbl IN ARRAY tablas LOOP\n    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN\n      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);\n    END IF;\n  END LOOP;\nEND $$;` },
  { label: 'Contar filas por tabla', sql: `SELECT 'products' AS tabla, COUNT(*) FROM public.products\nUNION ALL SELECT 'orders', COUNT(*) FROM public.orders\nUNION ALL SELECT 'leads', COUNT(*) FROM public.leads\nUNION ALL SELECT 'projects', COUNT(*) FROM public.projects\nUNION ALL SELECT 'admin_users', COUNT(*) FROM public.admin_users;` },
];

type Row = Record<string, unknown>;

interface QueryResult {
  ok: boolean;
  status?: number;
  error?: string;
  rows?: Row[];
  rowCount?: number;
  raw?: unknown;
  durationMs?: number;
  /** True when the upstream error is a benign / recoverable Postgres
   * condition (object already exists, missing object, etc.) so the UI
   * can render it as an amber warning instead of a red error. */
  warning?: boolean;
  /** Human-readable hint shown alongside the upstream error when
   * `warning` is true. */
  hint?: string;
}

/**
 * Inspects an upstream Postgres error string and returns a benign
 * classification + hint when it matches a well-known recoverable
 * condition. Returns `null` for genuine errors that should still be
 * rendered in red.
 *
 * The Terminal SQL is a thin pass-through to InsForge's
 * `/rawsql/unrestricted`, so DDL like `CREATE TABLE public.foo (...)`
 * without `IF NOT EXISTS` will surface as 42P07 ("relation already
 * exists") with HTTP 500. That's not an app bug — the table is just
 * already there. We surface it as a warning with an actionable tip.
 */
function classifyPgError(message: string | undefined): { warning: boolean; hint: string } | null {
  if (!message) return null;
  const m = message.toLowerCase();
  // 42883 — undefined_function: cubre el caso muy específico de copiar
  // sintaxis Supabase (`auth.jwt()`, `auth.uid()`, etc.) que InsForge no
  // expone. Es la primera causa de los 500 que ven los admins cuando pegan
  // bloques de RLS desde guías genéricas de Supabase.
  if (/auth\.jwt|auth\.uid|\bdoes not exist\b.*function|\b42883\b/.test(m)) {
    return {
      warning: true,
      hint:
        'Esa función no existe en InsForge. `auth.jwt()` y `auth.uid()` son helpers exclusivos de Supabase; aquí no aplican y no son necesarios. Elimina el bloque `CREATE POLICY ... auth.jwt()` y los `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`: InsForge filtra el acceso vía PostgREST + API key. Si solo quieres crear las tablas, deja únicamente los `CREATE TABLE IF NOT EXISTS` y los índices.',
    };
  }
  // 42P07 — duplicate_table / object already exists
  if (/already exists/.test(m) || /\b42p07\b/.test(m)) {
    return {
      warning: true,
      hint:
        'El objeto ya existe en la base. Usa CREATE TABLE IF NOT EXISTS … (o ALTER TABLE … ADD COLUMN IF NOT EXISTS …) para que el bloque sea idempotente. Si solo querías crear las tablas que faltan, usa /admin/setup → "Crear tablas ahora": ejecuta el script bloque por bloque y reporta cada tabla.',
    };
  }
  // 42P01 — undefined_table / 42703 — undefined_column
  if (/does not exist/.test(m) || /\b42p01\b/.test(m) || /\b42703\b/.test(m)) {
    return {
      warning: true,
      hint:
        'El objeto referenciado no existe (tabla/columna). Verifica el nombre o ejecuta /admin/setup → "Crear tablas ahora" para crear el esquema base antes de consultar.',
    };
  }
  return null;
}

function extractRows(data: unknown): Row[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.rows)) return d.rows as Row[];
  if (d.data && typeof d.data === 'object') {
    const inner = d.data as Record<string, unknown>;
    if (Array.isArray(inner.rows)) return inner.rows as Row[];
    if (Array.isArray(inner)) return inner as Row[];
  }
  if (Array.isArray(d.result)) return d.result as Row[];
  if (Array.isArray(d)) return d as Row[];
  return [];
}

interface MigrationStepResult { sql: string; ok: boolean; error?: string; }
interface MigrationResult { ok: boolean; total: number; passed: number; failed: number; results: MigrationStepResult[]; }

export default function SqlTerminalPage() {
  const [query, setQuery] = useState('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runMigration = useCallback(async () => {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/admin/sql/migration', { method: 'POST' });
      const data = await res.json() as MigrationResult;
      setMigrationResult(data);
    } catch (e) {
      setMigrationResult({ ok: false, total: 0, passed: 0, failed: 1, results: [{ sql: 'fetch', ok: false, error: (e as Error).message }] });
    } finally {
      setMigrating(false);
    }
  }, []);

  const runQuery = useCallback(async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      const rows = extractRows(json.data);
      const rawError = json.ok ? undefined : (json.error ?? JSON.stringify(json.data));
      const classified = json.ok ? null : classifyPgError(rawError);
      setResult({
        ok: json.ok,
        status: json.status,
        error: rawError,
        rows,
        rowCount: rows.length,
        raw: json.data,
        durationMs: Date.now() - t0,
        warning: classified?.warning ?? false,
        hint: classified?.hint,
      });
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message, durationMs: Date.now() - t0 });
    } finally {
      setRunning(false);
    }
  }, [query, running]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  const copyResult = () => {
    if (result?.rows) {
      navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2));
    }
  };

  const columns = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#facc15]" />
          <span className="font-bold text-sm">Terminal SQL</span>
          <span className="text-xs text-zinc-500">InsForge</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/setup"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            title="Abrir el asistente que crea automáticamente todas las tablas requeridas"
          >
            <Wrench className="w-3 h-3" />
            Crear tablas ahora
          </Link>
          <button
            onClick={() => { setShowMigration(!showMigration); setShowQuick(false); }}
            className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 px-2.5 py-1 rounded-lg border border-violet-400/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
          >
            <Rocket className="w-3 h-3" />
            Migración SaaS
          </button>
          <button
            onClick={() => { setShowQuick(!showQuick); setShowMigration(false); }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Consultas rápidas
            {showQuick ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Migration panel */}
      {showMigration && (
        <div className="border-b border-violet-500/20 bg-violet-950/20 px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Migración multi-tenant SaaS
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Ejecuta todas las sentencias SQL necesarias para activar el modo SaaS: tablas de planes, tenants, suscripciones, columnas <code className="text-violet-300">tenant_id</code> en tablas existentes, índices y vistas.
                Es <strong className="text-white">idempotente</strong> — puedes correrla varias veces sin problema.
              </p>
            </div>
            <button
              onClick={runMigration}
              disabled={migrating}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
            >
              {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {migrating ? 'Ejecutando…' : 'Ejecutar ahora'}
            </button>
          </div>

          {migrationResult && (
            <div className={`rounded-xl border p-4 ${migrationResult.ok ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                {migrationResult.ok
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <AlertTriangle className="w-5 h-5 text-red-400" />
                }
                <span className={`font-bold text-sm ${migrationResult.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                  {migrationResult.ok
                    ? `¡Listo! ${migrationResult.passed} de ${migrationResult.total} sentencias ejecutadas correctamente.`
                    : `${migrationResult.failed} sentencia(s) fallaron de ${migrationResult.total}.`
                  }
                </span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {migrationResult.results.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {r.ok
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    }
                    <span className={`font-mono ${r.ok ? 'text-zinc-400' : 'text-red-300'}`}>
                      {r.sql}{r.error ? ` — ${r.error}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              {migrationResult.ok && (
                <p className="text-xs text-emerald-300/70 mt-3 border-t border-emerald-500/20 pt-3">
                  Siguiente paso: configura el DNS wildcard <code>*.fabrick.cl → cname.vercel-dns.com</code> en tu registrador de dominios.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick queries panel */}
      {showQuick && (
        <div className="border-b border-white/5 bg-zinc-950/50 px-4 py-3 flex flex-wrap gap-2">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q.label}
              onClick={() => { setQuery(q.sql); setShowQuick(false); textareaRef.current?.focus(); }}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-white/5"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-none px-4 pt-4 pb-2">
        <div className={`relative rounded-xl overflow-hidden border bg-zinc-950 transition-all ${running ? 'border-yellow-400/50 shadow-[0_0_20px_-4px_rgba(250,204,21,0.4)]' : 'border-white/10'}`}>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
            spellCheck={false}
            className="w-full bg-transparent p-4 text-sm font-mono text-emerald-300 resize-none focus:outline-none placeholder-zinc-700"
            placeholder="Escribe tu SQL aquí... (Ctrl+Enter para ejecutar)"
          />
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-zinc-900/50">
            <span className="text-xs text-zinc-600">Ctrl+Enter para ejecutar</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setQuery(''); setResult(null); textareaRef.current?.focus(); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar
              </button>
              <button
                onClick={runQuery}
                disabled={running || !query.trim()}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 bg-yellow-400 text-black ${running ? 'animate-pulse' : 'hover:bg-yellow-300'}`}
              >
                {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {running ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div key={result.durationMs} className="flex-1 px-4 pb-4 overflow-auto animate-[fadeIn_180ms_ease-out]">
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            className={`rounded-xl border overflow-hidden ${
              result.ok
                ? 'border-emerald-500/20'
                : result.warning
                  ? 'border-amber-500/30'
                  : 'border-red-500/20'
            }`}
          >
            {/* Result header */}
            <div
              className={`px-4 py-2 flex items-center justify-between text-xs ${
                result.ok
                  ? 'bg-emerald-950/40 text-emerald-400'
                  : result.warning
                    ? 'bg-amber-950/40 text-amber-300'
                    : 'bg-red-950/40 text-red-400'
              }`}
            >
              <span>
                {result.ok
                  ? `${result.rowCount ?? 0} fila${result.rowCount !== 1 ? 's' : ''} · ${result.durationMs}ms`
                  : result.warning
                    ? `Aviso · ${result.durationMs}ms`
                    : `Error · ${result.durationMs}ms`}
              </span>
              {result.ok && result.rows && result.rows.length > 0 && (
                <button onClick={copyResult} className="flex items-center gap-1 hover:text-white transition-colors">
                  <Copy className="w-3 h-3" />
                  Copiar JSON
                </button>
              )}
            </div>

            {/* Error / Warning */}
            {!result.ok && (
              <div className={result.warning ? 'p-4 bg-amber-950/20 space-y-2' : 'p-4 bg-red-950/20'}>
                <code
                  className={`${result.warning ? 'text-amber-200' : 'text-red-300'} text-xs break-all block`}
                >
                  {result.error}
                </code>
                {result.warning && result.hint && (
                  <p className="text-xs text-amber-100/80 leading-relaxed">{result.hint}</p>
                )}
              </div>
            )}

            {/* Table */}
            {result.ok && columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-zinc-900/50">
                      {columns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows!.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        {columns.map((col) => {
                          const val = row[col];
                          const display = val === null ? 'NULL'
                            : typeof val === 'object' ? JSON.stringify(val)
                            : String(val);
                          return (
                            <td key={col} className={`px-4 py-2 font-mono whitespace-nowrap max-w-xs truncate ${val === null ? 'text-zinc-600 italic' : 'text-zinc-200'}`}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty */}
            {result.ok && columns.length === 0 && (
              <div className="p-6 text-center text-zinc-600 text-xs">
                Query ejecutado exitosamente (sin filas retornadas)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
