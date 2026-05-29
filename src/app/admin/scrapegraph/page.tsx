'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Clock,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileJson,
  Globe,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ──────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────── */
type Mode = 'smart' | 'search' | 'batch';

interface RunEntry {
  id: number;
  mode: Mode;
  input: { url?: string; query?: string; urls?: string[]; prompt?: string };
  result: unknown;
  model: string | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

interface ScrapeResponse {
  ok: boolean;
  mode: Mode;
  result: unknown;
  model: string;
  provider: string;
  duration_ms: number;
  error?: string;
}

/* ──────────────────────────────────────────────────────────────────────
   Constants
──────────────────────────────────────────────────────────────────────── */
const MODE_TABS: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'smart', label: 'Smart Scraper', icon: Cpu },
  { id: 'search', label: 'Search Scraper', icon: Search },
  { id: 'batch', label: 'Batch Scraper', icon: Layers },
];

const EXAMPLES: Record<Mode, { label: string; prompt: string; input?: string }[]> = {
  smart: [
    { label: 'Precios Easy.cl', input: 'https://www.easy.cl', prompt: 'Extrae los productos destacados con nombre, precio y categoría como array JSON' },
    { label: 'Competidor MDF', input: 'https://www.sodimac.cl', prompt: 'Extrae listados de madera y MDF: nombre, precio por unidad, dimensiones' },
    { label: 'Proveedor', input: '', prompt: 'Extrae el listado de productos con SKU, nombre, precio y stock disponible' },
  ],
  search: [
    { label: 'Precios materiales', prompt: 'Extrae precio por m², marca, dimensión y tienda de cada resultado' },
    { label: 'Competidores', prompt: 'Extrae nombre empresa, servicios que ofrece y rango de precios' },
    { label: 'Proveedores', prompt: 'Extrae nombre proveedor, productos principales, contacto y ubicación' },
  ],
  batch: [
    { label: 'Comparar tiendas', prompt: 'Extrae productos destacados con nombre, precio y disponibilidad' },
    { label: 'Análisis competidores', prompt: 'Extrae nombre empresa, propuesta de valor y precios principales' },
    { label: 'Directorios', prompt: 'Extrae nombre, descripción, precio y contacto de cada empresa listada' },
  ],
};

