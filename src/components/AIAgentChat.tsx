'use client';

/**
 * AIAgentChat — Botón flotante con un asistente IA (panel chat).
 *
 * Reemplaza al WhatsAppButton en la home pública. Características:
 *  - Botón flotante con animación de halo + onda + avatar de "agente".
 *  - Panel chat tipo aplicación nativa: en mobile ocupa pantalla completa con
 *    safe-area; en desktop es un recuadro flotante 380×560 con sombra.
 *  - Arrastrable en desktop: el usuario lo posiciona en cualquier esquina/borde.
 *    La posición se persiste en localStorage por origen.
 *  - Sugerencias rápidas (Metalcón, beneficios, permisos, tiempos).
 *  - Indicador "pensando" (3 puntos animados) que se sobrescribe con la
 *    respuesta cuando llega.
 *  - Backend: POST /api/agent/chat (que hace fallback transparente entre
 *    modelos gratuitos de OpenRouter).
 *  - Se oculta en /admin/*, /auth/*, /checkout/* (igual que WhatsAppButton).
 *  - Botón secundario "WhatsApp" si el usuario prefiere humano.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Send, X, Minimize2, MessageCircle, Sparkles, GripVertical } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type Role = 'user' | 'assistant';
interface Msg { id: string; role: Role; content: string }

interface AIAgentChatProps {
  hideOn?: string[];
}

const STORAGE_POS = 'fabrick.agent.position.v1';
const STORAGE_HISTORY = 'fabrick.agent.history.v1';
/** Mensajes a guardar localmente. El cliente conserva un historial más largo
 *  que el que envía al modelo: la API recorta a 12 antes de pasarlo al LLM
 *  para no quemar tokens, pero acá guardamos 24 para que el usuario pueda
 *  releer el contexto al reabrir el panel. */
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

/** Esquinas donde puede vivir el FAB cuando está cerrado o minimizado. */
type Anchor = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const ANCHOR_CLASSES: Record<Anchor, string> = {
  'bottom-right': 'bottom-5 right-5 sm:bottom-7 sm:right-7',
  'bottom-left':  'bottom-5 left-5 sm:bottom-7 sm:left-7',
  'top-right':    'top-20 right-5 sm:top-24 sm:right-7',
  'top-left':     'top-20 left-5 sm:top-24 sm:left-7',
};

