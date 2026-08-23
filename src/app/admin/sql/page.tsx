'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Table2,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

const DEFAULT_QUERY = `SELECT table_name\nFROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;`;

const QUICK_QUERIES = [
  {
    label: 'Ver tablas',
    sql: `SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size\nFROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;`,
  },
  {
    label: 'Ver productos',
    sql: `SELECT id, name, price, stock, activo, featured\nFROM public.products\nORDER BY created_at DESC\nLIMIT 20;`,
  },
  {
    label: 'Ver órdenes',
    sql: `SELECT id, customer_name, customer_email, total, status, created_at\nFROM public.orders\nORDER BY created_at DESC\nLIMIT 20;`,
  },
  {
    label: 'Ver leads',
    sql: `SELECT id, nombre, email, telefono, estado, created_at\nFROM public.leads\nORDER BY created_at DESC\nLIMIT 20;`,
  },
  {
    label: 'Columnas products',
    sql: `SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_schema = 'public' AND table_name = 'products'\nORDER BY ordinal_position;`,
  },
  {
    label: 'Conteo principal',
    sql: `SELECT 'products' AS tabla, COUNT(*) FROM public.products\nUNION ALL SELECT 'orders', COUNT(*) FROM public.orders\nUNION ALL SELECT 'leads', COUNT(*) FROM public.leads\nUNION ALL SELECT 'projects', COUNT(*) FROM public.projects\nUNION ALL SELECT 'admin_users', COUNT(*) FROM public.admin_users;`,
  },
] as const;

type Row = Record<string, unknown>;

interface QueryResult {
  ok: boolean;
  status?: number;
  error?: string;
  rows?: Row[];
  rowCount?: number;
  raw?: unknown;
  durationMs?: number;
  warning?: boolean;
  hint?: string;
}

interface MigrationStepResult {
  sql: string;
  ok: boolean;
  error?: string;
}

interface MigrationResult {
  ok: boolean;
  total: number;
  passed: number;
  failed: number;
  results: MigrationStepResult[];
  error?: string;
}

function classifyPgError(message: string | undefined): { warning: boolean; hint: string } | null {
  if (!message) return null;
  const value = message.toLowerCase();
  if (/auth\.jwt|auth\.uid|\b42883\b/.test(value)) {
    return {
      warning: true,
      hint: 'La consulta usa helpers exclusivos de Supabase. En InsForge elimina auth.jwt()/auth.uid() y usa el esquema de aislamiento propio de Fabrick.',
    };
  }
  if (/already exists/.test(value) || /\b42p07\b/.test(value) || /\b42710\b/.test(value)) {
    return {
      warning: true,
      hint: 'El objeto ya existe. Usa sentencias idempotentes como CREATE ... IF NOT EXISTS o ALTER ... ADD COLUMN IF NOT EXISTS.',
    };
  }
  if (/does not exist/.test(value) || /\b42p01\b/.test(value) || /\b42703\b/.test(value)) {
    return {
      warning: true,
      hint: 'La tabla o columna referenciada no existe. Verifica el esquema o utiliza Configuración inicial para crear lo que falta.',
    };
  }
  return null;
}

function extractRows(data: unknown): Row[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.rows)) return record.rows as Row[];
  if (record.data && typeof record.data === 'object') {
    const inner = record.data as Record<string, unknown>;
    if (Array.isArray(inner.rows)) return inner.rows as Row[];
  }
  if (Array.isArray(record.result)) return record.result as Row[];
  return [];
}

