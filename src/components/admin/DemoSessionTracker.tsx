'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, MessageSquare, Send } from 'lucide-react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.split('=').slice(1).join('=')) : null;
}

function getSessionId(): string {
  const cookieSid = getCookie('sf_demo_sid');
  if (cookieSid) return cookieSid;
  try {
    let sid = sessionStorage.getItem('_sf_demo_sid');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('_sf_demo_sid', sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

function postEvent(payload: Record<string, unknown>, keepalive = false) {
  const body = JSON.stringify(payload);
  try {
    if (keepalive && navigator.sendBeacon) {
      navigator.sendBeacon('/api/admin/demo/events', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {}

  fetch('/api/admin/demo/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive,
  }).catch(() => {});
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export default function DemoSessionTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const eventIdRef = useRef<string | null>(null);
  const enterMsRef = useRef<number>(0);
  const sentLeaveRef = useRef(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = getSessionId();
    setExpiresAt(getCookie('sf_demo_expires_at'));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const sessionId = sessionIdRef.current || getSessionId();
    if (!pathname || !sessionId) return;

    eventIdRef.current = null;
    sentLeaveRef.current = false;
    enterMsRef.current = Date.now();

    fetch('/api/admin/demo/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enter', page: pathname, session_id: sessionId }),
      keepalive: true,
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { id?: string } | null) => { eventIdRef.current = data?.id ?? null; })
      .catch(() => {});

    const leave = () => {
      if (sentLeaveRef.current) return;
      sentLeaveRef.current = true;
      const eventId = eventIdRef.current;
      if (!eventId) return;
      const duration_ms = Math.max(0, Date.now() - enterMsRef.current);
      postEvent({ action: 'leave', event_id: eventId, duration_ms, session_id: sessionId }, true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave();
    };

    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      leave();
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  const remainingMs = useMemo(() => {
    if (!expiresAt) return null;
    const target = new Date(expiresAt).getTime();
    if (Number.isNaN(target)) return null;
    return Math.max(0, target - now);
  }, [expiresAt, now]);

  const nearEnd = typeof remainingMs === 'number' && remainingMs <= 20 * 60 * 1000;

  async function sendFeedback() {
    if (!feedback.trim()) {
      setStatus('Escribe un comentario antes de enviar.');
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/demo/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current || getSessionId(),
          message: feedback,
          rating,
          page: pathname,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar tu feedback.');
      setFeedback('');
      setStatus('Feedback enviado. Gracias por revisar la plataforma.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error al enviar feedback.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 ${nearEnd ? 'border-orange-400/50 bg-orange-400/10' : 'border-amber-400/40 bg-amber-400/[0.08]'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 text-amber-300">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Modo demo activo</p>
            <p className="text-xs text-amber-100/70">
              {typeof remainingMs === 'number' ? `Tiempo restante: ${formatRemaining(remainingMs)}` : 'Sesión temporal activa'}
              {nearEnd ? ' · Quedan menos de 20 minutos' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFeedbackOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-300/10"
        >
          <MessageSquare className="h-4 w-4" /> Feedback
        </button>
      </div>

      {feedbackOpen && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Calificación</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`h-8 w-8 rounded-full text-xs font-black ${rating >= value ? 'bg-amber-300 text-black' : 'bg-white/5 text-zinc-400'}`}
              >
                {value}
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={3}
            placeholder="Cuéntanos qué mejorarías o qué función agregarías..."
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/50"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">Tu comentario quedará guardado para mejoras futuras.</p>
            <button
              type="button"
              disabled={sending}
              onClick={sendFeedback}
              className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          {status && <p className="text-xs text-amber-100/80">{status}</p>}
        </div>
      )}
    </div>
  );
}
