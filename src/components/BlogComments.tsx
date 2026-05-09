'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Comment {
  id: string;
  author_name: string;
  author_email?: string;
  author_url?: string;
  content: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface BlogCommentsProps {
  postSlug: string;
  onlyApproved?: boolean;
}

export default function BlogComments({ postSlug, onlyApproved = true }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', url: '', content: '' });
  const [error, setError] = useState<string | null>(null);

  // Cargar comentarios
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const url = `/api/blog/comments/${encodeURIComponent(postSlug)}${onlyApproved ? '?approved=true' : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error loading comments');
        const data = (await res.json()) as Comment[];
        setComments(data);
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postSlug, onlyApproved]);

  // Enviar comentario
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.email.trim() || !formData.content.trim()) {
        setError('Por favor completa todos los campos requeridos');
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/blog/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_slug: postSlug,
            author_name: formData.name,
            author_email: formData.email,
            author_url: formData.url || undefined,
            content: formData.content,
          }),
        });

        if (!res.ok) throw new Error('Error submitting comment');

        setFormData({ name: '', email: '', url: '', content: '' });
        setSubmitted(true);

        // Reload comments
        const updatedRes = await fetch(`/api/blog/comments/${encodeURIComponent(postSlug)}?approved=true`);
        if (updatedRes.ok) {
          const updatedComments = (await updatedRes.json()) as Comment[];
          setComments(updatedComments);
        }

        setTimeout(() => setSubmitted(false), 5000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, postSlug]
  );

  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-zinc-950/50 p-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="h-6 w-6 text-yellow-400" />
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">
          Comentarios ({comments.length})
        </h2>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-10 space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Dejar un comentario</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Tu nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
            required
          />
          <input
            type="email"
            placeholder="Tu correo *"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
            required
          />
        </div>

        <input
          type="url"
          placeholder="Tu sitio (opcional)"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
        />

        <textarea
          placeholder="Tu comentario *"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
          required
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {submitted && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ¡Comentario enviado! Será revisado antes de publicarse.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-6 py-2.5 font-bold uppercase tracking-wider text-yellow-300 transition hover:bg-yellow-400/15 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publicar comentario
            </>
          )}
        </button>
      </form>

      {/* Lista de comentarios */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          No hay comentarios aún. ¡Sé el primero en comentar!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <p className="font-bold text-white">{comment.author_name}</p>
                    <time className="text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true })}
                    </time>
                  </div>
                  {comment.author_url && (
                    <a
                      href={comment.author_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-yellow-400 hover:underline"
                    >
                      {comment.author_url}
                    </a>
                  )}
                </div>
                {comment.status === 'pending' && (
                  <span className="rounded px-2 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400/10 text-yellow-300">
                    Pendiente
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