/* ──────────────────────────────────────────────────────────────────────
   JSON Viewer
──────────────────────────────────────────────────────────────────────── */
function JsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isArray = Array.isArray(data);
  const count = isArray ? (data as unknown[]).length : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileJson className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-xs font-bold text-white">Resultado JSON</span>
          {count !== null && (
            <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
              {count} items
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
        >
          {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto bg-black/40 p-4 text-[11px] leading-relaxed text-zinc-300 font-mono">
        {text}
      </pre>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   History panel
──────────────────────────────────────────────────────────────────────── */
function HistoryPanel({
  runs,
  loading,
  onRefresh,
  onLoad,
  onDelete,
  onClearAll,
}: {
  runs: RunEntry[];
  loading: boolean;
  onRefresh: () => void;
  onLoad: (run: RunEntry) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}) {
  function label(run: RunEntry) {
    if (run.input.url) return run.input.url;
    if (run.input.query) return run.input.query;
    if (run.input.urls?.length) return `${run.input.urls.length} URLs`;
    return '—';
  }

  const MODE_COLORS: Record<Mode, string> = {
    smart: 'bg-yellow-400/15 text-yellow-400',
    search: 'bg-blue-500/15 text-blue-400',
    batch: 'bg-purple-500/15 text-purple-400',
  };

  function formatDate(dt: string) {
    try { return new Date(dt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return dt; }
  }

  return (
    <AdminCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <h2 className="font-black text-white text-sm">Historial</h2>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{runs.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {runs.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-bold text-red-400/70 hover:text-red-400"
            >
              Limpiar todo
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="text-zinc-600 hover:text-zinc-400"
            title="Actualizar"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {runs.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Database className="h-8 w-8 text-zinc-700" />
          <p className="text-xs text-zinc-600">Sin ejecuciones aún</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {runs.map((run) => (
            <div
              key={run.id}
              className="group flex items-start gap-2 rounded-xl border border-white/8 p-2.5 hover:bg-white/5 cursor-pointer transition"
              onClick={() => onLoad(run)}
            >
              <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0 ${MODE_COLORS[run.mode]}`}>
                {run.mode}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-zinc-300">{label(run)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {run.duration_ms && (
                    <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                      <Clock className="h-2.5 w-2.5" />{(run.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-700">{formatDate(run.created_at)}</span>
                  {run.error && <AlertTriangle className="h-2.5 w-2.5 text-red-400" />}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(run.id); }}
                className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   How-to card
──────────────────────────────────────────────────────────────────────── */
function HowToCard() {
  const [open, setOpen] = useState<Mode>('smart');

  const CONTENT: Record<Mode, { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; examples: string[] }> = {
    smart: {
      icon: Cpu,
      title: 'Smart Scraper',
      desc: 'Extrae datos estructurados de una URL específica con un prompt en lenguaje natural.',
      examples: [
        '"Extrae todos los productos con nombre y precio"',
        '"Dame el listado de servicios con descripción y valor"',
        '"Encuentra el email y teléfono de contacto"',
      ],
    },
    search: {
      icon: Search,
      title: 'Search Scraper',
      desc: 'Busca en Google/DuckDuckGo y extrae datos de los primeros N resultados.',
      examples: [
        'Query: "muebles cocina chile precio 2025"',
        'Query: "empresas pisos laminados Santiago"',
        'Query: "proveedores MDF Chile mayorista"',
      ],
    },
    batch: {
      icon: Layers,
      title: 'Batch Scraper',
      desc: 'Procesa múltiples URLs con el mismo prompt. Ideal para comparar.',
      examples: [
        'Comparar precios entre Easy, Sodimac y Leroy Merlin',
        'Analizar 5 competidores a la vez',
        'Monitorear múltiples proveedores',
      ],
    },
  };

  const info = CONTENT[open];

  return (
    <AdminCard>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-yellow-400" />
        <h2 className="font-black text-white text-sm">Cómo usar</h2>
      </div>

      <div className="mb-3 flex gap-1">
        {(Object.keys(CONTENT) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setOpen(m)}
            className={`flex-1 rounded-xl py-1.5 text-[10px] font-bold transition ${
              open === m ? 'bg-yellow-400/15 text-yellow-400' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <info.icon className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-bold text-white">{info.title}</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{info.desc}</p>
        <div className="space-y-1">
          {info.examples.map((ex, i) => (
            <p key={i} className="text-[10px] text-zinc-600 pl-2 border-l border-yellow-400/20">{ex}</p>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-yellow-400/15 bg-yellow-400/5 px-2.5 py-1.5">
          <Zap className="h-3 w-3 text-yellow-400" />
          <span className="text-[10px] text-yellow-400/80 font-bold">Powered by Playwright + IA</span>
        </div>
      </div>
    </AdminCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────────────────────── */
export default function ScrapeGraphPage() {
  const [mode, setMode] = useState<Mode>('smart');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schema, setSchema] = useState('');
  const [pages, setPages] = useState('3');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ScrapeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await fetch('/api/admin/scrapegraph');
      if (res.ok) {
        const data = await res.json() as { runs: RunEntry[] };
        setRuns(data.runs ?? []);
      }
    } catch { /* silent */ }
    finally { setRunsLoading(false); }
  }, []);

  useEffect(() => { void loadRuns(); }, [loadRuns]);

  async function execute() {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(mode === 'smart' ? 'Iniciando navegador…' : mode === 'search' ? 'Buscando en la web…' : 'Procesando URLs…');

    const body: Record<string, unknown> = { mode, prompt };
    if (mode === 'smart') { body.url = url; if (schema.trim()) body.outputSchema = schema; }
    if (mode === 'search') { body.query = query; body.maxPages = Number(pages); }
    if (mode === 'batch') { body.urls = batchUrls.split('\n').map((s) => s.trim()).filter(Boolean); }

    try {
      const res = await fetch('/api/admin/scrapegraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as ScrapeResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
      void loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  async function deleteRun(id: number) {
    await fetch(`/api/admin/scrapegraph?id=${id}`, { method: 'DELETE' });
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }

  async function clearAll() {
    for (const run of runs) {
      await fetch(`/api/admin/scrapegraph?id=${run.id}`, { method: 'DELETE' });
    }
    setRuns([]);
  }

  function loadFromHistory(run: RunEntry) {
    setMode(run.mode);
    setPrompt(run.input.prompt ?? '');
    if (run.mode === 'smart' && run.input.url) setUrl(run.input.url);
    if (run.mode === 'search' && run.input.query) setQuery(run.input.query);
    if (run.mode === 'batch' && run.input.urls) setBatchUrls(run.input.urls.join('\n'));
    if (run.result) {
      setResult({
        ok: !run.error,
        mode: run.mode,
        result: run.result,
        model: run.model ?? '',
        provider: '',
        duration_ms: run.duration_ms ?? 0,
      });
    }
  }

  function applyExample(ex: { label: string; prompt: string; input?: string }) {
    setPrompt(ex.prompt);
    if (mode === 'smart' && ex.input) setUrl(ex.input);
  }

  const canExecute =
    !loading &&
    prompt.trim() &&
    (mode === 'smart' ? !!url.trim() : mode === 'search' ? !!query.trim() : !!batchUrls.trim());

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="ScrapeGraph IA"
        description="Extrae datos estructurados de cualquier web usando Playwright + LLM. Inspirado en ScrapeGraphAI."
        icon={Cpu}
        actions={
          <a
            href="https://github.com/ScrapeGraphAI/Scrapegraph-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
          >
            <Brain className="h-3.5 w-3.5" />
            Ver ScrapeGraphAI
            <ExternalLink className="h-3 w-3" />
          </a>
        }
      />

      <AdminMotion>
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => setError(null)} className="text-zinc-600 hover:text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">

          {/* ── Left: configurator + result ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <AdminCard>
              {/* Mode tabs */}
              <div className="mb-5 flex gap-1 rounded-2xl border border-white/10 bg-black/30 p-1">
                {MODE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setMode(tab.id); setResult(null); setError(null); }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                      mode === tab.id
                        ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/20'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id}</span>
                  </button>
                ))}
              </div>

              {/* Smart Scraper form */}
              {mode === 'smart' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">URL</label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5">
                      <Globe className="h-4 w-4 shrink-0 text-zinc-600" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.easy.cl/productos/"
                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Prompt de extracción</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder="Extrae todos los productos con nombre, precio y categoría como array JSON"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-yellow-400/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Schema JSON <span className="text-zinc-700 normal-case font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={schema}
                      onChange={(e) => setSchema(e.target.value)}
                      rows={2}
                      placeholder={'{"name": "string", "price": "number", "category": "string"}'}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-[11px] font-mono text-zinc-300 placeholder-zinc-700 outline-none focus:border-yellow-400/40"
                    />
                  </div>
                </div>
              )}

              {/* Search Scraper form */}
              {mode === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Búsqueda</label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5">
                      <Search className="h-4 w-4 shrink-0 text-zinc-600" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="muebles cocina empotrada precio chile 2025"
                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Prompt de extracción</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder="Extrae nombre empresa, productos, precios y contacto de cada resultado"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-yellow-400/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Páginas a analizar</label>
                    <select
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none"
                    >
                      {['1', '2', '3', '5'].map((v) => (
                        <option key={v} value={v}>{v} página{v !== '1' ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Batch Scraper form */}
              {mode === 'batch' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">URLs <span className="text-zinc-600 normal-case font-normal">(una por línea)</span></label>
                    <textarea
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      rows={5}
                      placeholder={'https://www.easy.cl\nhttps://www.sodimac.cl\nhttps://www.leroymerlin.cl'}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-yellow-400/40 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {batchUrls.split('\n').filter((s) => s.trim()).length} URL(s) detectada(s)
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Prompt de extracción</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder="Extrae nombre, precios principales y propuesta de valor de cada sitio"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-yellow-400/40"
                    />
                  </div>
                </div>
              )}

              {/* Example prompts */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Ejemplos rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES[mode].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyExample(ex)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500 hover:border-yellow-400/30 hover:text-zinc-300 transition"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Execute button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => void execute()}
                  disabled={!canExecute}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3 font-black text-black disabled:opacity-40 hover:bg-yellow-300 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Ejecutar ScrapeGraph
                    </>
                  )}
                </button>
              </div>
            </AdminCard>

            {/* Progress */}
            {loading && progress && (
              <AdminCard>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{progress}</p>
                    <p className="text-xs text-zinc-500">Esto puede tomar 20-60 segundos…</p>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Result */}
            {result && !loading && (
              <AdminCard>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="font-black text-white">Resultado</span>
                  </div>
                  <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-400">{result.mode}</span>
                  {result.model && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{result.model}</span>
                  )}
                  {result.duration_ms > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                      <Clock className="h-3 w-3" />
                      {(result.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <JsonViewer data={result.result} />
              </AdminCard>
            )}
          </div>

          {/* ── Right: history + how-to ──────────────────────────────────── */}
          <div className="space-y-4">
            <HistoryPanel
              runs={runs}
              loading={runsLoading}
              onRefresh={() => void loadRuns()}
              onLoad={loadFromHistory}
              onDelete={(id) => void deleteRun(id)}
              onClearAll={() => void clearAll()}
            />
            <HowToCard />
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
