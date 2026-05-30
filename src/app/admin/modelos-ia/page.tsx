'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ModelEntry {
  id: string;
  name: string;
  free: boolean;
  contextLength?: number;
  description?: string;
}

interface ProviderResult {
  id: string;
  label: string;
  configured: boolean;
  error?: string;
  models: ModelEntry[];
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

interface ModelTest {
  status: TestStatus;
  latency?: number;
  response?: string;
  error?: string;
  errorType?: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const ERROR_LABELS: Record<string, { label: string; color: string }> = {
  auth:       { label: 'Clave inválida',  color: 'text-red-400    border-red-500/30    bg-red-900/20' },
  credits:    { label: 'Sin créditos',    color: 'text-orange-400 border-orange-500/30 bg-orange-900/20' },
  ratelimit:  { label: 'Rate limit',      color: 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20' },
  not_found:  { label: 'No disponible',   color: 'text-zinc-400   border-zinc-600/30   bg-zinc-800/20' },
  overloaded: { label: 'Sobrecargado',    color: 'text-amber-400  border-amber-500/30  bg-amber-900/20' },
  server:     { label: 'Error servidor',  color: 'text-red-400    border-red-500/30    bg-red-900/20' },
  timeout:    { label: 'Timeout',         color: 'text-amber-400  border-amber-500/30  bg-amber-900/20' },
  no_key:     { label: 'Sin API key',     color: 'text-zinc-500   border-zinc-600/30   bg-zinc-800/20' },
  other:      { label: 'Error',           color: 'text-red-400    border-red-500/30    bg-red-900/20' },
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'text-violet-300 border-violet-500/30 bg-violet-900/20',
  groq:       'text-emerald-300 border-emerald-500/30 bg-emerald-900/20',
  anthropic:  'text-orange-300 border-orange-500/30 bg-orange-900/20',
  openai:     'text-blue-300 border-blue-500/30 bg-blue-900/20',
  gemini:     'text-cyan-300 border-cyan-500/30 bg-cyan-900/20',
  grok:       'text-purple-300 border-purple-500/30 bg-purple-900/20',
};

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  groq:       'Groq',
  anthropic:  'Anthropic',
  openai:     'OpenAI',
  gemini:     'Gemini',
  grok:       'Grok (xAI)',
};

const PROVIDER_DOT_COLORS: Record<string, string> = {
  openrouter: 'bg-violet-400',
  groq:       'bg-emerald-400',
  anthropic:  'bg-orange-400',
  openai:     'bg-blue-400',
  gemini:     'bg-cyan-400',
  grok:       'bg-purple-400',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function providerDotStatus(p: ProviderResult): 'green' | 'red' | 'amber' {
  if (!p.configured) return 'red';
  if (p.error) return 'amber';
  if (p.models.length > 0) return 'green';
  return 'amber';
}

function formatCtx(n?: number): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ctx`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ctx`;
  return `${n} ctx`;
}

/* ─── Semaphore for concurrency control ─────────────────────────────────── */

function createSemaphore(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (queue.length > 0 && active < limit) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function acquire(): Promise<() => void> {
    if (active < limit) {
      active++;
      return () => { active--; next(); };
    }
    return new Promise((resolve) => {
      queue.push(() => {
        resolve(() => { active--; next(); });
      });
    });
  };
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ModelosIaPage() {
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [tests, setTests] = useState<Record<string, ModelTest>>({});
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [testingAll, setTestingAll] = useState(false);

  /* fetch models list */
  const fetchModels = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/modelos-ia/list', { cache: 'no-store' });
      const json = (await res.json()) as { ok: boolean; providers?: ProviderResult[]; error?: string };
      if (!res.ok || !json.ok) {
        setFetchError(json.error ?? 'Error al obtener modelos.');
        return;
      }
      setProviders(json.providers ?? []);
    } catch {
      setFetchError('Error de red al obtener modelos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchModels(); }, [fetchModels]);

  /* test one model */
  const testModel = useCallback(async (provider: string, modelo: string) => {
    const key = `${provider}:${modelo}`;
    setTests((prev) => ({ ...prev, [key]: { status: 'testing' } }));
    try {
      const res = await fetch('/api/admin/modelos-ia/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, modelo }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        latency_ms?: number;
        response?: string;
        error?: string;
        errorType?: string;
      };
      if (json.ok) {
        setTests((prev) => ({
          ...prev,
          [key]: { status: 'ok', latency: json.latency_ms, response: json.response },
        }));
      } else {
        setTests((prev) => ({
          ...prev,
          [key]: { status: 'error', latency: json.latency_ms, error: json.error, errorType: json.errorType },
        }));
      }
    } catch {
      setTests((prev) => ({ ...prev, [key]: { status: 'error', error: 'Error de red' } }));
    }
  }, []);

  /* test all visible */
  const testAllVisible = useCallback(async () => {
    const visibleModels: { provider: string; modelo: string }[] = [];
    for (const p of providers) {
      if (activeProvider !== 'all' && p.id !== activeProvider) continue;
      for (const m of p.models) {
        if (filter === 'free' && !m.free) continue;
        if (filter === 'paid' && m.free) continue;
        if (search && !m.id.toLowerCase().includes(search.toLowerCase()) && !m.name.toLowerCase().includes(search.toLowerCase())) continue;
        visibleModels.push({ provider: p.id, modelo: m.id });
      }
    }
    if (visibleModels.length === 0) return;
    setTestingAll(true);
    const sem = createSemaphore(5);
    await Promise.allSettled(
      visibleModels.map(async ({ provider, modelo }) => {
        const release = await sem();
        try {
          await testModel(provider, modelo);
        } finally {
          release();
        }
      }),
    );
    setTestingAll(false);
  }, [providers, activeProvider, filter, search, testModel]);

  /* derived: visible models */
  const visibleProviders = providers.filter(
    (p) => activeProvider === 'all' || p.id === activeProvider,
  );

  const visibleModels: { provider: ProviderResult; model: ModelEntry }[] = [];
  for (const p of visibleProviders) {
    for (const m of p.models) {
      if (filter === 'free' && !m.free) continue;
      if (filter === 'paid' && m.free) continue;
      if (
        search &&
        !m.id.toLowerCase().includes(search.toLowerCase()) &&
        !m.name.toLowerCase().includes(search.toLowerCase())
      ) continue;
      visibleModels.push({ provider: p, model: m });
    }
  }

  const totalModels = providers.reduce((s, p) => s + p.models.length, 0);

  return (
    <AdminPage>
      {/* ── Header ── */}
      <AdminPageHeader
        eyebrow="IA"
        title="Modelos IA"
        description="Diagnóstico de modelos disponibles — comprueba qué modelos están activos y pruébalos en tiempo real."
        icon={Sparkles}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void fetchModels()}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => void testAllVisible()}
              disabled={testingAll || loading || visibleModels.length === 0}
              className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-amber-300 disabled:opacity-50"
            >
              {testingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Testear todos visibles
            </button>
          </div>
        }
      />

      {/* ── Fetch error ── */}
      {fetchError && (
        <AdminMotion>
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {fetchError}
          </div>
        </AdminMotion>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <AdminMotion>
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando modelos de todos los proveedores…
          </div>
        </AdminMotion>
      )}

      {!loading && providers.length > 0 && (
        <>
          {/* ── Provider tabs ── */}
          <AdminMotion>
            <div className="flex flex-wrap gap-2">
              {/* All tab */}
              <button
                onClick={() => setActiveProvider('all')}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  activeProvider === 'all'
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                    : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Activity className="h-3 w-3" />
                Todos
                <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                  {totalModels}
                </span>
              </button>

              {providers.map((p) => {
                const dotStatus = providerDotStatus(p);
                const dotColor =
                  dotStatus === 'green'
                    ? 'bg-emerald-400'
                    : dotStatus === 'red'
                    ? 'bg-red-500'
                    : 'bg-amber-400';
                const isActive = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProvider(p.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                        : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    {p.label}
                    <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      {p.models.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminMotion>

          {/* ── Filters + search ── */}
          <AdminMotion>
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter pills */}
              <div className="flex gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 p-1">
                {(['all', 'free', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      filter === f
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'free' ? 'Gratuitos' : 'De pago'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar modelo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-zinc-700 bg-zinc-800/60 py-2 pl-9 pr-9 text-xs text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                {visibleModels.length} modelo{visibleModels.length !== 1 ? 's' : ''}
              </p>
            </div>
          </AdminMotion>

          {/* ── Provider error banners (for non-configured / error providers in selected tab) ── */}
          {visibleProviders
            .filter((p) => !p.configured || p.error)
            .map((p) => (
              <AdminMotion key={`banner-${p.id}`}>
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    !p.configured
                      ? 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400'
                      : 'border-amber-500/30 bg-amber-900/20 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{p.label}</strong>:{' '}
                      {!p.configured
                        ? 'Sin clave API configurada'
                        : `Error al cargar modelos: ${p.error}`}
                    </span>
                  </div>
                  {!p.configured && (
                    <a
                      href="/admin/integraciones"
                      className="flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-700/60 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                    >
                      Configurar <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </AdminMotion>
            ))}

          {/* ── Model cards grid ── */}
          {visibleModels.length > 0 ? (
            <AdminMotion>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleModels.map(({ provider: p, model: m }) => {
                  const key = `${p.id}:${m.id}`;
                  const test = tests[key];
                  const providerColor = PROVIDER_COLORS[p.id] ?? 'text-zinc-300 border-zinc-600/30 bg-zinc-800/20';

                  return (
                    <div
                      key={key}
                      className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-zinc-700"
                    >
                      {/* Not configured overlay */}
                      {!p.configured && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-950/80 backdrop-blur-sm">
                          <p className="text-xs font-bold text-zinc-400">Sin configurar</p>
                          <a
                            href="/admin/integraciones"
                            className="flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                          >
                            Ir a Integraciones <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs font-bold text-white" title={m.id}>
                            {m.id}
                          </p>
                          {m.name !== m.id && (
                            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{m.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Provider badge */}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${providerColor}`}>
                          {PROVIDER_LABELS[p.id] ?? p.label}
                        </span>
                        {/* Free / Paid badge */}
                        {m.free ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-900/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            GRATIS
                          </span>
                        ) : (
                          <span className="rounded-full border border-zinc-600/30 bg-zinc-800/20 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                            De pago
                          </span>
                        )}
                        {/* Context length */}
                        {m.contextLength ? (
                          <span className="rounded-full border border-zinc-700/30 bg-zinc-800/10 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                            {formatCtx(m.contextLength)}
                          </span>
                        ) : null}
                      </div>

                      {/* Description */}
                      {m.description && (
                        <p className="line-clamp-1 text-[11px] text-zinc-500">{m.description}</p>
                      )}

                      {/* Test button + result */}
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          onClick={() => void testModel(p.id, m.id)}
                          disabled={!p.configured || test?.status === 'testing'}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-40 ${
                            test?.status === 'ok'
                              ? 'border-emerald-500/40 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
                              : test?.status === 'error'
                              ? 'border-red-500/40 bg-red-900/30 text-red-300 hover:bg-red-900/50'
                              : 'border-zinc-600 bg-zinc-800/60 text-zinc-300 hover:border-zinc-400 hover:text-white'
                          }`}
                        >
                          {test?.status === 'testing' ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Testeando…
                            </>
                          ) : test?.status === 'ok' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              ✓ {test.latency}ms
                            </>
                          ) : test?.status === 'error' ? (
                            <>
                              <X className="h-3 w-3" />
                              Reintentar
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3" />
                              Testear
                            </>
                          )}
                        </button>

                        {/* Error type badge */}
                        {test?.status === 'error' && test.errorType && ERROR_LABELS[test.errorType] && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ERROR_LABELS[test.errorType].color}`}
                          >
                            {ERROR_LABELS[test.errorType].label}
                          </span>
                        )}

                        {/* Success response preview */}
                        {test?.status === 'ok' && test.response && (
                          <span className="truncate text-[10px] font-mono text-zinc-500" title={test.response}>
                            {test.response}
                          </span>
                        )}
                      </div>

                      {/* Error message */}
                      {test?.status === 'error' && test.error && !ERROR_LABELS[test.errorType ?? ''] && (
                        <p className="text-[10px] text-red-400 line-clamp-1">{test.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </AdminMotion>
          ) : (
            !loading && (
              <AdminMotion>
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/30 py-16 text-center">
                  <Search className="h-8 w-8 text-zinc-600" />
                  <p className="text-sm font-bold text-zinc-400">No se encontraron modelos</p>
                  <p className="text-xs text-zinc-600">
                    {search ? 'Intenta con otro término de búsqueda' : 'Ningún proveedor tiene modelos para mostrar con el filtro seleccionado'}
                  </p>
                </div>
              </AdminMotion>
            )
          )}

          {/* ── Provider dot legend ── */}
          <AdminMotion>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Configurado y funcional</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Sin API key</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Error al cargar</span>
              </div>
              <a
                href="/admin/integraciones"
                className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                Gestionar integraciones <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </AdminMotion>
        </>
      )}
    </AdminPage>
  );
}
