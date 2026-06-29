'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, GripVertical, MessageCircle, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }
interface AIAgentChatProps { hideOn?: string[] }
type Anchor = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type Point = { x: number; y: number };

const STORAGE_ANCHOR = 'fabrick.agent.anchor.v1';
const STORAGE_BUBBLE_POS = 'fabrick.agent.bubble.position.v1';
const STORAGE_HISTORY = 'fabrick.agent.history.v1';
const MAX_HISTORY = 24;
const FAB_SIZE = 76;
const FAB_MARGIN = 12;
const WHATSAPP_FALLBACK_MSG = 'Hola Soluciones Fabrick, estaba conversando con el asistente del sitio y me gustaría hablar con una persona. ¿Me pueden ayudar?';

const SUGGESTIONS = [
  { label: '¿Qué es Metalcón?', icon: Sparkles, prompt: '¿Qué es Metalcón y por qué lo recomiendan para mi casa?' },
  { label: 'Por qué elegirlos', icon: Sparkles, prompt: '¿Por qué debería contratar a Soluciones Fabrick para mi proyecto?' },
  { label: 'Permisos de obra', icon: Sparkles, prompt: 'Quiero ampliar mi casa, ¿qué permisos necesito y cuánto demoran?' },
  { label: 'Tiempos de obra', icon: Sparkles, prompt: '¿Cuánto se demora una casa de 100 m² en Metalcón?' },
  { label: 'Beneficios Metalcón', icon: Sparkles, prompt: 'Compárame Metalcón vs hormigón vs madera para una casa nueva.' },
] as const;

function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function isAnchor(value: string | null): value is Anchor { return value === 'bottom-right' || value === 'bottom-left' || value === 'top-right' || value === 'top-left'; }
function newId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

function defaultBubblePosition(): Point {
  if (typeof window === 'undefined') return { x: 24, y: 420 };
  const bottomMargin = window.matchMedia('(max-width: 640px)').matches ? 78 : 28;
  return { x: Math.max(FAB_MARGIN, window.innerWidth - FAB_SIZE - 20), y: Math.max(FAB_MARGIN, window.innerHeight - FAB_SIZE - bottomMargin) };
}

function clampBubble(point: Point): Point {
  if (typeof window === 'undefined') return point;
  return {
    x: clamp(point.x, FAB_MARGIN, Math.max(FAB_MARGIN, window.innerWidth - FAB_SIZE - FAB_MARGIN)),
    y: clamp(point.y, FAB_MARGIN, Math.max(FAB_MARGIN, window.innerHeight - FAB_SIZE - FAB_MARGIN)),
  };
}

function anchorFromPoint(point: Point): Anchor {
  if (typeof window === 'undefined') return 'bottom-right';
  const left = point.x + FAB_SIZE / 2 < window.innerWidth / 2;
  const top = point.y + FAB_SIZE / 2 < window.innerHeight / 2;
  if (top && left) return 'top-left';
  if (top && !left) return 'top-right';
  if (!top && left) return 'bottom-left';
  return 'bottom-right';
}

function loadAnchor(): Anchor {
  if (typeof window === 'undefined') return 'bottom-right';
  try {
    const value = window.localStorage.getItem(STORAGE_ANCHOR);
    return isAnchor(value) ? value : 'bottom-right';
  } catch { return 'bottom-right'; }
}

function saveAnchor(anchor: Anchor) { try { window.localStorage.setItem(STORAGE_ANCHOR, anchor); } catch {} }
function saveBubble(point: Point) { try { window.localStorage.setItem(STORAGE_BUBBLE_POS, JSON.stringify(clampBubble(point))); } catch {} }

function loadBubble(): Point {
  if (typeof window === 'undefined') return { x: 24, y: 420 };
  try {
    const raw = window.localStorage.getItem(STORAGE_BUBBLE_POS);
    if (!raw) return defaultBubblePosition();
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultBubblePosition();
    return clampBubble({ x: parsed.x, y: parsed.y });
  } catch { return defaultBubblePosition(); }
}

function loadHistory(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Msg[];
    return Array.isArray(parsed) ? parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-MAX_HISTORY) : [];
  } catch { return []; }
}

