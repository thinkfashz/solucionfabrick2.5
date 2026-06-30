'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Send, X, Minimize2, MessageCircle, Sparkles } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }

interface AIAgentChatProps {
  hideOn?: string[];
}

const STORAGE_POS = 'fabrick.agent.position.free.v1';
const STORAGE_HISTORY = 'fabrick.agent.history.v1';
const MAX_HISTORY = 24;

const SUGGESTIONS = [
  { label: '¿Qué es Metalcón?', icon: Sparkles, prompt: '¿Qué es Metalcón y por qué lo recomiendan para mi casa?' },
  { label: 'Por qué elegirlos',  icon: Sparkles, prompt: '¿Por qué debería contratar a Soluciones Fabrick para mi proyecto?' },
  { label: 'Permisos de obra',   icon: Sparkles, prompt: 'Quiero ampliar mi casa, ¿qué permisos necesito y cuánto demoran?' },
  { label: 'Tiempos de obra',    icon: Sparkles, prompt: '¿Cuánto se demora una casa de 100 m² en Metalcón?' },
  { label: 'Beneficios Metalcón',icon: Sparkles, prompt: 'Compárame Metalcón vs hormigón vs madera para una casa nueva.' },
] as const;

const WHATSAPP_FALLBACK_MSG =
  'Hola Soluciones Fabrick, estaba conversando con el asistente del sitio y me gustaría hablar con una persona. ¿Me pueden ayudar?';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function defaultPosition() {
  if (typeof window === 'undefined') return { x: 18, y: 420 };
  return {
    x: Math.max(14, window.innerWidth - 88),
    y: Math.max(92, window.innerHeight - 190),
  };
}

function safePosition(pos: { x: number; y: number }) {
  if (typeof window === 'undefined') return pos;
  return {
    x: clamp(pos.x, 12, Math.max(12, window.innerWidth - 74)),
    y: clamp(pos.y, 76, Math.max(90, window.innerHeight - 112)),
  };
}

function loadPosition() {
  if (typeof window === 'undefined') return defaultPosition();
  try {
    const raw = window.localStorage.getItem(STORAGE_POS);
    if (!raw) return defaultPosition();
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultPosition();
    return safePosition({ x: parsed.x, y: parsed.y });
  } catch {
    return defaultPosition();
  }
}

function savePosition(pos: { x: number; y: number }) {
  try { window.localStorage.setItem(STORAGE_POS, JSON.stringify(pos)); } catch {}
}

function loadHistory(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as Msg[])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY);
  } catch { return []; }
}

