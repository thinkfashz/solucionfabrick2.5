'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, MessageSquareText, Send } from 'lucide-react';

type Comment = {
  id: string;
  author_name: string;
  kind: string;
  body: string;
  admin_reply?: string | null;
  created_at: string;
  published_at?: string | null;
};

type Status = 'loading' | 'ready' | 'empty' | 'error';

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Comentarios de la guía del radier. Se guardan en `radier_comments` y se publican tras revisión. */
export default function RadierComments() {
  const [status, setStatus] = useState<Status>('loading');
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [fields, setFields] = useState({ nombre: '', email: '', mensaje: '' });
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; email?: string; mensaje?: string }>({});

  async function load() {
    setStatus('loading');
    try {
      const response = await fetch('/api/radier/comments', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { comments?: Comment[] };
      const list = Array.isArray(body.comments) ? body.comments : [];
      setComments(list);
      setStatus(list.length ? 'ready' : 'empty');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => { void load(); }, []);

  function set<K extends 'nombre' | 'email' | 'mensaje'>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const found: typeof fieldErrors = {};
    if (fields.nombre.trim().length < 2) found.nombre = 'Escribe tu nombre.';
    if (!EMAIL.test(fields.email.trim())) found.email = 'Revisa el correo.';
    if (fields.mensaje.trim().length < 8) found.mensaje = 'Cuéntanos un poco más (mínimo 8 caracteres).';
    setFieldErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      const response = await fetch('/api/radier/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fields.nombre.trim(), email: fields.email.trim(), body: fields.mensaje.trim(), kind: 'comment' }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No pudimos publicar tu comentario.');
      setFields({ nombre: '', email: '', mensaje: '' });
      setFieldErrors({});
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos publicar tu comentario.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="comentarios-title">
      <div className="mb-4">
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Comunidad</p>
        <h2 id="comentarios-title" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Preguntas y experiencias.</h2>
        <p className="mt-2 max-w-xl text-xs leading-5 text-white/46 sm:text-sm sm:leading-6">Los comentarios se revisan antes de publicarse. Sin spam, sin insultos: solo obra.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2.5">
          {status === 'loading' ? (
            Array.from({ length: 2 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-[1.2rem] border border-white/10 bg-white/[.03]" aria-hidden />)
          ) : status === 'error' ? (
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[.03] p-5 text-center">
              <p className="text-xs text-white/50">No pudimos cargar los comentarios.</p>
              <button type="button" onClick={() => void load()} className="mt-3 min-h-10 rounded-full border border-white/15 px-5 text-[11px] font-black text-white/70">Reintentar</button>
            </div>
          ) : status === 'empty' ? (
            <div className="rounded-[1.2rem] border border-dashed border-white/15 bg-white/[.02] p-6 text-center">
              <MessageSquareText size={20} aria-hidden className="mx-auto text-[#F6C64A]" />
              <p className="mt-2 text-sm font-black">Sé la primera persona en comentar.</p>
              <p className="mt-1 text-[11px] leading-5 text-white/45">Pregunta por tu caso o cuenta cómo te fue con tu radier.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="rounded-[1.2rem] border border-white/10 bg-[#0A0F13] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                  <b className="text-xs font-black text-white/90">{comment.author_name}</b>
                  <time className="text-[10px] text-white/35" dateTime={comment.published_at || comment.created_at}>
                    {new Date(comment.published_at || comment.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </time>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/60">{comment.body}</p>
                {comment.admin_reply ? (
                  <p className="mt-3 border-l-2 border-[#F6C64A] pl-3 text-[11px] leading-5 text-white/70">
                    <b className="mb-0.5 block text-[9px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Respuesta de Fabrick</b>
                    {comment.admin_reply}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>

        <form onSubmit={submit} noValidate className="h-fit rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-5">
          <h3 className="text-sm font-black">Deja tu comentario</h3>
          {sent ? (
            <p role="status" className="mt-3 rounded-xl border border-[#F6C64A]/30 bg-[#F6C64A]/[.07] px-4 py-3 text-[11px] leading-5 text-[#F6C64A]">
              Recibido. Lo revisamos y lo publicamos en breve. Gracias por aportar.
            </p>
          ) : null}
          <div className="mt-4 grid gap-3.5">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Nombre *</span>
              <input value={fields.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" autoComplete="name" className="w-full border-b border-white/15 bg-transparent px-0 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
              {fieldErrors.nombre ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.nombre}</span> : null}
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Correo (no se publica) *</span>
              <input value={fields.email} onChange={(e) => set('email', e.target.value)} type="email" placeholder="correo@ejemplo.cl" autoComplete="email" className="w-full border-b border-white/15 bg-transparent px-0 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
              {fieldErrors.email ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.email}</span> : null}
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Comentario *</span>
              <textarea value={fields.mensaje} onChange={(e) => set('mensaje', e.target.value)} rows={3} placeholder="¿Qué duda tienes o cómo te fue con tu radier?" className="min-h-20 w-full resize-y border-b border-white/15 bg-transparent px-0 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
              {fieldErrors.mensaje ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.mensaje}</span> : null}
            </label>
          </div>
          {error ? <p role="alert" className="mt-3 flex items-start gap-2 text-xs font-semibold text-[#FF9B8A]"><AlertCircle size={15} className="mt-px shrink-0" aria-hidden />{error}</p> : null}
          <button type="submit" disabled={sending} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-6 text-[11px] font-black text-black transition disabled:opacity-60">
            <Send size={14} aria-hidden />{sending ? 'Enviando…' : 'Publicar comentario'}
          </button>
        </form>
      </div>
    </section>
  );
}
