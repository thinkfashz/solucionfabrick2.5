'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, CheckCircle2, MessageCircle, Minimize2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }
interface AIAgentChatProps { hideOn?: string[] }
interface AgentOpenDetail { prompt?: string; autoSend?: boolean }

const STORAGE_HISTORY = 'fabrick.agent.history.v2';
const MAX_HISTORY = 24;
const SUGGESTIONS = [
  { label: 'Calcular un proyecto', prompt: '¿Cómo puedo calcular un proyecto y añadir servicios al presupuesto?' },
  { label: 'Construcción Metalcon', prompt: 'Explícame cuándo conviene construir con Metalcon en Chile y qué debe revisar un profesional.' },
  { label: 'Permisos de obra', prompt: 'Quiero ampliar mi casa. ¿Qué permisos debería revisar?' },
  { label: 'Tiempos de ejecución', prompt: '¿Qué factores definen el tiempo aproximado de una obra?' },
] as const;
const WHATSAPP_FALLBACK_MSG = 'Hola Soluciones Fabrick, estaba conversando con Fabrick y quiero revisar mi proyecto con una persona.';

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function loadHistory(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as Msg[]).filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-MAX_HISTORY);
  } catch { return []; }
}
function saveHistory(messages: Msg[]) {
  try { window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch {}
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
  useEffect(() => { const element = scrollRef.current; if (element) element.scrollTop = element.scrollHeight; }, [messages, loading, open]);
  useEffect(() => {
    if (!open || typeof document === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMessage: Msg = { id: newId(), role: 'user', content: trimmed };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((message) => ({ role: message.role, content: message.content })) }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; answer?: string; error?: string };
      if (!response.ok || !data.ok || typeof data.answer !== 'string') throw new Error(data.error || 'No pude responder ahora.');
      setMessages((current) => [...current, { id: newId(), role: 'assistant', content: data.answer || '' }]);
    } catch (requestError) {
      if ((requestError as Error).name === 'AbortError') return;
      const message = 'No pude conectarme. Puedes intentarlo nuevamente o hablar con nuestro equipo por WhatsApp.';
      setError(message);
      setMessages((current) => [...current, { id: newId(), role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, messages]);

  useEffect(() => {
    const openFromCalculator = (event: Event) => {
      const detail = (event as CustomEvent<AgentOpenDetail>).detail || {};
      const prompt = String(detail.prompt || '').trim();
      if (!prompt) return;
      setOpen(true);
      setError(null);
      if (detail.autoSend) window.setTimeout(() => void send(prompt), 60);
      else {
        setInput(prompt);
        window.setTimeout(() => inputRef.current?.focus(), 80);
      }
    };
    window.addEventListener('fabrick:agent-open', openFromCalculator as EventListener);
    return () => window.removeEventListener('fabrick:agent-open', openFromCalculator as EventListener);
  }, [send]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); void send(input); };
  const clearChat = () => { abortRef.current?.abort(); setMessages([]); setError(null); saveHistory([]); inputRef.current?.focus(); };

  if (!mounted) return null;
  if (pathname && hideOn.some((path) => pathname.startsWith(path))) return null;

  return (
    <>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir asistente Fabrick" className="fixed bottom-[calc(7.4rem+env(safe-area-inset-bottom))] right-4 z-[9500] grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#ccb196] shadow-[0_18px_48px_rgba(23,24,32,.3),0_0_0_6px_rgba(182,144,108,.18)] ring-1 ring-[#ccb196]/50 transition hover:-translate-y-1 hover:bg-[#242630] active:scale-95 sm:bottom-7 sm:right-7 sm:h-16 sm:w-16">
          <Bot className="h-6 w-6" /><span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#171820] bg-emerald-400" />
        </button>
      ) : null}

      {open ? (
        <>
          <button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)} className="fixed inset-0 z-[9499] bg-[#171820]/55 backdrop-blur-sm sm:hidden" />
          <section role="dialog" aria-modal="true" aria-label="Asistente IA Fabrick" className="fixed inset-0 z-[9501] flex flex-col overflow-hidden bg-[#f8f0e9] text-[#171820] shadow-[0_35px_110px_rgba(23,24,32,.42)] sm:inset-auto sm:bottom-7 sm:right-7 sm:h-[610px] sm:w-[390px] sm:rounded-[2rem] sm:ring-1 sm:ring-[#171820]/12" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <header className="flex shrink-0 items-center gap-3 bg-[#171820] px-4 py-3.5 text-[#f8f0e9]">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#b6906c] text-[#171820]"><Bot className="h-5 w-5" /><span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#171820] bg-emerald-400" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">Fabrick · Asistente</p><p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[.18em] text-[#ccb196]">En línea · orientación inicial</p></div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-[#c7bbb2] transition hover:bg-white/10 hover:text-white" aria-label="Minimizar"><Minimize2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-[#c7bbb2] transition hover:bg-red-400/15 hover:text-red-200" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
              {messages.length === 0 ? <div><div className="rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm ring-1 ring-[#171820]/8"><div className="flex items-center gap-2 text-[#765438]"><CheckCircle2 className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-[.12em]">Hola, soy Fabrick</p></div><p className="mt-3 text-sm leading-6 text-[#5f5853]">Puedo orientarte sobre servicios, calculadoras, permisos y próximos pasos. Los valores finales siempre se validan con el equipo.</p></div><div className="mt-4 grid gap-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => void send(suggestion.prompt)} className="flex items-center justify-between gap-3 rounded-2xl bg-[#ccb196]/28 px-4 py-3 text-left text-xs font-black text-[#5f4430] ring-1 ring-[#b6906c]/20 transition hover:bg-[#ccb196]/45"><span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />{suggestion.label}</span><span aria-hidden>→</span></button>)}</div></div> : null}
              {messages.map((message) => <div key={message.id} className={`mt-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-[1.35rem] px-3.5 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-[#b6906c] text-[#171820]' : 'rounded-bl-md bg-white text-[#4f4945] ring-1 ring-[#171820]/8'}`}>{message.content}</div></div>)}
              {loading ? <div className="mt-3 flex justify-start"><div className="flex items-center gap-2 rounded-[1.35rem] rounded-bl-md bg-white px-4 py-3 text-xs font-bold text-[#766d67] ring-1 ring-[#171820]/8"><span className="flex gap-1">{[0, 1, 2].map((index) => <span key={index} className="h-2 w-2 animate-bounce rounded-full bg-[#b6906c]" style={{ animationDelay: `${index * 120}ms` }} />)}</span> Pensando…</div></div> : null}
              {error && messages.length === 0 ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</p> : null}
            </div>

            <footer className="shrink-0 border-t border-[#171820]/10 bg-[#fffaf5]">
              {messages.length > 0 ? <div className="flex items-center justify-between gap-2 px-4 pt-3"><a href={buildWhatsAppLink(WHATSAPP_FALLBACK_MSG)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4ee] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-800"><MessageCircle className="h-3.5 w-3.5" /> Hablar con persona</a><button type="button" onClick={clearChat} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[#8a7f77]"><Trash2 className="h-3.5 w-3.5" /> Limpiar</button></div> : null}
              <form onSubmit={submit} className="flex items-end gap-2 p-3"><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }} rows={1} placeholder="Escribe tu pregunta…" disabled={loading} className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-[#f3ebe4] px-4 py-3 text-sm text-[#171820] outline-none ring-1 ring-[#171820]/10 placeholder:text-[#958980] focus:ring-[#9a6f4f]/50" /><button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensaje" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#171820] text-[#f8f0e9] shadow-[0_10px_26px_rgba(23,24,32,.18)] transition hover:bg-[#2a2c37] disabled:opacity-35"><Send className="h-4 w-4" /></button></form>
              <p className="px-4 pb-3 text-[8px] font-bold uppercase tracking-[.15em] text-[#9a8f87]">Orientación generada por IA · confirma datos críticos con el equipo</p>
            </footer>
          </section>
        </>
      ) : null}
    </>
  );
}

export type { AIAgentChatProps };
