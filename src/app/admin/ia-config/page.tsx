'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Bot, CheckCircle, Clock, ExternalLink, Eye, EyeOff, Save, Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type ProviderType = 'anthropic' | 'groq' | 'openrouter' | 'openai' | 'gemini' | 'grok';

const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8', desc: 'Máxima calidad · más lento' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', desc: 'Recomendado · balance calidad/velocidad', recommended: true },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', desc: 'Rápido y económico' },
] as const;

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', desc: 'Recomendado · gratis · muy capaz', recommended: true },
  { id: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B Instant', desc: 'Ultra-rápido · gratis' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', desc: 'Eficiente · gratis · Google' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', desc: 'Contexto largo 32K · gratis' },
] as const;

const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'LLaMA 3.3 70B', desc: 'Gratis · tool use · recomendado para agente', recommended: true },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', desc: 'Gratis · Google · buen razonamiento' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 24B', desc: 'Gratis · multimodal · Mistral AI' },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4', desc: 'Pago · rápido · Claude vía OpenRouter' },
] as const;

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', desc: 'Rápido y económico · recomendado', recommended: true },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'Máxima calidad · multimodal' },
  { id: 'o3-mini', label: 'o3 mini', desc: 'Razonamiento avanzado · bajo costo' },
] as const;

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', desc: 'Gratis · más reciente · recomendado', recommended: true },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Gratis · rápido · estable' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Mejor calidad · límite menor en gratis' },
] as const;

const GROK_MODELS = [
  { id: 'grok-2-1212', label: 'Grok 2', desc: 'Modelo más reciente de xAI', recommended: true },
  { id: 'grok-2-vision-1212', label: 'Grok 2 Vision', desc: 'Multimodal · análisis de imágenes' },
  { id: 'grok-beta', label: 'Grok Beta', desc: 'Modelo estable anterior' },
] as const;

