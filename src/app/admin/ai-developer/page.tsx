'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Camera, CheckCircle2, ChevronRight, Code2, ExternalLink, GitBranch,
  Globe, LockKeyhole, Loader2, Send, ShieldCheck, Sparkles, Terminal, Wand2, X,
} from 'lucide-react';
import FabrickAIProviderCards from '@/components/admin/FabrickAIProviderCards';
import FabrickAICredentialsPanel from '@/components/admin/FabrickAICredentialsPanel';

type Provider = 'auto' | 'openai' | 'openrouter' | 'claude' | 'gemini' | 'grok';
type Mode = 'lectura' | 'propuesta' | 'pr';
type ChatMessage = { role: 'assistant' | 'user'; text: string; meta?: string };

const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: 'auto', label: 'Auto', color: 'text-yellow-400' },
  { id: 'openrouter', label: 'OpenRouter', color: 'text-purple-400' },
  { id: 'openai', label: 'ChatGPT', color: 'text-green-400' },
  { id: 'claude', label: 'Claude', color: 'text-amber-400' },
  { id: 'gemini', label: 'Gemini', color: 'text-blue-400' },
  { id: 'grok', label: 'Grok', color: 'text-violet-400' },
];

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'lectura', label: 'Lectura', desc: 'Analiza sin modificar archivos' },
  { id: 'propuesta', label: 'Propuesta', desc: 'Genera plan técnico detallado' },
  { id: 'pr', label: 'Preparar PR', desc: 'Crea rama y PR para revisión' },
];

const QUICK_PROMPTS = [
  'Revisa el admin y dime qué módulo conviene mejorar primero.',
  'Propón una mejora visual sin romper funcionalidad.',
  'Prepara un plan para reparar errores de build.',
  'Organiza una mejora por etapas y documenta el avance.',
];

const CAPABILITIES = [
  { icon: <Wand2 className="h-3.5 w-3.5" />, text: 'Analizar módulos' },
  { icon: <Sparkles className="h-3.5 w-3.5" />, text: 'Proponer diseño' },
  { icon: <GitBranch className="h-3.5 w-3.5" />, text: 'Preparar PR' },
  { icon: <Code2 className="h-3.5 w-3.5" />, text: 'Chat IA real' },
];

