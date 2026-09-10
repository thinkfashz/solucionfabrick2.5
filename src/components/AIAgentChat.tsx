'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }
interface AIAgentChatProps { hideOn?: string[] }
interface AgentOpenDetail { prompt?: string; autoSend?: boolean }

const STORAGE_HISTORY = 'fabrick.agent.history.v2';
const MAX_HISTORY = 24;
const AI_ORB_URL = 'https://res.cloudinary.com/disghf6xc/image/upload/v1789074208/fabrick-ai-orb-v1.webp';
const SUGGESTIONS = [
  { label: 'No sé por dónde empezar', prompt: 'Quiero hacer un proyecto de construcción o remodelación, pero no sé qué información necesito reunir antes de cotizar. Hazme las preguntas mínimas para ordenar la idea.' },
  { label: 'Tengo medidas', prompt: 'Ya tengo algunas medidas de mi proyecto. Ayúdame a identificar qué servicios debería calcular y qué datos me faltan antes de pedir una cotización.' },
  { label: 'Quiero comparar opciones', prompt: 'Ayúdame a comparar alternativas para mi proyecto sin inventar precios finales. Quiero entender partidas, riesgos, materiales y qué debería confirmar con el equipo.' },
  { label: 'Revisar permisos y riesgos', prompt: 'Quiero saber qué permisos, condiciones del terreno, instalaciones o riesgos debería revisar antes de ejecutar una ampliación o remodelación en Chile.' },
] as const;