function saveHistory(msgs: Msg[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(msgs.slice(-MAX_HISTORY))); } catch {}
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AIAgentChat({ hideOn = ['/admin', '/auth', '/checkout'] }: AIAgentChatProps) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 18, y: 420 });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef({ active: false, moved: false, dx: 0, dy: 0 });

  useEffect(() => {
    setMounted(true);
    setPos(loadPosition());
    setMessages(loadHistory());
  }, []);

  useEffect(() => { if (mounted) saveHistory(messages); }, [messages, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setPos((current) => {
      const next = safePosition(current);
      savePosition(next);
      return next;
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mounted]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open && window.matchMedia('(max-width: 640px)').matches) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);

    const userMsg: Msg = { id: newId(), role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; answer?: string; error?: string };
      if (!res.ok || !data.ok || typeof data.answer !== 'string') {
        const errMsg = data.error || 'No pude responder ahora. Intenta de nuevo o escríbenos por WhatsApp.';
        setError(errMsg);
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: errMsg }]);
      } else {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: data.answer ?? '' }]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError('No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.');
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: 'No logré conectarme al asistente. ¿Quieres conversar con nuestro equipo por WhatsApp?' }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, messages]);

  const onSuggestion = useCallback((prompt: string) => {
    if (loading) return;
    send(prompt);
  }, [loading, send]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  }, [send, input]);

  const onKeyDownTextarea = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }, [input, send]);

  const clearChat = useCallback(() => {
    setMessages([]);
    saveHistory([]);
    setError(null);
    inputRef.current?.focus();
  }, []);

  if (!mounted) return null;
  if (pathname && hideOn.some((p) => pathname.startsWith(p))) return null;

  const showFab = !open;

  return (
    <>
      <AnimatePresence>
        {showFab && (
          <motion.button
            key="fab"
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(event) => {
              dragRef.current = { active: true, moved: false, dx: event.clientX - pos.x, dy: event.clientY - pos.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current.active) return;
              const next = safePosition({ x: event.clientX - dragRef.current.dx, y: event.clientY - dragRef.current.dy });
              if (Math.abs(next.x - pos.x) > 2 || Math.abs(next.y - pos.y) > 2) dragRef.current.moved = true;
              setPos(next);
            }}
            onPointerUp={(event) => {
              dragRef.current.active = false;
              const next = safePosition(pos);
              setPos(next);
              savePosition(next);
              try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
            }}
            onClick={(event) => {
              if (dragRef.current.moved) {
                dragRef.current.moved = false;
                event.preventDefault();
                return;
              }
              setOpen(true);
            }}
            aria-label="Abrir y mover asistente IA de Soluciones Fabrick"
            title="Mover o abrir Fabri, nuestro asistente"
            className="group fixed z-[9500] grid h-16 w-16 touch-none place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 p-2 text-black shadow-[0_18px_48px_rgba(250,146,21,0.42),0_0_0_7px_rgba(250,204,21,.12)] ring-1 ring-yellow-200/70 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-[72px] sm:w-[72px]"
            style={{ left: pos.x, top: pos.y, WebkitTapHighlightColor: 'transparent' }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-yellow-400/30 blur-md motion-safe:animate-[fab-pulse_2.8s_ease-out_infinite]" />
            <span className="relative grid h-full w-full place-items-center rounded-full bg-black/92 ring-2 ring-yellow-100/50">
              <Bot size={22} className="text-yellow-300" aria-hidden />
              <span className="absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full border-2 border-yellow-400 bg-emerald-400 motion-safe:animate-pulse" />
            </span>
            <style>{`
              @keyframes fab-pulse { 0% { transform: scale(1); opacity: .55; } 70%, 100% { transform: scale(1.42); opacity: 0; } }
            `}</style>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9499] bg-black/55 backdrop-blur-sm sm:hidden"
              aria-hidden
            />
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Asistente IA Fabri"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 top-0 z-[9501] flex flex-col overflow-hidden rounded-none bg-zinc-950 text-white shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:inset-x-auto sm:bottom-7 sm:right-7 sm:top-auto sm:h-[560px] sm:w-[380px] sm:rounded-3xl"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 px-4 py-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-300/40">
                  <Bot size={18} className="text-black" aria-hidden />
                  <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-400 motion-safe:animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black tracking-tight">Fabri · Asistente IA</p>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">En línea · Soluciones Fabrick</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Minimizar chat" title="Minimizar">
                  <Minimize2 size={16} aria-hidden />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Cerrar chat" title="Cerrar">
                  <X size={16} aria-hidden />
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-white/5">
                      <p className="font-semibold text-yellow-300">¡Hola! 👋 Soy Fabri.</p>
                      <p className="mt-1 text-zinc-300">Te ayudo con dudas sobre Metalcón, costos, permisos, tiempos y todo lo que necesites para decidir tu proyecto con Soluciones Fabrick. ¿En qué te ayudo?</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map(({ label, prompt, icon: Icon }) => (
                        <button key={label} type="button" onClick={() => onSuggestion(prompt)} className="group inline-flex items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1.5 text-[11px] font-semibold text-yellow-200 transition hover:border-yellow-400/60 hover:bg-yellow-400/[0.12] hover:text-yellow-100">
                          <Icon size={11} aria-hidden className="text-yellow-300" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`mt-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ${m.role === 'user' ? 'rounded-br-sm bg-gradient-to-br from-yellow-400 to-amber-500 text-black ring-yellow-300/40' : 'rounded-bl-sm bg-zinc-900/80 text-zinc-200 ring-white/5'}`}>{m.content}</div>
                  </div>
                ))}

                {loading && <div className="mt-3 flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-3.5 py-2.5 ring-1 ring-white/5"><ThinkingDots /></div></div>}
                {error && messages.length === 0 && <p className="mt-3 text-xs text-red-300/90">{error}</p>}
              </div>

              <div className="flex-shrink-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
                {messages.length > 0 && (
                  <div className="flex items-center justify-between gap-2 px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <a href={buildWhatsAppLink(WHATSAPP_FALLBACK_MSG)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"><MessageCircle size={11} aria-hidden /> Hablar con humano</a>
                    <button type="button" onClick={clearChat} className="text-zinc-500 transition hover:text-zinc-200">Limpiar</button>
                  </div>
                )}
                <form onSubmit={onSubmit} className="flex items-end gap-2 p-3">
                  <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDownTextarea} rows={1} placeholder="Escribe tu pregunta…" aria-label="Mensaje al asistente" disabled={loading} className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none ring-yellow-400/0 transition focus:border-yellow-400/50 focus:ring-yellow-400/20 disabled:opacity-60" />
                  <button type="submit" disabled={loading || input.trim().length === 0} aria-label="Enviar mensaje" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} aria-hidden /></button>
                </form>
                <p className="px-4 pb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Respuestas generadas por IA · Verifica datos críticos con nuestro equipo</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" aria-label="Pensando" role="status">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="block h-2 w-2 rounded-full bg-yellow-300" animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }} />
        ))}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Fabri está pensando</span>
    </div>
  );
}

export type { AIAgentChatProps };
