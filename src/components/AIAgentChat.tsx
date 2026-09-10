'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }
interface AIAgentChatProps { hideOn?: string[] }
interface AgentOpenDetail { prompt?: string; autoSend?: boolean }
interface LauncherPosition { x: number; y: number }
interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

const STORAGE_HISTORY = 'fabrick.agent.history.v2';
const STORAGE_LAUNCHER_HIDDEN = 'fabrick.agent.launcher.hidden.v1';
const STORAGE_LAUNCHER_POSITION = 'fabrick.agent.launcher.position.v1';
const MAX_HISTORY = 24;
const LAUNCHER_SIZE = 62;
const LAUNCHER_MARGIN = 10;
const DRAG_THRESHOLD = 7;
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

function clampLauncherPosition(position: LauncherPosition): LauncherPosition {
  if (typeof window === 'undefined') return position;
  return {
    x: Math.min(Math.max(position.x, LAUNCHER_MARGIN), Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN)),
    y: Math.min(Math.max(position.y, 74), Math.max(74, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN)),
  };
}

function loadLauncherPosition(): LauncherPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_LAUNCHER_POSITION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LauncherPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return clampLauncherPosition({ x: parsed.x, y: parsed.y });
  } catch { return null; }
}

function saveLauncherPosition(position: LauncherPosition) {
  try { window.localStorage.setItem(STORAGE_LAUNCHER_POSITION, JSON.stringify(position)); } catch {}
}

