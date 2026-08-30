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
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir asistente Fabrick" className="fixed bottom-[calc(7.15rem+env(safe-area-inset-bottom))] right-4 z-[9500] flex h-12 items-center gap-2 rounded-full bg-[#08090A] px-3 text-[#FFF9EE] shadow-[0_14px_38px_rgba(0,0,0,.28)] ring-1 ring-[#FFB000]/35 transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F5871F] text-xs font-black text-[#08090A]">F</span>
          <span className="text-[10px] font-black uppercase tracking-[.12em]">Preguntar</span>
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#08090A] bg-emerald-400" />
        </button>
      ) : null}

      {open ? (
        <section role="dialog" aria-modal="true" aria-label="Asistente Fabrick" className="fixed inset-0 z-[9501] flex flex-col overflow-hidden bg-[#FFF9EE] text-[#08090A] shadow-[0_35px_110px_rgba(23,24,32,.42)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-[1.8rem] sm:ring-1 sm:ring-black/10" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#08090A] px-4 py-3 text-[#FFF9EE]">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F5871F] text-sm font-black text-[#08090A]">F</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">Fabrick</p><p className="mt-0.5 text-[9px] uppercase tracking-[.16em] text-white/38">Ordena tu proyecto antes de hablar con el equipo</p></div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
            {messages.length === 0 ? <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Orientación inicial</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Cuéntame lo que sabes. Yo te ayudo a ordenar lo que falta.</h2>
              <p className="mt-3 text-sm leading-6 text-black/48">Puedo ayudarte a identificar medidas, partidas, riesgos y preguntas útiles. Los datos técnicos y precios finales se confirman con el equipo.</p>
              <div className="mt-5 grid gap-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => void send(suggestion.prompt)} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-xs font-black transition hover:border-[#F5871F]">{suggestion.label}<span className="float-right text-[#B96F00]">→</span></button>)}</div>
            </div> : null}
            {messages.map((message) => <div key={message.id} className={`mt-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] whitespace-pre-wrap break-words rounded-[1.15rem] px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-sm bg-[#F5871F] text-[#08090A]' : 'rounded-bl-sm bg-white text-[#4f4945] ring-1 ring-black/8'}`}>{message.content}</div></div>)}
            {loading ? <div className="mt-3 text-xs font-bold text-black/35">Analizando…</div> : null}
            {error && messages.length === 0 ? <p className="mt-3 border-l-2 border-red-600 pl-3 text-xs font-semibold text-red-800">{error}</p> : null}
          </div>

          <footer className="shrink-0 border-t border-black/10 bg-[#FFF9EE]">
            {messages.length > 0 ? <div className="grid grid-cols-[1fr_auto] gap-2 px-3 pt-3">
              <a href={buildWhatsAppLink(advisorSummary)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#08090A] px-4 text-[10px] font-black text-[#FFF9EE]"><MessageCircle className="h-3.5 w-3.5" /> Enviar resumen al equipo</a>
              <button type="button" onClick={clearChat} className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-black/45" aria-label="Limpiar conversación"><Trash2 className="h-4 w-4" /></button>
            </div> : null}
            <form onSubmit={submit} className="flex items-end gap-2 p-3"><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }} rows={1} placeholder="Escribe una medida, duda o idea…" disabled={loading} className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#F5871F]" /><button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensaje" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F5871F] text-[#08090A] disabled:opacity-35"><Send className="h-4 w-4" /></button></form>
            <p className="px-4 pb-3 text-[8px] font-bold uppercase tracking-[.12em] text-black/28">Orientación por IA · confirma datos críticos con una persona</p>
          </footer>
        </section>
      ) : null}
    </>
  );
}

export type { AIAgentChatProps };
