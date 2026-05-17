'use client';

import { useState } from 'react';
import { Bot, BrainCircuit, CheckCircle2, ChevronDown, Gauge, KeyRound, LockKeyhole, Play, Sparkles, XCircle, Zap } from 'lucide-react';

type ProviderId = 'openai' | 'openrouter' | 'claude';

type Provider = {
  id: ProviderId;
  name: string;
  label: string;
  description: string;
  fields: Array<{ key: string; label: string; placeholder: string; type?: 'text' | 'password' }>;
  docsUrl: string;
  accent: string;
};

type TestState = {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  meta?: string;
};

const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'ChatGPT / OpenAI',
    label: 'GPT, visión, razonamiento y agentes',
    description: 'Proveedor recomendado para análisis profundo, generación de código, asistencia del admin y futuras acciones con herramientas.',
    docsUrl: 'https://platform.openai.com/api-keys',
    accent: 'from-emerald-300/25 via-cyan-300/10 to-transparent',
    fields: [
      { key: 'api_key', label: 'OPENAI_API_KEY', placeholder: 'sk-...', type: 'password' },
      { key: 'model', label: 'Modelo preferido', placeholder: 'gpt-5.1 / gpt-4.1 / auto' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'Gateway multi-modelo',
    description: 'Permite usar múltiples modelos desde un solo proveedor: GPT, Claude, Gemini, Llama, Mistral y modelos gratuitos.',
    docsUrl: 'https://openrouter.ai/keys',
    accent: 'from-fuchsia-300/25 via-purple-400/10 to-transparent',
    fields: [
      { key: 'api_key', label: 'OPENROUTER_API_KEY', placeholder: 'sk-or-v1-...', type: 'password' },
      { key: 'site_url', label: 'Site URL', placeholder: 'https://www.solucionesfabrick.com' },
      { key: 'app_name', label: 'App name', placeholder: 'Soluciones Fabrick Admin' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude / Anthropic',
    label: 'Claude Code y análisis largo',
    description: 'Útil para lectura extensa de repositorios, revisión de arquitectura, documentación y propuestas de refactor por etapas.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    accent: 'from-orange-300/25 via-amber-400/10 to-transparent',
    fields: [
      { key: 'api_key', label: 'ANTHROPIC_API_KEY', placeholder: 'sk-ant-...', type: 'password' },
      { key: 'model', label: 'Modelo preferido', placeholder: 'claude-sonnet-4-5 / auto' },
    ],
  },
];

export default function FabrickAIProviderCards() {
  const [open, setOpen] = useState<ProviderId>('openrouter');
  const [testing, setTesting] = useState<ProviderId | null>(null);
  const [progress, setProgress] = useState<Record<ProviderId, number>>({ openai: 0, openrouter: 0, claude: 0 });
  const [state, setState] = useState<Record<ProviderId, TestState>>({
    openai: { status: 'idle' },
    openrouter: { status: 'idle' },
    claude: { status: 'idle' },
  });

  async function runTest(id: ProviderId) {
    setTesting(id);
    setState((prev) => ({ ...prev, [id]: { status: 'idle', message: 'Conectando con proveedor real…' } }));
    setProgress((prev) => ({ ...prev, [id]: 8 }));

    let alive = true;
    const timer = window.setInterval(() => {
      setProgress((prev) => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + 12, 88) }));
    }, 180);

    try {
      const res = await fetch('/api/admin/ai-developer/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No se pudo testear el proveedor.');
      alive = false;
      window.clearInterval(timer);
      setProgress((prev) => ({ ...prev, [id]: 100 }));
      setTesting(null);
      setState((prev) => ({
        ...prev,
        [id]: {
          status: 'ok',
          message: `Conexión real OK · ${json.latencyMs ?? '?'} ms`,
          meta: `${json.model ?? 'modelo'} · fuente ${json.source ?? 'desconocida'}`,
        },
      }));
    } catch (err) {
      if (alive) window.clearInterval(timer);
      setProgress((prev) => ({ ...prev, [id]: 100 }));
      setTesting(null);
      setState((prev) => ({
        ...prev,
        [id]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Error inesperado al testear el proveedor.',
        },
      }));
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Credenciales IA</p>
          <h2 className="mt-1 text-xl font-black text-white">Proveedores para Fabrick AI Developer</h2>
          <p className="mt-2 text-sm text-zinc-400">Tarjetas 3D para probar proveedores reales con credenciales DB-first y Vercel fallback.</p>
        </div>
        <span className="hidden rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-100 sm:inline-flex">DB primero · Vercel respaldo</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const expanded = open === provider.id;
          const result = state[provider.id];
          const value = progress[provider.id] ?? 0;
          const isOk = result.status === 'ok';
          const isError = result.status === 'error';
          return (
            <div key={provider.id} className="group [perspective:1200px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 p-4 shadow-[0_25px_90px_rgba(0,0,0,0.35)] transition duration-300 [transform-style:preserve-3d] hover:-translate-y-1 hover:rotate-x-2 hover:rotate-y-2 hover:border-yellow-300/30">
                <div className={`absolute inset-0 bg-gradient-to-br ${provider.accent}`} />
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-300/10 blur-3xl" />
                <div className="relative z-10">
                  <button type="button" onClick={() => setOpen(expanded ? 'openrouter' : provider.id)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-yellow-200 shadow-inner">
                        {provider.id === 'claude' ? <BrainCircuit className="h-5 w-5" /> : provider.id === 'openai' ? <Bot className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </span>
                      <div>
                        <h3 className="text-base font-black text-white">{provider.name}</h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{provider.label}</p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-zinc-500 transition ${expanded ? 'rotate-180 text-yellow-300' : ''}`} />
                  </button>

                  <p className="mt-4 text-sm leading-relaxed text-zinc-300">{provider.description}</p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      <span className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Test de conexión</span>
                      <span>{testing === provider.id ? `${value}%` : isOk ? 'OK' : isError ? 'ERROR' : 'Idle'}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full transition-all duration-200 ${isOk ? 'bg-emerald-300' : isError ? 'bg-red-400' : 'bg-yellow-300'}`} style={{ width: `${value}%` }} />
                    </div>
                    {testing === provider.id ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-yellow-100"><Zap className="h-4 w-4 animate-pulse" /> Enviando prueba real al proveedor…</div>
                    ) : isOk ? (
                      <div className="mt-3 flex items-start gap-2 text-xs text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{result.message}<br /><span className="text-emerald-200/60">{result.meta}</span></span></div>
                    ) : isError ? (
                      <div className="mt-3 flex items-start gap-2 text-xs text-red-200"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{result.message}</span></div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                      {provider.fields.map((field) => (
                        <label key={field.key} className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{field.label}</span>
                          <input type={field.type ?? 'text'} placeholder={field.placeholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/40" />
                        </label>
                      ))}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button type="button" onClick={() => runTest(provider.id)} disabled={testing === provider.id} className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">
                          <Play className="h-4 w-4" /> Test real
                        </button>
                        <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200">
                          <KeyRound className="h-4 w-4" /> Obtener key
                        </a>
                      </div>
                      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /> El test real usa credenciales guardadas en Integraciones o variables Vercel. Estos inputs son guía visual; el guardado oficial sigue en /admin/integraciones.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
