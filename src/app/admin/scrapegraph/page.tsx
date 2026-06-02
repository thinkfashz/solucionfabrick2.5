'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Globe,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ──────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────── */
type Mode = 'smart' | 'search' | 'batch';

type StatusKind = 'idle' | 'running' | 'done' | 'error';

interface Step {
  text: string;
  ts: number;
}

interface ResultData {
  data: unknown;
  provider: string;
  modelo: string;
  duration_ms: number;
}

interface ProviderModel {
  id: string;
  name: string;
  free: boolean;
}

interface ProviderResult {
  id: string;
  label: string;
  configured: boolean;
  models: ProviderModel[];
}

interface RunEntry {
  id: number;
  mode: Mode;
  input: { url?: string; query?: string; urls?: string[]; prompt?: string };
  result: unknown;
  model: string | null;
  provider: string | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

type SseEvent =
  | { type: 'progress'; step: string }
  | { type: 'screenshot'; b64: string; url: string }
  | { type: 'result'; data: unknown; provider: string; modelo: string; duration_ms: number }
  | { type: 'error'; message: string }
  | { type: 'done' };

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

// AI provider models (mirrors ia-config page)
const PROVIDER_MODELS: Record<string, ProviderModel[]> = {
  anthropic: [
    { id: 'claude-opus-4-8', name: 'Opus 4.8', free: false },
    { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', free: false },
    { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', free: false },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', free: true },
    { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B Instant', free: true },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', free: true },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', free: true },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'LLaMA 3.3 70B', free: true },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', free: true },
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1', free: true },
    { id: 'anthropic/claude-haiku-4', name: 'Claude Haiku 4', free: false },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', free: false },
    { id: 'gpt-4o', name: 'GPT-4o', free: false },
    { id: 'o3-mini', name: 'o3 mini', free: false },
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', free: true },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false },
  ],
  grok: [
    { id: 'grok-2-1212', name: 'Grok 2', free: false },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', free: false },
    { id: 'grok-beta', name: 'Grok Beta', free: false },
  ],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  grok: 'xAI Grok',
};

/* ──────────────────────────────────────────────────────────────────────
   Utility functions
──────────────────────────────────────────────────────────────────────── */
function jsonToCSV(data: unknown[]): string {
  if (!data.length) return '';
  const keys = [...new Set(data.flatMap((item) => Object.keys(item as Record<string, unknown>)))];
  const rows = data.map((item) =>
    keys
      .map((k) => {
        const v = (item as Record<string, unknown>)[k];
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(','),
  );
  return [keys.join(','), ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(dt: string) {
  try {
    return new Date(dt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return dt;
  }
}

/* ──────────────────────────────────────────────────────────────────────
   Status chip
──────────────────────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<StatusKind, string> = {
  idle: 'bg-zinc-800 text-zinc-400',
  running: 'bg-amber-400/20 text-amber-400 animate-pulse',
  done: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<StatusKind, string> = {
  idle: 'En reposo',
  running: 'Navegando',
  done: '✓ Listo',
  error: 'Error',
};

function StatusChip({ status }: { status: StatusKind }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Mode badge
──────────────────────────────────────────────────────────────────────── */
const MODE_COLORS: Record<Mode, string> = {
  smart: 'bg-yellow-400/15 text-yellow-400',
  search: 'bg-blue-500/15 text-blue-400',
  batch: 'bg-purple-500/15 text-purple-400',
};

/* ──────────────────────────────────────────────────────────────────────
   Provider selector
──────────────────────────────────────────────────────────────────────── */
function ProviderSelector({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
}: {
  providers: ProviderResult[];
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
}) {
  const configuredProviders = providers.filter((p) => p.configured);
  const currentModels =
    selectedProvider !== 'auto'
      ? (PROVIDER_MODELS[selectedProvider] ?? configuredProviders.find((p) => p.id === selectedProvider)?.models ?? [])
      : [];

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
        Proveedor IA
      </label>
      <select
        value={selectedProvider}
        onChange={(e) => {
          const p = e.target.value;
          onProviderChange(p);
          // Reset model to first available
          const models = p !== 'auto' ? (PROVIDER_MODELS[p] ?? []) : [];
          onModelChange(models[0]?.id ?? '');
        }}
        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
      >
        <option value="auto">Auto (configuración actual)</option>
        {configuredProviders.length > 0 && (
          <optgroup label="Proveedores configurados">
            {configuredProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label || PROVIDER_LABELS[p.id] || p.id}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {selectedProvider !== 'auto' && currentModels.length > 0 && (
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
        >
          {currentModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.free ? ' (gratis)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Live Preview
──────────────────────────────────────────────────────────────────────── */
function LivePreview({
  screenshot,
  currentUrl,
  status,
}: {
  screenshot: string | null;
  currentUrl: string;
  status: StatusKind;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-bold text-white">Vista Previa en Vivo</span>
        </div>
        <StatusChip status={status} />
      </div>

      <div className="relative min-h-[280px] max-h-[400px] overflow-hidden bg-black/40">
        {screenshot ? (
          <img
            src={`data:image/jpeg;base64,${screenshot}`}
            alt="Browser preview"
            className="w-full object-contain rounded-b-none"
          />
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <Globe className="h-12 w-12 text-zinc-700" />
            <p className="text-xs text-zinc-600">Aquí aparecerá la vista previa del navegador</p>
          </div>
        )}
      </div>

      {currentUrl && (
        <div className="border-t border-white/10 px-4 py-2 flex items-center gap-2">
          <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
          <p className="truncate text-[10px] text-zinc-500">{currentUrl}</p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Step log
──────────────────────────────────────────────────────────────────────── */
function StepLog({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [steps]);

  if (!steps.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
      <div className="border-b border-white/10 px-4 py-2.5 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />
        <span className="text-xs font-bold text-white">Progreso</span>
      </div>
      <div ref={ref} className="max-h-36 overflow-y-auto px-4 py-2 space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400/60" />
            <p className="flex-1 text-[11px] text-zinc-400 leading-relaxed">{step.text}</p>
            <span className="shrink-0 text-[10px] text-zinc-700">
              {new Date(step.ts).toLocaleTimeString('es-CL', { timeStyle: 'medium' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Results panel
──────────────────────────────────────────────────────────────────────── */
function ResultsPanel({ result }: { result: ResultData }) {
  const [copied, setCopied] = useState(false);
  const jsonText = JSON.stringify(result.data, null, 2);
  const isArray = Array.isArray(result.data);
  const count = isArray ? (result.data as unknown[]).length : null;

  const PROVIDER_COLORS: Record<string, string> = {
    openrouter: 'bg-purple-500/20 text-purple-300',
    groq: 'bg-rose-500/20 text-rose-300',
    openai: 'bg-green-500/20 text-green-300',
    gemini: 'bg-blue-500/20 text-blue-300',
    grok: 'bg-violet-500/20 text-violet-300',
    anthropic: 'bg-amber-500/20 text-amber-300',
  };

  async function copy() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCSV() {
    if (!isArray) return;
    const csv = jsonToCSV(result.data as unknown[]);
    downloadFile(csv, `scrapegraph-${Date.now()}.csv`, 'text/csv');
  }

  function downloadJSON() {
    downloadFile(jsonText, `scrapegraph-${Date.now()}.json`, 'application/json');
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span className="font-black text-white text-sm">Resultado</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PROVIDER_COLORS[result.provider] ?? 'bg-zinc-800 text-zinc-400'}`}>
          {result.provider}
        </span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
          {result.modelo}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
          <Clock className="h-3 w-3" />
          {(result.duration_ms / 1000).toFixed(1)}s
        </span>
        {count !== null && (
          <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
            {count} items
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
        >
          {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiado' : 'Copiar JSON'}
        </button>
        {isArray && (
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
          >
            <FileJson className="h-3 w-3" />
            Exportar CSV
          </button>
        )}
        <button
          type="button"
          onClick={downloadJSON}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
        >
          <Download className="h-3 w-3" />
          Descargar JSON
        </button>
      </div>

      <pre className="max-h-96 overflow-auto bg-black/40 p-4 text-[11px] leading-relaxed text-zinc-300 font-mono">
        {jsonText}
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
  open,
  onToggle,
  onRefresh,
  onLoad,
  onDelete,
}: {
  runs: RunEntry[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onLoad: (run: RunEntry) => void;
  onDelete: (id: number) => void;
}) {
  function label(run: RunEntry) {
    if (run.input.url) return run.input.url;
    if (run.input.query) return run.input.query;
    if (run.input.urls?.length) return `${run.input.urls.length} URLs`;
    return '—';
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-zinc-500" />
          <span className="font-black text-white text-sm">Historial</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{runs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="text-zinc-600 hover:text-zinc-400"
            title="Actualizar"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10">
          {runs.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Database className="h-8 w-8 text-zinc-700" />
              <p className="text-xs text-zinc-600">Sin ejecuciones aún</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-0.5 p-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="group flex cursor-pointer items-start gap-2 rounded-xl border border-white/5 p-2.5 hover:bg-white/5 transition"
                  onClick={() => onLoad(run)}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${MODE_COLORS[run.mode]}`}>
                    {run.mode}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-zinc-300">{label(run)}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {run.provider && (
                        <span className="text-[9px] font-bold text-zinc-500">{run.provider}</span>
                      )}
                      {run.duration_ms !== null && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                          <Clock className="h-2.5 w-2.5" />
                          {(run.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-700">{formatDate(run.created_at)}</span>
                      {run.error && <AlertTriangle className="h-2.5 w-2.5 text-red-400" />}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(run.id); }}
                    className="rounded-lg p-1 text-zinc-700 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────────────────────── */
export default function ScrapeGraphPage() {
  // Form state
  const [mode, setMode] = useState<Mode>('smart');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schema, setSchema] = useState('');
  const [pages, setPages] = useState('3');

  // Provider state
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableProviders, setAvailableProviders] = useState<ProviderResult[]>([]);

  // Execution state
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Computed status
  const status: StatusKind = running ? 'running' : error ? 'error' : result ? 'done' : 'idle';

  /* ── Load available providers ── */
  useEffect(() => {
    void loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
      if (!res.ok) return;
      type FieldStatus = { set: boolean; preview: string; source?: string; envVar?: string };
      type ProviderEntry = { credentials: Record<string, FieldStatus>; updated_at?: string; encrypted?: boolean; envManaged?: boolean };
      const data = await res.json() as { providers?: Record<string, ProviderEntry> };
      // A provider is "configured" if it has api_key set
      const knownProviders: ProviderResult[] = Object.entries(PROVIDER_LABELS).map(([id, label]) => {
        const entry = data.providers?.[id];
        const hasKey = entry?.credentials?.['api_key']?.set === true;
        return {
          id,
          label,
          configured: hasKey,
          models: PROVIDER_MODELS[id] ?? [],
        };
      });
      setAvailableProviders(knownProviders);
    } catch {
      // Use static list as fallback (all unconfigured)
      const knownProviders: ProviderResult[] = Object.entries(PROVIDER_LABELS).map(([id, label]) => ({
        id,
        label,
        configured: false,
        models: PROVIDER_MODELS[id] ?? [],
      }));
      setAvailableProviders(knownProviders);
    }
  }

  /* ── Load history ── */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/scrapegraph');
      if (res.ok) {
        const data = await res.json() as { runs: RunEntry[] };
        setRuns((data.runs ?? []).slice(0, 20));
      }
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  /* ── Execute via SSE ── */
  async function execute() {
    setRunning(true);
    setSteps([]);
    setScreenshot(null);
    setCurrentUrl('');
    setResult(null);
    setError(null);

    const body: Record<string, unknown> = {
      mode,
      prompt,
      provider: selectedProvider,
      modelo: selectedModel,
    };
    if (mode === 'smart') {
      body.url = url;
      if (schema.trim()) body.outputSchema = schema;
    }
    if (mode === 'search') {
      body.query = query;
      body.maxPages = Number(pages);
    }
    if (mode === 'batch') {
      body.urls = batchUrls.split('\n').map((s) => s.trim()).filter(Boolean);
    }

    try {
      const res = await fetch('/api/admin/scrapegraph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        setError('Error de red al conectar con el servidor');
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim()) as SseEvent;
            if (evt.type === 'progress') {
              setSteps((prev) => [...prev, { text: evt.step, ts: Date.now() }]);
            } else if (evt.type === 'screenshot') {
              setScreenshot(evt.b64);
              setCurrentUrl(evt.url);
            } else if (evt.type === 'result') {
              setResult({ data: evt.data, provider: evt.provider, modelo: evt.modelo, duration_ms: evt.duration_ms });
              void loadHistory();
            } else if (evt.type === 'error') {
              setError(evt.message);
            } else if (evt.type === 'done') {
              done = true;
              break;
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setRunning(false);
    }
  }

  /* ── History actions ── */
  async function deleteRun(id: number) {
    await fetch(`/api/admin/scrapegraph?id=${id}`, { method: 'DELETE' });
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }

  function loadFromHistory(run: RunEntry) {
    setMode(run.mode);
    setPrompt(run.input.prompt ?? '');
    if (run.mode === 'smart' && run.input.url) setUrl(run.input.url);
    if (run.mode === 'search' && run.input.query) setQuery(run.input.query);
    if (run.mode === 'batch' && run.input.urls) setBatchUrls(run.input.urls.join('\n'));
    if (run.result) {
      setResult({
        data: run.result,
        provider: run.provider ?? '',
        modelo: run.model ?? '',
        duration_ms: run.duration_ms ?? 0,
      });
    }
  }

  function applyExample(ex: { label: string; prompt: string; input?: string }) {
    setPrompt(ex.prompt);
    if (mode === 'smart' && ex.input) setUrl(ex.input);
  }

  const canExecute =
    !running &&
    prompt.trim().length > 0 &&
    (mode === 'smart' ? !!url.trim() : mode === 'search' ? !!query.trim() : !!batchUrls.trim());

  /* ──────────────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────────────── */
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="ScrapeGraph IA"
        description="Extrae datos estructurados de cualquier web rápido (Edge/Cheerio) + LLM. Vista de logs en tiempo real."
        icon={Cpu}
        actions={
          <a
            href="https://github.com/ScrapeGraphAI/Scrapegraph-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
          >
            <Brain className="h-3.5 w-3.5" />
            ScrapeGraphAI
            <ExternalLink className="h-3 w-3" />
          </a>
        }
      />

      <AdminMotion>
        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => setError(null)} className="text-zinc-600 hover:text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main grid: left form + right live panel */}
        <div className="grid gap-5 lg:grid-cols-[400px_1fr]">

          {/* ── LEFT PANEL: Form ───────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <AdminCard>
              {/* Mode tabs */}
              <div className="mb-5 flex gap-1 rounded-2xl border border-white/10 bg-black/30 p-1">
                {MODE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setMode(tab.id); setResult(null); setError(null); }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition ${
                      mode === tab.id
                        ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/20'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
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
                      Schema JSON{' '}
                      <span className="font-normal normal-case text-zinc-700">(opcional)</span>
                    </label>
                    <textarea
                      value={schema}
                      onChange={(e) => setSchema(e.target.value)}
                      rows={2}
                      placeholder={'{"name": "string", "price": "number", "category": "string"}'}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-zinc-300 placeholder-zinc-700 outline-none focus:border-yellow-400/40"
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
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                      URLs{' '}
                      <span className="font-normal normal-case text-zinc-600">(una por línea)</span>
                    </label>
                    <textarea
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      rows={5}
                      placeholder={'https://www.easy.cl\nhttps://www.sodimac.cl\nhttps://www.leroymerlin.cl'}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-white placeholder-zinc-700 outline-none focus:border-yellow-400/40"
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

              {/* Provider selector */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <ProviderSelector
                  providers={availableProviders}
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setSelectedProvider}
                  onModelChange={setSelectedModel}
                />
              </div>

              {/* Example prompts */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Ejemplos rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES[mode].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyExample(ex)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500 transition hover:border-yellow-400/30 hover:text-zinc-300"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Execute button */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => void execute()}
                  disabled={!canExecute}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3 font-black text-black transition hover:bg-yellow-300 disabled:opacity-40"
                >
                  {running ? (
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
                <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-700">
                  <Zap className="h-3 w-3 text-yellow-400/50" />
                  <span>
                    Extracción IA ·{' '}
                    <a href="/admin/integraciones" className="text-yellow-400/70 underline-offset-2 hover:text-yellow-400 hover:underline">
                      Integraciones
                    </a>
                  </span>
                </div>
              </div>
            </AdminCard>

            {/* How-to hint card */}
            <AdminCard>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-black text-white">Cómo funciona</span>
              </div>
              <div className="space-y-2 text-[11px] text-zinc-500 leading-relaxed">
                <div className="flex items-start gap-2">
                  <Bot className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-400/60" />
                  <span><strong className="text-zinc-400">Smart:</strong> Lee la URL y extrae datos estructurados con IA</span>
                </div>
                <div className="flex items-start gap-2">
                  <Search className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400/60" />
                  <span><strong className="text-zinc-400">Search:</strong> Busca en Google/DuckDuckGo y analiza los primeros N resultados</span>
                </div>
                <div className="flex items-start gap-2">
                  <Layers className="h-3.5 w-3.5 mt-0.5 shrink-0 text-purple-400/60" />
                  <span><strong className="text-zinc-400">Batch:</strong> Procesa múltiples URLs con el mismo prompt</span>
                </div>
                <div className="flex items-start gap-2">
                  <Code2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-400/60" />
                  <span>Los screenshots en vivo muestran el navegador mientras trabaja</span>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* ── RIGHT PANEL: Live preview + Steps + Results + History ── */}
          <div className="flex flex-col gap-4">
            {/* Live browser preview */}
            <LivePreview
              screenshot={screenshot}
              currentUrl={currentUrl}
              status={status}
            />

            {/* Step log */}
            {steps.length > 0 && <StepLog steps={steps} />}

            {/* Results panel */}
            {result !== null && <ResultsPanel result={result} />}

            {/* History panel (collapsible) */}
            <HistoryPanel
              runs={runs}
              loading={historyLoading}
              open={historyOpen}
              onToggle={() => setHistoryOpen((v) => !v)}
              onRefresh={() => void loadHistory()}
              onLoad={loadFromHistory}
              onDelete={(id) => void deleteRun(id)}
            />
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