interface ConfigState {
  key_configured: boolean;
  modelo_ia: string;
  activo: boolean;
  proveedor_ia: ProviderType;
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function IaConfigPage() {
  const [config, setConfig] = useState<ConfigState>({
    key_configured: false,
    modelo_ia: 'claude-haiku-4-5-20251001',
    activo: true,
    proveedor_ia: 'anthropic',
  });
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelo, setModelo] = useState<string>('claude-haiku-4-5-20251001');
  const [proveedor, setProveedor] = useState<ProviderType>('anthropic');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<{ latency_ms?: number; model?: string; error?: string } | null>(null);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ia/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as ConfigState;
        setConfig(data);
        setModelo(data.modelo_ia);
        setProveedor(data.proveedor_ia ?? 'anthropic');
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    if (!apiKey.trim()) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropic_api_key: apiKey.trim() }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveStatus('saved');
      setApiKey('');
      setConfig(c => ({ ...c, key_configured: true }));
      flash('API key guardada en base de datos.');
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function saveModelo() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo_ia: modelo, proveedor_ia: proveedor }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveStatus('saved');
      setConfig(c => ({ ...c, modelo_ia: modelo, proveedor_ia: proveedor }));
      flash('Configuración guardada.');
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function testConnection() {
    setTestStatus('testing');
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/ia/test', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; latency_ms?: number; model?: string; error?: string };
      setTestResult(data);
      setTestStatus(data.ok ? 'ok' : 'error');
      setLastTested(new Date());
    } catch (err) {
      setTestResult({ error: (err as Error).message });
      setTestStatus('error');
    }
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  const currentModels =
    proveedor === 'groq' ? GROQ_MODELS :
    proveedor === 'openrouter' ? OPENROUTER_MODELS :
    proveedor === 'openai' ? OPENAI_MODELS :
    proveedor === 'gemini' ? GEMINI_MODELS :
    proveedor === 'grok' ? GROK_MODELS :
    ANTHROPIC_MODELS;
  const modeloChanged = modelo !== config.modelo_ia || proveedor !== config.proveedor_ia;

  const statusLabel: Record<TestStatus, string> = {
    idle: 'Sin probar',
    testing: 'Probando…',
    ok: `Conectado${testResult?.latency_ms ? ` · ${testResult.latency_ms}ms` : ''}`,
    error: `Error${testResult?.error ? ` · ${testResult.error.slice(0, 60)}` : ''}`,
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="Configuración IA"
        description="Gestiona el proveedor de IA activo y su conexión. Las claves se almacenan en el Centro de Integraciones (tabla integrations) — nunca en variables de entorno."
        icon={Bot}
      />

      <AdminMotion>
        <div className="grid gap-5 max-w-2xl">

          {/* ── Estado de conexión ───────────────────────────────────────────── */}
          <AdminCard>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.key_configured ? 'bg-emerald-500/15' : 'bg-zinc-800'}`}>
                  <Bot className={`h-5 w-5 ${config.key_configured ? 'text-emerald-400' : 'text-zinc-500'}`} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Estado de conexión</p>
                  {loading ? (
                    <p className="text-sm text-zinc-400">Cargando…</p>
                  ) : (
                    <p className={`font-black ${config.key_configured ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {config.key_configured ? '✓ Clave configurada' : 'Sin clave API'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Modelo activo</p>
                <p className="font-black text-white">{config.modelo_ia}</p>
                <p className="text-xs text-zinc-600 capitalize">{config.proveedor_ia}</p>
              </div>
            </div>
          </AdminCard>

          {/* ── Proveedor ────────────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">Proveedor de IA</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {([
                { id: 'anthropic' as ProviderType, label: 'Anthropic', sub: 'Claude Opus/Sonnet/Haiku', color: 'text-amber-400', defaultModel: 'claude-haiku-4-5-20251001' },
                { id: 'groq' as ProviderType, label: 'Groq', sub: 'LLaMA · Gemma · gratis', color: 'text-rose-400', defaultModel: 'llama-3.3-70b-versatile' },
                { id: 'openrouter' as ProviderType, label: 'OpenRouter', sub: 'Multi-modelo · gratis', color: 'text-purple-400', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free' },
                { id: 'openai' as ProviderType, label: 'OpenAI', sub: 'GPT-4o · ChatGPT', color: 'text-green-400', defaultModel: 'gpt-4o-mini' },
                { id: 'gemini' as ProviderType, label: 'Gemini', sub: 'Google · gratis', color: 'text-blue-400', defaultModel: 'gemini-2.0-flash-exp' },
                { id: 'grok' as ProviderType, label: 'Grok', sub: 'xAI · $25 gratis', color: 'text-violet-400', defaultModel: 'grok-2-1212' },
              ]).map(p => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition ${proveedor === p.id ? 'border-yellow-400/60 bg-yellow-400/8' : 'border-white/10 bg-black/20 hover:border-white/25'}`}
                >
                  <input
                    type="radio"
                    name="proveedor"
                    value={p.id}
                    checked={proveedor === p.id}
                    onChange={() => {
                      setProveedor(p.id);
                      setModelo(p.defaultModel);
                    }}
                    className="accent-yellow-400 sr-only"
                  />
                  <Zap className={`h-5 w-5 ${p.color}`} />
                  <p className="font-black text-white text-sm">{p.label}</p>
                  <p className="text-[10px] text-zinc-500 leading-tight">{p.sub}</p>
                </label>
              ))}
            </div>
            <p className="text-xs text-zinc-600">
              Las claves se guardan en{' '}
              <a href="/admin/integraciones" className="inline-flex items-center gap-1 text-yellow-400 hover:underline">
                Centro de Integraciones <ExternalLink className="h-3 w-3" />
              </a>
              {' '}— tarjeta{' '}
              {proveedor === 'anthropic' ? 'Anthropic · Claude' :
               proveedor === 'groq' ? 'Groq · LLaMA / Gemma' :
               proveedor === 'openrouter' ? 'OpenRouter' :
               proveedor === 'openai' ? 'OpenAI · ChatGPT' :
               proveedor === 'gemini' ? 'Google Gemini' :
               'xAI · Grok'}.
            </p>
          </AdminCard>

          {/* ── API Key (solo Anthropic legacy) ──────────────────────────────── */}
          {proveedor === 'anthropic' && (
            <AdminCard>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <h2 className="font-black text-white">API Key de Anthropic</h2>
                <span className="ml-auto text-[10px] font-bold uppercase text-zinc-600 tracking-widest">Legacy</span>
              </div>

              {config.key_configured && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm font-bold text-emerald-300">Clave almacenada en BD. Usa el Centro de Integraciones para gestionarla.</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  <span>{config.key_configured ? 'Nueva API key (reemplazar)' : 'API key directa'}</span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 pr-10 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => void saveKey()}
                      disabled={!apiKey.trim() || saveStatus === 'saving'}
                      className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                    >
                      <Save className="mr-1 inline h-4 w-4" />
                      {saveStatus === 'saving' ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </label>
                <p className="text-xs text-zinc-600">
                  Recomendado: guarda la clave en{' '}
                  <a href="/admin/integraciones" className="text-yellow-400 hover:underline">Centro de Integraciones → Anthropic</a>
                  {' '}para tener test de conexión integrado.
                </p>
              </div>
            </AdminCard>
          )}

          {/* ── Modelo ──────────────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">Modelo de {
              proveedor === 'anthropic' ? 'Claude' :
              proveedor === 'openrouter' ? 'OpenRouter' :
              proveedor === 'openai' ? 'OpenAI' :
              proveedor === 'gemini' ? 'Gemini' :
              proveedor === 'grok' ? 'Grok' :
              'Groq'
            }</h2>
            </div>
            <div className="space-y-2 mb-4">
              {currentModels.map(m => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${modelo === m.id ? 'border-yellow-400/60 bg-yellow-400/8' : 'border-white/10 bg-black/20 hover:border-white/25'}`}>
                  <input
                    type="radio"
                    name="modelo"
                    value={m.id}
                    checked={modelo === m.id}
                    onChange={() => setModelo(m.id)}
                    className="mt-0.5 accent-yellow-400"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">{m.label}</span>
                      {'recommended' in m && m.recommended && (
                        <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-black text-yellow-300">Recomendado</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{m.desc}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{m.id}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={() => void saveModelo()}
              disabled={!modeloChanged || saveStatus === 'saving'}
              className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-40"
            >
              <Save className="mr-1 inline h-4 w-4" />
              {saveStatus === 'saving' ? 'Guardando…' : 'Guardar configuración'}
            </button>
            {saveStatus === 'saved' && <span className="ml-3 text-sm font-bold text-emerald-400">✓ Guardado</span>}
            {saveStatus === 'error' && <span className="ml-3 text-sm font-bold text-red-400">Error</span>}
          </AdminCard>

          {/* ── Test de conexión ────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">Probar conexión</h2>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
                testStatus === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                testStatus === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                testStatus === 'testing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                'border-white/10 bg-white/5 text-zinc-500'
              }`}>
                {testStatus === 'ok' ? <CheckCircle className="h-3.5 w-3.5" /> :
                 testStatus === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                 testStatus === 'testing' ? <Zap className="h-3.5 w-3.5 animate-pulse" /> :
                 <Clock className="h-3.5 w-3.5" />}
                <span>{statusLabel[testStatus]}</span>
              </div>
              {lastTested && <span className="text-xs text-zinc-600">Último test: {lastTested.toLocaleTimeString('es-CL')}</span>}
            </div>

            {testStatus === 'ok' && testResult?.model && (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                ✓ Conectado a <strong>{testResult.model}</strong> en {testResult.latency_ms}ms
              </div>
            )}
            {testStatus === 'error' && testResult?.error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                <AlertTriangle className="mr-2 inline h-4 w-4" />{testResult.error}
              </div>
            )}

            <button
              onClick={() => void testConnection()}
              disabled={testStatus === 'testing'}
              className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200 disabled:opacity-50 hover:bg-yellow-400/20"
            >
              <Zap className="mr-1 inline h-4 w-4" />
              {testStatus === 'testing' ? 'Probando…' : 'Probar conexión'}
            </button>
            <p className="mt-2 text-xs text-zinc-600">
              Prueba la conexión con el proveedor activo. Asegúrate de haber guardado la API key en{' '}
              <a href="/admin/integraciones" className="text-yellow-400 hover:underline">Centro de Integraciones</a>.
            </p>
          </AdminCard>

          {msg && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
              ✓ {msg}
            </div>
          )}

        </div>
      </AdminMotion>
    </AdminPage>
  );
}