function loadAnchor(): Anchor {
  if (typeof window === 'undefined') return 'bottom-right';
  try {
    const v = window.localStorage.getItem(STORAGE_POS);
    if (v === 'bottom-right' || v === 'bottom-left' || v === 'top-right' || v === 'top-left') return v;
  } catch { /* ignore */ }
  return 'bottom-right';
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
  try {
    window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch { /* quota / private mode */ }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AIAgentChat({
  hideOn = ['/admin', '/auth', '/checkout'],
}: AIAgentChatProps) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [anchor, setAnchor]     = useState<Anchor>('bottom-right');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const scrollRef  = useRef<HTMLDivElement | null>(null);
  const inputRef   = useRef<HTMLTextAreaElement | null>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Mount + restore saved state
  useEffect(() => {
    setMounted(true);
    setAnchor(loadAnchor());
    setMessages(loadHistory());
  }, []);

  // Persist history
  useEffect(() => { if (mounted) saveHistory(messages); }, [messages, mounted]);

  // Auto-scroll to bottom on new messages / loading
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  // Body scroll lock when panel is open on mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open && window.matchMedia('(max-width: 640px)').matches) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // ESC closes on desktop (keeps the agent button visible)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pickAnchor = useCallback((next: Anchor) => {
    setAnchor(next);
    try { window.localStorage.setItem(STORAGE_POS, next); } catch { /* ignore */ }
  }, []);

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
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; answer?: string; error?: string };
      if (!res.ok || !data.ok || typeof data.answer !== 'string') {
        const errMsg = data.error || 'No pude responder ahora. Intenta de nuevo o escríbenos por WhatsApp.';
        setError(errMsg);
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: errMsg },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: data.answer ?? '' },
        ]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError('No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.');
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content:
            'No logré conectarme al asistente. ¿Quieres conversar con nuestro equipo por WhatsApp?',
        },
      ]);
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

  // --- Visibility guards ---
  if (!mounted) return null;
  if (pathname && hideOn.some((p) => pathname.startsWith(p))) return null;

  const showFab = !open;

  return (
    <>
      {/* ── Floating Action Button ─────────────────────────────────── */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            key="fab"
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setOpen(true)}
            aria-label="Abrir asistente IA de Soluciones Fabrick"
            title="Pregúntale a Fabri, nuestro asistente"
            className={`group fixed z-[9500] ${ANCHOR_CLASSES[anchor]} pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 pl-3 pr-4 py-2.5 text-black shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-2 ring-yellow-300/40 transition-all duration-300 hover:shadow-[0_22px_60px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* Halo pulse animado, respeta reduced-motion */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full">
              <span className="absolute inset-0 rounded-full bg-yellow-400/40 blur-md motion-safe:animate-[fab-pulse_2.8s_ease-out_infinite]" />
            </span>
            {/* Avatar agente con anillo activo */}
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/90 ring-2 ring-yellow-200/60">
              <Bot size={18} className="text-yellow-300" aria-hidden />
              {/* Punto online */}
              <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-yellow-400 bg-emerald-400 motion-safe:animate-pulse" />
            </span>
            <span className="hidden sm:inline text-[11px] font-black tracking-[0.18em] uppercase">
              Pregúntale a Fabri
            </span>
            <style>{`
              @keyframes fab-pulse {
                0%   { transform: scale(1);   opacity: 0.55; }
                70%  { transform: scale(1.4); opacity: 0;    }
                100% { transform: scale(1.4); opacity: 0;    }
              }
            `}</style>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop sólo en mobile */}
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
              initial={prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.96 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.96 }
              }
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`fixed z-[9501] flex flex-col overflow-hidden bg-zinc-950 text-white shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10
                inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-x-auto rounded-none
                sm:rounded-3xl sm:w-[380px] sm:h-[560px] ${
                  // En desktop, posicionamos según el anchor elegido
                  anchor === 'bottom-right' ? 'sm:bottom-7 sm:right-7' :
                  anchor === 'bottom-left'  ? 'sm:bottom-7 sm:left-7'  :
                  anchor === 'top-right'    ? 'sm:top-24 sm:right-7'   :
                  /* top-left */              'sm:top-24 sm:left-7'
                }`}
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Header */}
              <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 px-4 py-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-300/40">
                  <Bot size={18} className="text-black" aria-hidden />
                  <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-400 motion-safe:animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black tracking-tight">Fabri · Asistente IA</p>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    En línea · Soluciones Fabrick
                  </p>
                </div>

                {/* Position picker (sólo desktop) */}
                <div className="hidden sm:flex items-center gap-1" aria-label="Mover panel">
                  <span className="mr-1 text-zinc-500" title="Mover el chat">
                    <GripVertical size={14} aria-hidden />
                  </span>
                  {(['top-left','top-right','bottom-left','bottom-right'] as Anchor[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => pickAnchor(a)}
                      aria-label={`Mover a ${a}`}
                      className={`h-2.5 w-2.5 rounded-sm border transition ${
                        anchor === a
                          ? 'border-yellow-300 bg-yellow-400'
                          : 'border-zinc-600 bg-zinc-800 hover:border-zinc-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Minimizar chat"
                  title="Minimizar"
                >
                  <Minimize2 size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Cerrar chat"
                  title="Cerrar"
                >
                  <X size={16} aria-hidden />
                </button>
              </header>

              {/* Mensajes + sugerencias */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
              >
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-white/5">
                      <p className="font-semibold text-yellow-300">¡Hola! 👋 Soy Fabri.</p>
                      <p className="mt-1 text-zinc-300">
                        Te ayudo con tus dudas sobre Metalcón, costos, permisos, tiempos y todo lo que necesites para
                        decidir tu proyecto con Soluciones Fabrick. ¿En qué te ayudo?
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map(({ label, prompt, icon: Icon }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onSuggestion(prompt)}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1.5 text-[11px] font-semibold text-yellow-200 transition hover:border-yellow-400/60 hover:bg-yellow-400/[0.12] hover:text-yellow-100"
                        >
                          <Icon size={11} aria-hidden className="text-yellow-300" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mt-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-gradient-to-br from-yellow-400 to-amber-500 text-black ring-yellow-300/40'
                          : 'rounded-bl-sm bg-zinc-900/80 text-zinc-200 ring-white/5'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="mt-3 flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 px-3.5 py-2.5 ring-1 ring-white/5">
                      <ThinkingDots />
                    </div>
                  </div>
                )}

                {error && messages.length === 0 && (
                  <p className="mt-3 text-xs text-red-300/90">{error}</p>
                )}
              </div>

              {/* Toolbar inferior */}
              <div className="flex-shrink-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
                {messages.length > 0 && (
                  <div className="flex items-center justify-between gap-2 px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <a
                      href={buildWhatsAppLink(WHATSAPP_FALLBACK_MSG)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
                    >
                      <MessageCircle size={11} aria-hidden /> Hablar con humano
                    </a>
                    <button
                      type="button"
                      onClick={clearChat}
                      className="text-zinc-500 transition hover:text-zinc-200"
                    >
                      Limpiar
                    </button>
                  </div>
                )}

                <form onSubmit={onSubmit} className="flex items-end gap-2 p-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDownTextarea}
                    rows={1}
                    placeholder="Escribe tu pregunta…"
                    aria-label="Mensaje al asistente"
                    disabled={loading}
                    className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none ring-yellow-400/0 transition focus:border-yellow-400/50 focus:ring-yellow-400/20 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={loading || input.trim().length === 0}
                    aria-label="Enviar mensaje"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={16} aria-hidden />
                  </button>
                </form>
                <p className="px-4 pb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                  Respuestas generadas por IA · Verifica datos críticos con nuestro equipo
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** Indicador "pensando" — 3 puntos saltarines + barra deslizante. */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" aria-label="Pensando" role="status">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-yellow-300"
            animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Fabri está pensando
      </span>
    </div>
  );
}

// Re-export the prop type so the layout can refer to it without recompiling.
export type { AIAgentChatProps };
