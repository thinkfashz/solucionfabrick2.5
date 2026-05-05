'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  post_slug: string;
  author_name: string;
  author_email: string;
  author_url?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/blog/comments');
      if (res.ok) {
        const data = (await res.json()) as Comment[];
        setComments(data);
      } else {
        setError('Error cargando comentarios');
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Error al conectar con la BD');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/blog/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadComments();
      } else {
        setError('Error actualizando comentario');
      }
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/blog/comments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadComments();
      } else {
        setError('Error eliminando comentario');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Error al eliminar');
    } finally {
      setUpdating(null);
    }
  };

  const pending = comments.filter((c) => c.status === 'pending');
  const approved = comments.filter((c) => c.status === 'approved');
  const rejected = comments.filter((c) => c.status === 'rejected');

  return (
    <div className="space-y-6 sm:space-y-7 md:space-y-8 pb-12 px-4 sm:px-6 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
          Moderación
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400">
          Aprueba, rechaza o elimina comentarios
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 sm:p-4 flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-red-200">
          <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <div className="rounded-lg border border-yellow-400/20 bg-yellow-500/5 p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-black text-yellow-400">{pending.length}</p>
          <p className="text-[8px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mt-1">Pendientes</p>
        </div>
        <div className="rounded-lg border border-green-400/20 bg-green-500/5 p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-black text-green-400">{approved.length}</p>
          <p className="text-[8px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mt-1">Aprobados</p>
        </div>
        <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-black text-red-400">{rejected.length}</p>
          <p className="text-[8px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mt-1">Rechazados</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
        </div>
      ) : (
        <>
          {/* Pending Comments */}
          {pending.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wide text-yellow-400">
                ⏳ Pendientes ({pending.length})
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {pending.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onApprove={() => updateStatus(comment.id, 'approved')}
                    onReject={() => updateStatus(comment.id, 'rejected')}
                    onDelete={() => deleteComment(comment.id)}
                    isUpdating={updating === comment.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approved Comments */}
          {approved.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wide text-green-400">
                ✅ Aprobados ({approved.length})
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {approved.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onApprove={() => updateStatus(comment.id, 'approved')}
                    onReject={() => updateStatus(comment.id, 'rejected')}
                    onDelete={() => deleteComment(comment.id)}
                    isUpdating={updating === comment.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Comments */}
          {rejected.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wide text-red-400">
                ❌ Rechazados ({rejected.length})
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {rejected.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onApprove={() => updateStatus(comment.id, 'approved')}
                    onReject={() => updateStatus(comment.id, 'rejected')}
                    onDelete={() => deleteComment(comment.id)}
                    isUpdating={updating === comment.id}
                  />
                ))}
              </div>
            </div>
          )}

          {comments.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-8 text-center">
              <p className="text-zinc-400">No hay comentarios aún</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  onApprove,
  onReject,
  onDelete,
  isUpdating,
}: {
  comment: Comment;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const statusColor = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red',
  }[comment.status];

  const statusLabel = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  }[comment.status];

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-bold text-sm sm:text-base text-white truncate">{comment.author_name}</p>
            <span
              className={`text-[8px] sm:text-xs font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                statusColor === 'yellow'
                  ? 'bg-yellow-400/15 text-yellow-400'
                  : statusColor === 'green'
                    ? 'bg-green-400/15 text-green-400'
                    : 'bg-red-400/15 text-red-400'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">{comment.author_email}</p>
          {comment.author_url && (
            <a
              href={comment.author_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-yellow-400 hover:text-yellow-300 mt-1 block truncate"
            >
              {comment.author_url}
            </a>
          )}
        </div>
      </div>

      {/* Article Link */}
      <div className="text-xs text-zinc-500 border-t border-white/5 pt-2 sm:pt-3">
        <span className="text-zinc-400">Artículo: </span>
        <span className="text-yellow-400 font-bold break-all sm:break-normal">{comment.post_slug}</span>
        <span className="text-zinc-500 ml-1 sm:ml-2 block sm:inline text-[10px] sm:text-xs">
          {new Date(comment.created_at).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Content */}
      <div className="bg-black/30 p-3 sm:p-4 rounded-lg border border-white/5">
        <p className="text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
        {comment.status !== 'approved' && (
          <button
            onClick={onApprove}
            disabled={isUpdating}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4" />
            )}
            Aprobar
          </button>
        )}
        {comment.status !== 'rejected' && (
          <button
            onClick={onReject}
            disabled={isUpdating}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin" />
            ) : (
              <XCircle className="w-3 sm:w-4 h-3 sm:h-4" />
            )}
            Rechazar
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isUpdating}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25 rounded-lg font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
        >
          <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
