'use client';

import { useCallback, useRef, useState } from 'react';
import { Play, RotateCcw, Copy, ChevronDown, ChevronUp, Database } from 'lucide-react';

const QUICK_QUERIES = [
  { label: 'Ver tablas', sql: `SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size\nFROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;` },
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

export default function SqlTerminalPage() {
  const [query, setQuery] = useState('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setResult({
        ok: json.ok,
        status: json.status,
        error: json.ok ? undefined : (json.error ?? JSON.stringify(json.data)),
        rows,
        rowCount: rows.length,
        raw: json.data,
        durationMs: Date.now() - t0,
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
        <button
          onClick={() => setShowQuick(!showQuick)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          Consultas rápidas
          {showQuick ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

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
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
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
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: '#facc15', color: '#000' }}
              >
                <Play className="w-3 h-3" />
                {running ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="flex-1 px-4 pb-4 overflow-auto">
          <div className={`rounded-xl border overflow-hidden ${result.ok ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            {/* Result header */}
            <div className={`px-4 py-2 flex items-center justify-between text-xs ${result.ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
              <span>
                {result.ok
                  ? `${result.rowCount ?? 0} fila${result.rowCount !== 1 ? 's' : ''} · ${result.durationMs}ms`
                  : `Error · ${result.durationMs}ms`}
              </span>
              {result.ok && result.rows && result.rows.length > 0 && (
                <button onClick={copyResult} className="flex items-center gap-1 hover:text-white transition-colors">
                  <Copy className="w-3 h-3" />
                  Copiar JSON
                </button>
              )}
            </div>

            {/* Error */}
            {!result.ok && (
              <div className="p-4 bg-red-950/20">
                <code className="text-red-300 text-xs break-all">{result.error}</code>
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