function saveHistory(messages: Msg[]) { try { window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch {} }

export default function AIAgentChat({ hideOn = ['/admin', '/auth', '/checkout'] }: AIAgentChatProps) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>('bottom-right');
  const [bubblePos, setBubblePos] = useState<Point>({ x: 24, y: 420 });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0 });

  useEffect(() => { setMounted(true); setAnchor(loadAnchor()); setBubblePos(loadBubble()); setMessages(loadHistory()); }, []);
  useEffect(() => { if (mounted) saveHistory(messages); }, [messages, mounted]);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, loading, open]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setBubblePos((prev) => { const next = clampBubble(prev); saveBubble(next); return next; });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { id: newId(), role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; answer?: string; error?: string };
      const content = res.ok && data.ok && typeof data.answer === 'string' ? data.answer : data.error || 'No pude responder ahora. Intenta de nuevo o escríbenos por WhatsApp.';
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content }]);
    } catch {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: 'No logré conectarme al asistente. ¿Quieres conversar con nuestro equipo por WhatsApp?' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  function commit(point: Point) {
    const next = clampBubble(point);
    const nextAnchor = anchorFromPoint(next);
    setBubblePos(next);
    setAnchor(nextAnchor);
    saveBubble(next);
    saveAnchor(nextAnchor);
  }

  function onBubblePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    drag.current = { active: true, moved: false, dx: event.clientX - bubblePos.x, dy: event.clientY - bubblePos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onBubblePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current.active) return;
    const next = clampBubble({ x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy });
    if (Math.abs(next.x - bubblePos.x) > 3 || Math.abs(next.y - bubblePos.y) > 3) drag.current.moved = true;
    setBubblePos(next);
  }

  function onBubblePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const wasMoved = drag.current.moved;
    drag.current.active = false;
    commit(bubblePos);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    if (!wasMoved) setOpen(true);
  }

  function pickAnchor(next: Anchor) { setAnchor(next); saveAnchor(next); }
  function clearChat() { setMessages([]); saveHistory([]); inputRef.current?.focus(); }
  function onSubmit(event: FormEvent) { event.preventDefault(); void send(input); }
  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }

  if (!mounted) return null;
  if (pathname && hideOn.some((p) => pathname.startsWith(p))) return null;

  return <>
    <AnimatePresence>
      {!open && <motion.button
        key="fab"
        type="button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        onPointerDown={onBubblePointerDown}
        onPointerMove={onBubblePointerMove}
        onPointerUp={onBubblePointerUp}
        onPointerCancel={onBubblePointerUp}
        aria-label="Mover o abrir asistente IA de Soluciones Fabrick"
        title="Arrastra para mover · toca para abrir"
        className="fixed z-[9500] grid h-[76px] w-[76px] touch-none place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 p-2 text-black shadow-[0_18px_48px_rgba(0,0,0,0.5),0_0_0_8px_rgba(250,204,21,0.12)] ring-2 ring-yellow-200/70 transition active:scale-95 active:cursor-grabbing sm:hover:scale-[1.04]"
        style={{ left: bubblePos.x, top: bubblePos.y, WebkitTapHighlightColor: 'transparent' }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full"><span className="absolute inset-0 rounded-full bg-yellow-400/40 blur-md motion-safe:animate-[fab-pulse_2.8s_ease-out_infinite]" /></span>
        <span className="relative grid h-full w-full place-items-center rounded-full bg-black/95 ring-2 ring-yellow-100/70"><Bot size={25} className="text-yellow-300" aria-hidden /><span className="absolute -bottom-0.5 -right-0.5 block h-4 w-4 rounded-full border-2 border-black bg-emerald-400 motion-safe:animate-pulse" /></span>
        <span className="sr-only">Arrastra para mover la burbuja. Toca para abrir el chat.</span>
        <style>{`@keyframes fab-pulse{0%{transform:scale(1);opacity:.55}70%{transform:scale(1.4);opacity:0}100%{transform:scale(1.4);opacity:0}}`}</style>
      </motion.button>}
    </AnimatePresence>

    <AnimatePresence>
      {open && <>
        <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[9499] bg-black/55 backdrop-blur-sm sm:hidden" aria-hidden />
        <motion.div key="panel" role="dialog" aria-modal="true" aria-label="Asistente IA Fabri" initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className={`fixed z-[9501] flex flex-col overflow-hidden bg-zinc-950 text-white shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10 inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-x-auto rounded-none sm:rounded-3xl sm:w-[380px] sm:h-[560px] ${anchor === 'bottom-right' ? 'sm:bottom-7 sm:right-7' : anchor === 'bottom-left' ? 'sm:bottom-7 sm:left-7' : anchor === 'top-right' ? 'sm:top-24 sm:right-7' : 'sm:top-24 sm:left-7'}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 px-4 py-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-300/40"><Bot size={18} className="text-black" aria-hidden /><span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-400 motion-safe:animate-pulse" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black tracking-tight">Fabri · Asistente IA</p><p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">En línea · Soluciones Fabrick</p></div>
            <div className="hidden items-center gap-1 sm:flex" aria-label="Mover panel"><span className="mr-1 text-zinc-500" title="Mover el chat"><GripVertical size={14} aria-hidden /></span>{(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Anchor[]).map((item) => <button key={item} type="button" onClick={() => pickAnchor(item)} aria-label={`Mover a ${item}`} className={`h-2.5 w-2.5 rounded-sm border transition ${anchor === item ? 'border-yellow-300 bg-yellow-400' : 'border-zinc-600 bg-zinc-800 hover:border-zinc-400'}`} />)}</div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Minimizar chat"><Minimize2 size={16} aria-hidden /></button>
            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Cerrar chat"><X size={16} aria-hidden /></button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
            {messages.length === 0 && <div className="space-y-3"><div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-white/5"><p className="font-semibold text-yellow-300">¡Hola! 👋 Soy Fabri.</p><p className="mt-1 text-zinc-300">Te ayudo con Metalcón, costos, permisos, tiempos y tus dudas de compra o instalación.</p></div><div className="flex flex-wrap gap-2 pt-1">{SUGGESTIONS.map(({ label, prompt, icon: Icon }) => <button key={label} type="button" onClick={() => void send(prompt)} className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1.5 text-[11px] font-semibold text-yellow-200 transition hover:border-yellow-400/60 hover:bg-yellow-400/[0.12]"><Icon size={11} aria-hidden className="text-yellow-300" />{label}</button>)}</div></div>}
            {messages.map((m) => <div key={m.id} className={`mt-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ${m.role === 'user' ? 'rounded-br-sm bg-gradient-to-br from-yellow-400 to-amber-500 text-black ring-yellow-300/40' : 'rounded-bl-sm bg-zinc-900/80 text-zinc-200 ring-white/5'}`}>{m.content}</div></div>)}
            {loading && <div className="mt-3 flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-3.5 py-2.5 ring-1 ring-white/5"><ThinkingDots /></div></div>}
          </div>

          <div className="flex-shrink-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
            {messages.length > 0 && <div className="flex items-center justify-between gap-2 px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em]"><a href={buildWhatsAppLink(WHATSAPP_FALLBACK_MSG)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-400"><MessageCircle size={11} aria-hidden /> Hablar con humano</a><button type="button" onClick={clearChat} className="text-zinc-500 transition hover:text-zinc-200">Limpiar</button></div>}
            <form onSubmit={onSubmit} className="flex items-end gap-2 p-3"><textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1} placeholder="Escribe tu pregunta…" aria-label="Mensaje al asistente" disabled={loading} className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400/50 disabled:opacity-60" /><button type="submit" disabled={loading || input.trim().length === 0} aria-label="Enviar mensaje" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition hover:brightness-110 disabled:opacity-40"><Send size={16} aria-hidden /></button></form>
            <p className="px-4 pb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Respuestas generadas por IA · Verifica datos críticos con nuestro equipo</p>
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  </>;
}

function ThinkingDots() {
  return <div className="flex items-center gap-2"><div className="flex items-center gap-1" aria-label="Pensando" role="status">{[0, 1, 2].map((i) => <motion.span key={i} className="block h-2 w-2 rounded-full bg-yellow-300" animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }} />)}</div><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Fabri está pensando</span></div>;
}

export type { AIAgentChatProps };