const BLOCKS = [
  { icon: <LockKeyhole className="h-3.5 w-3.5" />, text: 'No modifica main' },
  { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: 'No despliega solo' },
  { icon: <X className="h-3.5 w-3.5" />, text: 'No borra datos' },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default function FabrickAiDeveloperPage() {
  const [provider, setProvider] = useState<Provider>('auto');
  const [mode, setMode] = useState<Mode>('lectura');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [navInput, setNavInput] = useState('');
  const [showNavInput, setShowNavInput] = useState(false);
  const [jsInput, setJsInput] = useState('');
  const [showJsInput, setShowJsInput] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hola. Soy Fabrick AI Developer. Puedo ayudarte a analizar, planificar y preparar mejoras para la plataforma sin tocar producción directamente. ¿En qué trabajamos hoy?',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const modeDesc = useMemo(() => MODES.find((m) => m.id === mode)?.desc ?? '', [mode]);

  const agentActive = useMemo(() => messages.some(
    (m) => m.text.includes('navegar_url') || m.text.includes('capturar_pantalla') || m.text.includes('navega a') || m.text.includes('Navegando')
  ), [messages]);

  const lastScreenshot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const match = m.text.match(/data:image\/[^;]+;base64,[^"'\s]+/);
      if (match) return match[0];
    }
    return null;
  }, [messages]);

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
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No se pudo consultar Fabrick AI Developer.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: typeof json.message === 'string' ? json.message : 'El proveedor respondió sin contenido legible.',
          meta: `${json.provider ?? provider} · ${json.model ?? 'modelo'} · ${json.source ?? '?'}`,
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

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] w-full overflow-hidden bg-[#0a0a0a] text-white">

      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-black/60 px-3 py-3 backdrop-blur-xl sm:px-5 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-600 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-tight text-white">Fabrick AI Developer</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Módulo 8 · Constructor IA</p>
          </div>
        </div>

        {/* Mode pills */}
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:flex">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-full px-3 py-1 text-[10px] font-black tracking-[0.08em] transition-all ${
                mode === m.id ? 'bg-yellow-400 text-black shadow-md' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1.5 text-[9px] font-bold text-emerald-400 sm:flex">
            <ShieldCheck className="h-3 w-3" /> Revisión manual
          </div>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-500 transition hover:border-white/20 hover:text-white lg:hidden"
            title="Info"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showInfo ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[1fr_280px]">

        {/* ── Chat column ── */}
        <div className="flex h-full min-h-0 flex-col">

          {/* Provider + mode on mobile */}
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/8 px-4 py-2.5 scrollbar-hide lg:hidden">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700">Proveedor:</span>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-all ${
                  provider === p.id
                    ? 'bg-yellow-400 text-black'
                    : 'border border-white/10 text-zinc-500 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">

            {/* Welcome / provider cards — shown before first user message */}
            {messages.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <FabrickAIProviderCards />
                <FabrickAICredentialsPanel />
              </motion.div>
            )}

            {messages.map((msg, idx) => (
              <AnimatePresence key={`${msg.role}-${idx}`}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-md">
                      <BrainCircuit className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-1.5 sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-sm bg-yellow-400 text-black'
                          : msg.meta === 'error'
                          ? 'rounded-bl-sm border border-red-400/20 bg-red-500/8 text-red-200'
                          : 'rounded-bl-sm border border-white/8 bg-white/[0.05] text-zinc-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.meta && msg.meta !== 'error' && (
                      <p className="px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-700">
                        {msg.meta}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ))}

            {isSending && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-md">
                  <BrainCircuit className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.05] px-4 py-3">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ── */}
          <div className="shrink-0 border-t border-white/8 bg-[#0c0c0c] p-2 sm:p-4 pb-safe-offset-2">
            {/* Quick prompts */}
            <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide w-full max-w-[100vw]">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  disabled={isSending}
                  onClick={() => void submit(prompt)}
                  className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold text-zinc-500 transition hover:border-yellow-300/30 hover:text-yellow-200 disabled:opacity-40"
                >
                  {prompt.length > 42 ? prompt.slice(0, 42) + '…' : prompt}
                </button>
              ))}
            </div>

            {/* Textarea + send */}
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-white/20">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe qué quieres mejorar, reparar o crear…"
                rows={1}
                disabled={isSending}
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isSending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black transition hover:bg-yellow-300 disabled:opacity-40"
                aria-label="Enviar"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Mode description */}
            <p className="mt-2 px-1 text-[10px] text-zinc-700">{modeDesc}</p>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <aside className={`border-l border-white/8 bg-[#0c0c0c] shrink-0 w-full lg:w-[320px] absolute inset-y-0 right-0 z-20 lg:relative lg:block transition-transform ${showInfo ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <div className="overflow-y-auto p-4 h-full pb-safe-offset-4">
            <div className="flex justify-between lg:hidden mb-4 items-center">
               <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Opciones IA</h3>
               <button onClick={() => setShowInfo(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-lg">
                 <X className="h-4 w-4" />
               </button>
            </div>
            <div className="space-y-5">

              {/* Provider selector */}
              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-zinc-700">Proveedor</p>
                <div className="space-y-1">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-bold transition-all ${
                        provider === p.id
                          ? 'bg-yellow-400/10 text-yellow-200'
                          : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                      }`}
                    >
                      {p.label}
                      {provider === p.id && <CheckCircle2 className="h-3.5 w-3.5 text-yellow-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode selector */}
              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-zinc-700">Modo</p>
                <div className="space-y-1">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition-all ${
                        mode === m.id
                          ? 'bg-yellow-400/8 text-yellow-200'
                          : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{m.label}</span>
                      <span className="mt-0.5 text-[10px] text-zinc-700">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-zinc-700">Capacidades</p>
                <div className="space-y-1.5">
                  {CAPABILITIES.map((c) => (
                    <div key={c.text} className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="text-emerald-500">{c.icon}</span>
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Blocks */}
              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-zinc-700">Restricciones</p>
                <div className="space-y-1.5">
                  {BLOCKS.map((b) => (
                    <div key={b.text} className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="text-red-500/60">{b.icon}</span>
                      {b.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Playwright Agent Control Panel ── */}
              <div className="border-t border-white/8 pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">Agente Playwright</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${agentActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${agentActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    {agentActive ? 'Activo' : 'Reposo'}
                  </span>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => void submit('Toma una captura de la pantalla actual del agente')}
                    disabled={isSending}
                    className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[10px] font-bold text-zinc-500 transition hover:border-yellow-300/20 hover:text-yellow-200 disabled:opacity-40"
                  >
                    <Camera className="h-3 w-3 shrink-0" />
                    Captura
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit('Muéstrame el DOM simplificado de la página actual')}
                    disabled={isSending}
                    className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[10px] font-bold text-zinc-500 transition hover:border-yellow-300/20 hover:text-yellow-200 disabled:opacity-40"
                  >
                    <Code2 className="h-3 w-3 shrink-0" />
                    Ver DOM
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNavInput((v) => !v)}
                    disabled={isSending}
                    className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[10px] font-bold text-zinc-500 transition hover:border-yellow-300/20 hover:text-yellow-200 disabled:opacity-40"
                  >
                    <Globe className="h-3 w-3 shrink-0" />
                    Navegar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJsInput((v) => !v)}
                    disabled={isSending}
                    className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[10px] font-bold text-zinc-500 transition hover:border-yellow-300/20 hover:text-yellow-200 disabled:opacity-40"
                  >
                    <Terminal className="h-3 w-3 shrink-0" />
                    Exec JS
                  </button>
                </div>

                {/* Nav input */}
                {showNavInput && (
                  <div className="mb-2 flex gap-1">
                    <input
                      type="url"
                      value={navInput}
                      onChange={(e) => setNavInput(e.target.value)}
                      placeholder="https://..."
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-yellow-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => { void submit(`Navega a esta URL: ${navInput}`); setNavInput(''); setShowNavInput(false); }}
                      disabled={!navInput.trim() || isSending}
                      className="shrink-0 rounded-xl bg-yellow-400 px-2.5 py-1.5 text-[10px] font-black text-black disabled:opacity-40"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* JS input */}
                {showJsInput && (
                  <div className="mb-2 flex flex-col gap-1">
                    <textarea
                      value={jsInput}
                      onChange={(e) => setJsInput(e.target.value)}
                      placeholder="document.title"
                      rows={2}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-yellow-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => { void submit(`Ejecuta este JavaScript en la página: ${jsInput}`); setJsInput(''); setShowJsInput(false); }}
                      disabled={!jsInput.trim() || isSending}
                      className="self-end rounded-xl bg-yellow-400 px-2.5 py-1 text-[10px] font-black text-black disabled:opacity-40"
                    >
                      Ejecutar
                    </button>
                  </div>
                )}

                {/* Last screenshot */}
                {lastScreenshot && (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lastScreenshot} alt="Última captura del agente" className="w-full" />
                    <p className="px-2 py-1 text-[9px] text-zinc-600">Última captura del agente</p>
                  </div>
                )}

                {/* Link to integrations */}
                <a href="/admin/integraciones" className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-700 hover:text-zinc-400 transition">
                  <ExternalLink className="h-3 w-3" />
                  Credenciales de IA
                </a>
              </div>

            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