function stringifyCell(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function SqlTerminalPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationArmed, setMigrationArmed] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const columns = useMemo(() => result?.rows?.[0] ? Object.keys(result.rows[0]) : [], [result]);

  const runQuery = useCallback(async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    const started = performance.now();
    try {
      const response = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await response.json().catch(() => ({}));
      const rows = extractRows(json.data);
      const rawError = json.ok ? undefined : String(json.error ?? json.data?.error ?? `HTTP ${response.status}`);
      const classified = json.ok ? null : classifyPgError(rawError);
      setResult({
        ok: Boolean(json.ok),
        status: json.status ?? response.status,
        error: rawError,
        rows,
        rowCount: rows.length,
        raw: json.data,
        durationMs: Math.round(performance.now() - started),
        warning: Boolean(classified?.warning),
        hint: classified?.hint,
      });
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Error de red.',
        durationMs: Math.round(performance.now() - started),
      });
    } finally {
      setRunning(false);
    }
  }, [query, running]);

  const runMigration = useCallback(async () => {
    if (!migrationArmed || migrating) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const response = await fetch('/api/admin/sql/migration', { method: 'POST' });
      const json = await response.json().catch(() => ({})) as MigrationResult;
      setMigrationResult({
        ok: Boolean(json.ok),
        total: Number(json.total ?? 0),
        passed: Number(json.passed ?? 0),
        failed: Number(json.failed ?? (response.ok ? 0 : 1)),
        results: Array.isArray(json.results) ? json.results : [],
        error: json.error,
      });
      if (response.ok && json.ok) setMigrationArmed(false);
    } catch (error) {
      setMigrationResult({
        ok: false,
        total: 0,
        passed: 0,
        failed: 1,
        results: [],
        error: error instanceof Error ? error.message : 'No se pudo ejecutar la migración.',
      });
    } finally {
      setMigrating(false);
    }
  }, [migrationArmed, migrating]);

  function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void runQuery();
    }
  }

  async function copyResult() {
    if (!result) return;
    const payload = result.rows?.length ? result.rows : result.raw ?? result.error ?? '';
    await navigator.clipboard.writeText(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Base de datos"
        title="Terminal SQL"
        description="Herramienta Root para diagnóstico y mantenimiento controlado de InsForge. La ejecución SQL está restringida a superadmin."
        icon={Terminal}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/setup" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-black text-[#625b50] transition hover:bg-white">
              <Wrench className="h-4 w-4" /> Configuración inicial
            </Link>
            <button
              type="button"
              onClick={() => void runQuery()}
              disabled={running || !query.trim()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Ejecutando…' : 'Ejecutar'}
            </button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Acceso" value="Root" icon={ShieldCheck} accent="emerald" />
        <AdminStat label="Filas" value={result?.rowCount ?? '—'} icon={Table2} />
        <AdminStat label="Duración" value={result?.durationMs != null ? `${result.durationMs} ms` : '—'} icon={RefreshCw} accent="cyan" />
        <AdminStat label="Estado" value={result ? (result.ok ? 'OK' : result.warning ? 'Aviso' : 'Error') : 'Listo'} icon={Database} accent={result?.ok ? 'emerald' : result?.warning ? undefined : result ? 'rose' : undefined} />
      </section>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Consultas seguras</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Atajos de diagnóstico</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setQuery(item.sql);
                  setResult(null);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-[11px] font-bold text-[#625b50] transition hover:bg-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]">
          <div className="border-b border-black/8 p-4 xl:border-b-0 xl:border-r sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#514b42]">Editor SQL</span>
              <span className="text-[10px] text-[#8f887c]">Ctrl/Cmd + Enter</span>
            </div>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onEditorKeyDown}
              spellCheck={false}
              className="min-h-[390px] w-full resize-y rounded-2xl border border-black/10 bg-[#171612] p-4 font-mono text-[12px] leading-6 text-[#f5efe5] outline-none transition focus:border-[#ffb000]/55"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-5 text-[#8f887c]">No se incluyen atajos que desactiven RLS o aislamiento de tenants.</p>
              <button
                type="button"
                onClick={() => { setQuery(DEFAULT_QUERY); setResult(null); }}
                className="rounded-xl border border-black/10 bg-white/55 px-3 py-2 text-xs font-bold text-[#625b50]"
              >
                Restaurar consulta
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#514b42]">Resultado</span>
              {result ? (
                <button type="button" onClick={() => void copyResult()} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8a620f]">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              ) : null}
            </div>

            {!result ? (
              <div className="grid min-h-[390px] place-items-center rounded-2xl border border-dashed border-black/10 bg-white/35 p-6 text-center">
                <div className="max-w-sm">
                  <Terminal className="mx-auto h-7 w-7 text-[#c77a00]" />
                  <h3 className="mt-3 text-sm font-black text-[#171612]">Esperando consulta</h3>
                  <p className="mt-2 text-xs leading-5 text-[#817a6f]">El resultado aparecerá aquí sin mezclar el editor técnico con el resto del panel.</p>
                </div>
              </div>
            ) : (
              <div className="min-h-[390px] overflow-hidden rounded-2xl bg-[#171612] text-[#f5efe5]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#bdb5a9]">
                  <span>{result.ok ? 'Consulta completada' : result.warning ? 'Consulta con aviso' : 'Consulta fallida'}</span>
                  <span>{result.durationMs ?? 0} ms</span>
                </div>
                <div className="max-h-[430px] overflow-auto p-3">
                  {result.error ? (
                    <div className={`rounded-xl border p-3 text-xs leading-5 ${result.warning ? 'border-amber-400/25 bg-amber-400/8 text-amber-100' : 'border-rose-400/25 bg-rose-400/8 text-rose-100'}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-mono break-words">{result.error}</p>
                          {result.hint ? <p className="mt-2 text-[11px] opacity-80">{result.hint}</p> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {result.rows?.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-[11px]">
                        <thead className="text-[#aaa294]">
                          <tr>{columns.map((column) => <th key={column} className="border-b border-white/10 px-3 py-2 font-black">{column}</th>)}</tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, index) => (
                            <tr key={index} className="border-b border-white/5 last:border-0">
                              {columns.map((column) => <td key={column} className="max-w-[320px] px-3 py-2 font-mono align-top text-[#eee7dc]">{stringifyCell(row[column])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : result.ok ? (
                    <div className="flex items-center gap-2 px-2 py-4 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Operación completada sin filas de respuesta.</div>
                  ) : null}

                  {!result.rows?.length && result.raw && !result.error ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#d8d0c4]">{JSON.stringify(result.raw, null, 2)}</pre>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminCard>

      <AdminCard className="p-0 sm:p-0">
        <button
          type="button"
          onClick={() => setMigrationOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Operación avanzada</p>
            <h2 className="mt-1 text-lg font-black text-[#171612]">Migración multi-tenant SaaS</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">Solo Root. Ejecuta cambios estructurales idempotentes en el esquema.</p>
          </div>
          <Rocket className="h-5 w-5 text-[#a56600]" />
        </button>

        {migrationOpen ? (
          <div className="border-t border-black/8 p-4 sm:p-5">
            <div className="rounded-xl border border-amber-600/15 bg-amber-500/8 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <strong className="font-black">Cambio estructural de base de datos.</strong>
                  <p className="mt-1 text-xs leading-5">Revisa backups y estado del esquema antes de ejecutarlo. El endpoint está restringido a superadmin.</p>
                </div>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3 text-sm text-[#514b42]">
              <input type="checkbox" checked={migrationArmed} onChange={(event) => setMigrationArmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171612]" />
              <span>Confirmo que revisé el estado de la base y quiero habilitar la ejecución de la migración.</span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runMigration()}
                disabled={!migrationArmed || migrating}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40"
              >
                {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {migrating ? 'Migrando…' : 'Ejecutar migración'}
              </button>
              <Link href="/admin/estado" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/55 px-4 text-xs font-bold text-[#625b50]">Revisar estado</Link>
            </div>

            {migrationResult ? (
              <div className={`mt-4 rounded-xl border p-4 ${migrationResult.ok ? 'border-emerald-600/15 bg-emerald-500/8 text-emerald-900' : 'border-rose-600/15 bg-rose-500/8 text-rose-900'}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  {migrationResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {migrationResult.ok ? 'Migración completada' : 'Migración con fallos'}
                </div>
                <p className="mt-1 text-xs">{migrationResult.passed}/{migrationResult.total} sentencias correctas · {migrationResult.failed} fallidas.</p>
                {migrationResult.error ? <p className="mt-2 text-xs">{migrationResult.error}</p> : null}
                {migrationResult.results.length ? (
                  <div className="mt-3 max-h-48 overflow-auto divide-y divide-black/8 text-[11px]">
                    {migrationResult.results.map((step, index) => (
                      <div key={`${index}-${step.sql}`} className="flex items-start gap-2 py-2">
                        {step.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                        <span className="font-mono break-words">{step.sql}{step.error ? ` — ${step.error}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminCard>
    </AdminPage>
  );
}
