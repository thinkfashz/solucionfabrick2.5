'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, BrainCircuit, CheckCircle2, Code2, GitBranch, LockKeyhole, Loader2, Send, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';
import FabrickAIProviderCards from '@/components/admin/FabrickAIProviderCards';

type Provider = 'auto' | 'openai' | 'openrouter' | 'claude';
type Mode = 'lectura' | 'propuesta' | 'pr';
type ChatMessage = { role: 'assistant' | 'user'; text: string; meta?: string };

const providerLabels: Record<Provider, string> = {
  auto: 'Auto seguro',
  openai: 'ChatGPT',
  openrouter: 'OpenRouter',
  claude: 'Claude',
};

const modeLabels: Record<Mode, string> = {
  lectura: 'Solo lectura',
  propuesta: 'Propuesta',
  pr: 'Preparar PR',
};

const quickPrompts = [
  'Revisa el admin y dime qué módulo conviene mejorar primero.',
  'Propón una mejora visual sin romper funcionalidad.',
  'Prepara un plan para reparar errores de build.',
  'Organiza una mejora por etapas y documenta el avance.',
];

export default function FabrickAiDeveloperPage() {
  const [provider, setProvider] = useState<Provider>('auto');
  const [mode, setMode] = useState<Mode>('lectura');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Soy Fabrick AI Developer. Puedo ayudarte a analizar, planificar y preparar mejoras para la plataforma sin tocar producción directo.' },
  ]);

  const modeDescription = useMemo(() => {
    if (mode === 'lectura') return 'Analiza estructura, módulos y errores sin modificar archivos.';
    if (mode === 'propuesta') return 'Genera plan técnico, pasos y propuesta de cambio.';
    return 'Prepara una rama y un PR para revisión manual.';
  }, [mode]);

  async function submit(text = input) {
    const value = text.trim();
    if (!value || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: value }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/admin/ai-developer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          mode,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.text })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No se pudo consultar Fabrick AI Developer.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: typeof json.message === 'string' ? json.message : 'El proveedor respondió sin contenido legible.',
          meta: `${json.provider ?? provider} · ${json.model ?? 'modelo'} · fuente ${json.source ?? 'desconocida'}`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Error inesperado al consultar el proveedor IA.',
          meta: 'error',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AdminPage className="px-0 py-0 sm:px-6 sm:py-6">
      <div className="flex min-h-[calc(100vh-86px)] flex-col overflow-hidden rounded-none border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl sm:rounded-[2rem] sm:border">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-600 text-black shadow-[0_0_40px_rgba(250,204,21,0.28)]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black tracking-tight text-white sm:text-2xl">Fabrick AI Developer</p>
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Módulo 8 · Constructor IA seguro</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 sm:flex">
              <ShieldCheck className="h-4 w-4" /> Revisión manual
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
          <main className="flex min-h-0 flex-col border-white/10 lg:border-r">
            <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-3 sm:p-5">
              <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-bold text-white outline-none">
                {Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-bold text-white outline-none">
                {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-zinc-400">{modeDescription}</div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-yellow-300/15 bg-gradient-to-br from-yellow-300/12 via-white/[0.04] to-transparent p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 shrink-0 text-yellow-300" />
                  <div>
                    <h1 className="text-xl font-black text-white sm:text-3xl">Mejora tu app con IA, paso a paso y sin riesgo.</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">Este panel ya consulta un proveedor IA real si tienes credenciales configuradas en Integraciones o Vercel.</p>
                  </div>
                </div>
              </motion.div>

              <FabrickAIProviderCards />

              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[72%] ${message.role === 'user' ? 'bg-yellow-300 text-black' : message.meta === 'error' ? 'border border-red-400/30 bg-red-500/10 text-red-100' : 'border border-white/10 bg-white/[0.05] text-zinc-200'}`}>
                      <div className="whitespace-pre-wrap">{message.text}</div>
                      {message.meta ? <div className="mt-3 border-t border-white/10 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{message.meta}</div> : null}
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-zinc-300">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-300" /> Fabrick AI Developer pensando…
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-white/10 bg-zinc-950/95 p-3 sm:p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} disabled={isSending} onClick={() => submit(prompt)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200 disabled:opacity-50">{prompt}</button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Escribe qué quieres mejorar, reparar o crear…" rows={1} disabled={isSending} className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 disabled:opacity-60" />
                <button onClick={() => submit()} disabled={isSending || !input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 text-black hover:bg-yellow-200 disabled:opacity-50" aria-label="Enviar">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </main>

          <aside className="hidden min-h-0 overflow-y-auto bg-black/30 p-5 lg:block">
            <div className="space-y-4">
              <Panel title="Capacidades" icon={<Wand2 className="h-4 w-4" />} items={['Analizar módulos', 'Proponer diseño', 'Preparar cambios', 'Documentar avances']} />
              <Panel title="Flujo seguro" icon={<GitBranch className="h-4 w-4" />} items={['Lectura primero', 'Plan antes de código', 'PR revisable', 'Producción manual']} />
              <Panel title="Bloqueos" icon={<LockKeyhole className="h-4 w-4" />} items={['No modifica main directo', 'No despliega solo', 'No muestra secretos', 'No borra datos']} />
              <Panel title="Estado actual" icon={<Code2 className="h-4 w-4" />} items={['Chat real conectado', 'Credenciales DB/env', 'Auditoría backend', 'Git tools bloqueadas']} />
            </div>
          </aside>
        </div>
      </div>
    </AdminPage>
  );
}

function Panel({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-black text-white">{icon} {title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-zinc-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