function FabrickOrb({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'h-10 w-10' : 'h-[54px] w-[54px]';
  return (
    <span className={`relative block shrink-0 ${dimensions}`} aria-hidden="true">
      <span className="absolute -inset-2 rounded-full bg-[#F6C64A]/25 blur-xl motion-safe:animate-pulse" />
      <span className="absolute -inset-1 rounded-full border border-[#F6C64A]/35 opacity-80 motion-safe:animate-[spin_9s_linear_infinite]" />
      <span className="absolute -right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#FFE98A] shadow-[0_0_8px_#F6C64A] motion-safe:animate-ping" />
      <span className="absolute -left-0.5 bottom-1 h-1 w-1 rounded-full bg-[#FFF4B8] shadow-[0_0_7px_#F6C64A] motion-safe:animate-ping [animation-delay:700ms]" />
      <span className="absolute left-1/2 -top-1 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_7px_#F6C64A] motion-safe:animate-ping [animation-delay:1400ms]" />
      <span className="absolute inset-[2px] overflow-hidden rounded-full bg-[#050607] ring-1 ring-[#F6C64A]/45 shadow-[0_0_24px_rgba(246,198,74,.38)] motion-safe:animate-pulse">
        <img
          src={AI_ORB_URL}
          alt=""
          width={size === 'sm' ? 40 : 54}
          height={size === 'sm' ? 40 : 54}
          draggable={false}
          className="h-full w-full scale-[1.34] select-none object-cover object-[50%_32%]"
        />
      </span>
    </span>
  );
}

export default function AIAgentChat({ hideOn = ['/admin', '/auth', '/checkout'] }: AIAgentChatProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [launcherHidden, setLauncherHidden] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overDelete, setOverDelete] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const deleteZoneRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setMounted(true);
    setMessages(loadHistory());
    try { setLauncherHidden(window.localStorage.getItem(STORAGE_LAUNCHER_HIDDEN) === '1'); } catch {}
    setLauncherPosition(loadLauncherPosition());
  }, []);
  useEffect(() => { if (mounted) saveHistory(messages); }, [messages, mounted]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading, open]);
  useEffect(() => {
    if (!open || typeof document === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    const keepLauncherInsideViewport = () => {
      setLauncherPosition((current) => {
        if (!current) return current;
        const next = clampLauncherPosition(current);
        saveLauncherPosition(next);
        return next;
      });
    };
    window.addEventListener('resize', keepLauncherInsideViewport);
    return () => window.removeEventListener('resize', keepLauncherInsideViewport);
  }, []);

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
    const showLauncher = () => {
      setLauncherHidden(false);
      try { window.localStorage.removeItem(STORAGE_LAUNCHER_HIDDEN); } catch {}
    };
    window.addEventListener('fabrick:agent-open', openFromCalculator as EventListener);
    window.addEventListener('fabrick:agent-show', showLauncher);
    return () => {
      window.removeEventListener('fabrick:agent-open', openFromCalculator as EventListener);
      window.removeEventListener('fabrick:agent-show', showLauncher);
    };
  }, [send]);

  const isPointerOverDeleteZone = (clientX: number, clientY: number) => {
    const zone = deleteZoneRef.current?.getBoundingClientRect();
    if (!zone) return false;
    const padding = 24;
    return clientX >= zone.left - padding && clientX <= zone.right + padding && clientY >= zone.top - padding && clientY <= zone.bottom + padding;
  };

  const beginLauncherPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = launcherRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };

  const moveLauncherPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
    }
    event.preventDefault();
    const next = clampLauncherPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY });
    setLauncherPosition(next);
    setOverDelete(isPointerOverDeleteZone(event.clientX, event.clientY));
  };

  const finishLauncherPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragged = drag.moved;
    const shouldHide = wasDragged && isPointerOverDeleteZone(event.clientX, event.clientY);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    dragRef.current = null;
    setDragging(false);
    setOverDelete(false);

    if (shouldHide) {
      setLauncherHidden(true);
      try { window.localStorage.setItem(STORAGE_LAUNCHER_HIDDEN, '1'); } catch {}
      return;
    }

    if (wasDragged) {
      setLauncherPosition((current) => {
        if (current) saveLauncherPosition(current);
        return current;
      });
      return;
    }

    setOpen(true);
  };

  const cancelLauncherPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setOverDelete(false);
  };

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

  const launcherStyle = launcherPosition
    ? { left: launcherPosition.x, top: launcherPosition.y, right: 'auto', bottom: 'auto', touchAction: 'none' as const }
    : { touchAction: 'none' as const };

  return (
    <>
      {!open && !launcherHidden ? (
        <button
          ref={launcherRef}
          type="button"
          onPointerDown={beginLauncherPointer}
          onPointerMove={moveLauncherPointer}
          onPointerUp={finishLauncherPointer}
          onPointerCancel={cancelLauncherPointer}
          aria-label={dragging ? 'Mover asistente Fabrick IA' : 'Abrir asistente Fabrick IA'}
          title="Fabrick IA"
          className={`group fixed bottom-[calc(7.15rem+env(safe-area-inset-bottom))] right-3 z-[9500] grid h-[62px] w-[62px] select-none place-items-center rounded-full border bg-[#08090A]/94 p-1 shadow-[0_12px_34px_rgba(0,0,0,.44),0_0_30px_rgba(246,198,74,.18)] backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-200 sm:bottom-6 sm:right-6 ${dragging ? 'cursor-grabbing scale-105 border-[#F6C64A]/80 shadow-[0_16px_42px_rgba(0,0,0,.5),0_0_36px_rgba(246,198,74,.34)]' : 'cursor-grab border-[#F6C64A]/42 hover:-translate-y-0.5 hover:border-[#F6C64A]/70'}`}
          style={launcherStyle}
        >
          <FabrickOrb />
        </button>
      ) : null}

      {dragging && !open && !launcherHidden ? (
        <div
          ref={deleteZoneRef}
          className={`pointer-events-none fixed bottom-[calc(7.15rem+env(safe-area-inset-bottom))] left-1/2 z-[9502] grid h-[68px] w-[68px] -translate-x-1/2 place-items-center rounded-full border backdrop-blur-xl transition-all duration-150 sm:bottom-6 ${overDelete ? 'scale-110 border-red-400/80 bg-red-500/22 text-red-100 shadow-[0_0_34px_rgba(248,113,113,.34)]' : 'border-white/16 bg-[#08090A]/88 text-white/65 shadow-[0_12px_32px_rgba(0,0,0,.34)]'}`}
          aria-hidden="true"
        >
          <X className={`h-7 w-7 transition-transform ${overDelete ? 'scale-110' : ''}`} strokeWidth={2.2} />
        </div>
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