function newId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function loadHistory(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as Msg[]).filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-MAX_HISTORY);
  } catch { return []; }
}
function saveHistory(messages: Msg[]) { try { window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch {} }

function FabrickOrb({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'h-10 w-10' : 'h-[52px] w-[52px]';
  return (
    <span className={`relative block shrink-0 ${dimensions}`} aria-hidden="true">
      <span className="absolute -inset-1 rounded-full bg-[#F6C64A]/30 blur-md motion-safe:animate-pulse" />
      <span className="absolute -inset-0.5 rounded-full border border-[#F6C64A]/45" />
      <img
        src={AI_ORB_URL}
        alt=""
        width={size === 'sm' ? 40 : 52}
        height={size === 'sm' ? 40 : 52}
        className="relative h-full w-full rounded-full object-cover shadow-[0_0_22px_rgba(246,198,74,.35)]"
      />
    </span>
  );
}

export default function AIAgentChat({ hideOn = ['/admin', '/auth', '/checkout'] }: AIAgentChatProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setMounted(true); setMessages(loadHistory()); }, []);
  useEffect(() => { if (mounted) saveHistory(messages); }, [messages, mounted]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading, open]);
  useEffect(() => {
    if (!open || typeof document === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMessage: Msg = { id: newId(), role: 'user', content: trimmed };
    const next = [...messages, userMessage];
    setMessages(next); setInput(''); setError(null); setLoading(true);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((message) => ({ role: message.role, content: message.content })) }), signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; answer?: string; error?: string };
      if (!response.ok || !data.ok || typeof data.answer !== 'string') throw new Error(data.error || 'No pude responder ahora.');
      setMessages((current) => [...current, { id: newId(), role: 'assistant', content: data.answer || '' }]);
    } catch (requestError) {
      if ((requestError as Error).name === 'AbortError') return;
      const message = 'No pude conectarme ahora. Puedes continuar después o enviar el resumen al equipo por WhatsApp.';
      setError(message);
      setMessages((current) => [...current, { id: newId(), role: 'assistant', content: message }]);
    } finally { setLoading(false); abortRef.current = null; }
  }, [loading, messages]);

  useEffect(() => {
    const openFromCalculator = (event: Event) => {
      const detail = (event as CustomEvent<AgentOpenDetail>).detail || {};
      const prompt = String(detail.prompt || '').trim();
      if (!prompt) return;
      setOpen(true); setError(null);
      if (detail.autoSend) window.setTimeout(() => void send(prompt), 60);
      else { setInput(prompt); window.setTimeout(() => inputRef.current?.focus(), 80); }
    };
    window.addEventListener('fabrick:agent-open', openFromCalculator as EventListener);
    return () => window.removeEventListener('fabrick:agent-open', openFromCalculator as EventListener);
  }, [send]);

  const advisorSummary = useMemo(() => {
    const recent = messages.slice(-12);
    if (!recent.length) return 'Hola Soluciones Fabrick, quiero ordenar mi proyecto con una persona.';
    const transcript = recent.map((message) => `${message.role === 'user' ? 'Cliente' : 'Fabrick'}: ${message.content}`).join('\n\n');
    return [
      'Hola Soluciones Fabrick, estuve usando el asistente y quiero continuar con una persona.',
      '',
      'RESUMEN DE LA CONVERSACIÓN',
      transcript.slice(0, 3200),
      '',
      'Quiero confirmar qué información falta y cuál sería el siguiente paso.',
    ].join('\n');
  }, [messages]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); void send(input); };
  const clearChat = () => { abortRef.current?.abort(); setMessages([]); setError(null); saveHistory([]); inputRef.current?.focus(); };

  if (!mounted) return null;
  if (pathname && (pathname.startsWith('/fundador') || hideOn.some((path) => pathname.startsWith(path)))) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente Fabrick IA"
          className="group fixed bottom-[calc(7.15rem+env(safe-area-inset-bottom))] right-3 z-[9500] flex min-h-[64px] items-center gap-2 rounded-full border border-[#F6C64A]/40 bg-[#08090A]/95 p-1.5 pr-4 text-[#FFF9EE] shadow-[0_14px_42px_rgba(0,0,0,.42),0_0_26px_rgba(246,198,74,.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#F6C64A]/65 sm:bottom-6 sm:right-6"
        >
          <FabrickOrb />
          <span className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-bold uppercase tracking-[.16em] text-white/52">Preguntar a</span>
            <span className="mt-1.5 text-sm font-black tracking-[-.02em] text-[#F6C64A]">Fabrick IA</span>
          </span>
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[#08090A] bg-emerald-400" />
        </button>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Asistente Fabrick IA"
          className="fixed inset-0 z-[9501] flex flex-col overflow-hidden bg-[#08090A] text-[#FFF9EE] shadow-[0_35px_110px_rgba(0,0,0,.62)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-[1.8rem] sm:ring-1 sm:ring-[#F6C64A]/25"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-[#F6C64A]/15 bg-[#08090A] px-4 py-3 text-[#FFF9EE]">
            <FabrickOrb size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">Fabrick IA</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[.16em] text-white/38">Ordena tu proyecto antes de hablar con el equipo</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-white/5 text-white/60 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
            {messages.length === 0 ? <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Orientación inicial</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em] text-white">Cuéntame lo que sabes. Yo te ayudo a ordenar lo que falta.</h2>
              <p className="mt-3 text-sm leading-6 text-white/48">Puedo ayudarte a identificar medidas, partidas, riesgos y preguntas útiles. Los datos técnicos y precios finales se confirman con el equipo.</p>
              <div className="mt-5 grid gap-2">
                {SUGGESTIONS.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => void send(suggestion.prompt)} className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-left text-xs font-black text-white transition hover:border-[#F6C64A]/60 hover:bg-[#F6C64A]/[.06]">{suggestion.label}<span className="float-right text-[#F6C64A]">→</span></button>)}
              </div>
            </div> : null}
            {messages.map((message) => <div key={message.id} className={`mt-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] whitespace-pre-wrap break-words rounded-[1.15rem] px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-sm bg-[#F6C64A] text-[#08090A]' : 'rounded-bl-sm bg-white/[.065] text-white/82 ring-1 ring-white/8'}`}>{message.content}</div></div>)}
            {loading ? <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white/38"><span className="h-2 w-2 rounded-full bg-[#F6C64A] motion-safe:animate-pulse" /> Analizando…</div> : null}
            {error && messages.length === 0 ? <p className="mt-3 border-l-2 border-red-500 pl-3 text-xs font-semibold text-red-300">{error}</p> : null}
          </div>

          <footer className="shrink-0 border-t border-[#F6C64A]/12 bg-[#08090A]">
            {messages.length > 0 ? <div className="grid grid-cols-[1fr_auto] gap-2 px-3 pt-3">
              <a href={buildWhatsAppLink(advisorSummary)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.08] px-4 text-[10px] font-black text-[#F6C64A]"><MessageCircle className="h-3.5 w-3.5" /> Enviar resumen al equipo</a>
              <button type="button" onClick={clearChat} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/45" aria-label="Limpiar conversación"><Trash2 className="h-4 w-4" /></button>
            </div> : null}
            <form onSubmit={submit} className="flex items-end gap-2 p-3">
              <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }} rows={1} placeholder="Escribe una medida, duda o idea…" disabled={loading} className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white/[.055] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#F6C64A]/65" />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensaje" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[#08090A] shadow-[0_8px_24px_rgba(246,198,74,.18)] disabled:opacity-35"><Send className="h-4 w-4" /></button>
            </form>
            <p className="px-4 pb-3 text-[8px] font-bold uppercase tracking-[.12em] text-white/24">Orientación por IA · confirma datos críticos con una persona</p>
          </footer>
        </section>
      ) : null}
    </>
  );
}

export type { AIAgentChatProps };
