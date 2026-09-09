'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

type CommentKind = 'comment' | 'suggestion';
type InspirationComment = {
  id: string;
  album_slug: string;
  author_name: string;
  kind: CommentKind;
  body: string;
  admin_reply?: string | null;
  created_at: string;
  published_at?: string | null;
};

type Props = { albumSlug: string; albumTitle: string };

function responseError(status: number, message?: string) {
  if (status === 503) return 'Los comentarios se están sincronizando con la base de datos. Intenta nuevamente en unos segundos.';
  return message || 'No pudimos completar esta acción.';
}

export default function InspirationComments({ albumSlug, albumTitle }: Props) {
  const [comments, setComments] = useState<InspirationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<CommentKind>('comment');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/inspiraciones/comments?album=${encodeURIComponent(albumSlug)}`, { cache: 'no-store' });
      const json = await response.json() as { comments?: InspirationComment[]; error?: string };
      if (!response.ok) throw new Error(responseError(response.status, json.error));
      setComments(json.comments || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [albumSlug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (name.trim().length < 2 || body.trim().length < 8) {
      setError('Escribe tu nombre y un comentario de al menos 8 caracteres.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch('/api/inspiraciones/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumSlug, albumTitle, name, email, kind, body, website }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(responseError(response.status, json.error));
      setBody('');
      setEmail('');
      setKind('comment');
      setNotice('Tu aporte quedó guardado y en revisión. Cuando se publique aparecerá en este álbum.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos guardar tu comentario.');
    } finally {
      setSubmitting(false);
    }
  }

  const suggestions = useMemo(() => comments.filter((comment) => comment.kind === 'suggestion').length, [comments]);

  return (
    <section id="comentarios" className="scroll-mt-24 border-t border-white/8 bg-[#070C10] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Comunidad</p>
            <h2 className="mt-2 max-w-[11ch] text-4xl font-black leading-[.92] tracking-[-.055em] sm:text-5xl">Comenta esta idea o sugiere una mejora.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/48">Los aportes se guardan en Fabrick y pasan por revisión antes de quedar públicos. Así mantenemos el álbum útil, ordenado y libre de spam.</p>
            <div className="mt-6 flex gap-6 border-t border-white/10 pt-5 text-xs"><div><b className="block text-2xl text-[#F6C64A]">{comments.length}</b><span className="text-white/35">publicados</span></div><div><b className="block text-2xl text-[#57D4FF]">{suggestions}</b><span className="text-white/35">sugerencias</span></div></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={submit} className="rounded-[1.5rem] border border-white/10 bg-white/[.035] p-4 sm:p-5">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Dejar aporte</p><h3 className="mt-1 text-lg font-black">Sobre “{albumTitle}”</h3></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-[9px] font-bold text-white/45">Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#F6C64A]/50" placeholder="Tu nombre" /></label>
                <label className="text-[9px] font-bold text-white/45">Correo opcional<input value={email} onChange={(event) => setEmail(event.target.value)} maxLength={140} type="email" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#F6C64A]/50" placeholder="correo@ejemplo.cl" /></label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setKind('comment')} className={`h-10 rounded-xl text-[10px] font-black ${kind === 'comment' ? 'bg-[#F6C64A] text-black' : 'border border-white/10 text-white/50'}`}>Comentario</button>
                <button type="button" onClick={() => setKind('suggestion')} className={`h-10 rounded-xl text-[10px] font-black ${kind === 'suggestion' ? 'bg-[#57D4FF] text-black' : 'border border-white/10 text-white/50'}`}>Sugerencia</button>
              </div>
              <label className="mt-4 block text-[9px] font-bold text-white/45">Tu mensaje<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={8} maxLength={1200} rows={5} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-[#F6C64A]/50" placeholder="¿Qué te gustó, qué cambiarías o qué te gustaría ver en este álbum?" /></label>
              <label className="sr-only" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
              {notice ? <p className="mt-3 flex gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3 text-[10px] leading-5 text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p> : null}
              {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-300/[.06] p-3 text-[10px] leading-5 text-red-100">{error}</p> : null}
              <button disabled={submitting} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-5 text-xs font-black text-black disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar para revisión</button>
            </form>

            <div className="rounded-[1.5rem] border border-white/10 bg-[#0A1014] p-4 sm:p-5">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#57D4FF]">Conversación publicada</p><h3 className="mt-1 text-lg font-black">Aportes de visitantes</h3></div>
              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div> : comments.length ? comments.map((comment) => <article key={comment.id} className="rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><b className="text-xs">{comment.author_name}</b><span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase ${comment.kind === 'suggestion' ? 'bg-[#57D4FF]/10 text-[#57D4FF]' : 'bg-[#F6C64A]/10 text-[#F6C64A]'}`}>{comment.kind === 'suggestion' ? 'Sugerencia' : 'Comentario'}</span></div><p className="mt-2 text-[11px] leading-5 text-white/55">{comment.body}</p><time className="mt-2 block text-[8px] text-white/25">{new Date(comment.published_at || comment.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</time>{comment.admin_reply ? <div className="mt-3 border-l-2 border-[#F6C64A] pl-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#F6C64A]">Soluciones Fabrick</p><p className="mt-1 text-[10px] leading-5 text-white/48">{comment.admin_reply}</p></div> : null}</article>) : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 p-5 text-center"><div><p className="text-xs font-black text-white/60">Todavía no hay comentarios publicados.</p><p className="mt-1 text-[10px] leading-5 text-white/30">Puedes ser la primera persona en dejar una idea.</p></div></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
