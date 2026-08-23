'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type CommentStatus = 'pending' | 'approved' | 'rejected';

type Comment = {
  id: string;
  post_slug: string;
  author_name: string;
  author_email: string;
  author_url?: string;
  content: string;
  status: CommentStatus;
  created_at: string;
};

const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50';

const STATUS_META: Record<CommentStatus, { label: string; pill: string }> = {
  pending: { label: 'Pendiente', pill: 'bg-[#ffb000]/10 text-[#8e5c00]' },
  approved: { label: 'Aprobado', pill: 'bg-emerald-500/10 text-emerald-800' },
  rejected: { label: 'Rechazado', pill: 'bg-rose-500/10 text-rose-800' },
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | CommentStatus>('all');

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/comments', { cache: 'no-store' });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      setComments(Array.isArray(data) ? data as Comment[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadComments(); }, [loadComments]);

  const counts = useMemo(() => ({
    pending: comments.filter((comment) => comment.status === 'pending').length,
    approved: comments.filter((comment) => comment.status === 'approved').length,
    rejected: comments.filter((comment) => comment.status === 'rejected').length,
  }), [comments]);

  const visible = useMemo(
    () => filter === 'all' ? comments : comments.filter((comment) => comment.status === filter),
    [comments, filter],
  );

  async function updateStatus(id: string, status: CommentStatus) {
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/comments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el comentario.');
    } finally {
      setUpdating(null);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm('¿Eliminar este comentario definitivamente?')) return;
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contenido · Blog"
        title="Moderación de comentarios"
        description="Aprueba, rechaza o elimina comentarios reales desde una única vista. Las mutaciones pasan por permisos administrativos de contenido."
        icon={MessageSquare}
        actions={
          <button type="button" onClick={() => void loadComments()} disabled={loading} className={secondaryButton}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Total" value={comments.length} icon={MessageSquare} hint="Comentarios registrados" />
        <AdminStat label="Pendientes" value={counts.pending} icon={AlertCircle} accent="yellow" hint="Requieren decisión" />
        <AdminStat label="Aprobados" value={counts.approved} icon={CheckCircle2} accent="emerald" hint="Visibles públicamente" />
        <AdminStat label="Rechazados" value={counts.rejected} icon={XCircle} accent="rose" hint="No publicados" />
      </section>

      {error ? <div className="flex items-start gap-2 rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div> : null}

      <AdminCard className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Filtros</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Estado editorial</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[.13em] transition ${filter === key ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white'}`}
            >
              {key === 'all' ? 'Todos' : STATUS_META[key].label}
            </button>
          ))}
        </div>
      </AdminCard>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#817a6f]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando comentarios…</div>
      ) : visible.length === 0 ? (
        <AdminCard className="py-14 text-center"><p className="font-black text-[#171612]">No hay comentarios en este estado.</p><p className="mt-2 text-sm text-[#817a6f]">Cambia el filtro o vuelve a actualizar.</p></AdminCard>
      ) : (
        <div className="space-y-3">
          {visible.map((comment) => {
            const meta = STATUS_META[comment.status];
            const busy = updating === comment.id;
            return (
              <AdminCard key={comment.id} as="article" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-[#171612]">{comment.author_name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${meta.pill}`}>{meta.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#817a6f]">{comment.author_email}</p>
                    <p className="mt-1 text-[11px] text-[#9a9388]">Artículo: <strong className="text-[#716b60]">{comment.post_slug}</strong> · {new Date(comment.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    {comment.author_url ? <a href={comment.author_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-semibold text-[#9b6a12] hover:underline">{comment.author_url}</a> : null}
                  </div>
                </div>

                <div className="rounded-xl border border-black/8 bg-black/[.025] px-4 py-3 text-sm leading-6 text-[#45413a] whitespace-pre-wrap break-words">{comment.content}</div>

                <div className="flex flex-wrap gap-2">
                  {comment.status !== 'approved' ? <button type="button" onClick={() => void updateStatus(comment.id, 'approved')} disabled={busy} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-500/15 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Aprobar</button> : null}
                  {comment.status !== 'rejected' ? <button type="button" onClick={() => void updateStatus(comment.id, 'rejected')} disabled={busy} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-3 text-xs font-black text-rose-800 transition hover:bg-rose-500/15 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Rechazar</button> : null}
                  <button type="button" onClick={() => void deleteComment(comment.id)} disabled={busy} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 text-xs font-black text-[#716b60] transition hover:bg-white disabled:opacity-50 sm:ml-auto"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
