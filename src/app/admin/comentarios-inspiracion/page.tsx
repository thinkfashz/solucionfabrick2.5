'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, CheckCircle2, ExternalLink, Loader2, MessageCircle, MessagesSquare, RefreshCw, Search, Sparkles } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Status = 'pending' | 'published' | 'archived';
type Kind = 'comment' | 'suggestion';
type Row = {
  id: string;
  album_slug: string;
  album_title: string;
  author_name: string;
  author_email?: string | null;
  kind: Kind;
  body: string;
  status: Status;
  admin_reply?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export default function InspirationCommentsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Status>('pending');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  async function reload() {
    try {
      setLoading(true);
      setNotice('');
      const response = await fetch('/api/inspiraciones/comments?scope=admin', { cache: 'no-store' });
      const json = await response.json() as { comments?: Row[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar los comentarios.');
      const next = json.comments || [];
      setRows(next);
      setReplies(Object.fromEntries(next.map((row) => [row.id, row.admin_reply || ''])));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (kind !== 'all' && row.kind !== kind) return false;
      if (!q) return true;
      return `${row.album_title} ${row.author_name} ${row.author_email || ''} ${row.body}`.toLowerCase().includes(q);
    });
  }, [kind, query, rows, status]);

  const pending = rows.filter((row) => row.status === 'pending').length;
  const published = rows.filter((row) => row.status === 'published').length;
  const suggestions = rows.filter((row) => row.kind === 'suggestion').length;

  async function save(row: Row, nextStatus = row.status) {
    try {
      setSavingId(row.id);
      setNotice('');
      const response = await fetch('/api/inspiraciones/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status: nextStatus, adminReply: replies[row.id] || '' }),
      });
      const json = await response.json() as { ok?: boolean; comment?: Row; error?: string };
      if (!response.ok || !json.ok || !json.comment) throw new Error(json.error || 'No se pudo actualizar.');
      setRows((current) => current.map((item) => item.id === row.id ? json.comment! : item));
      setNotice(nextStatus === 'published' ? 'Comentario publicado.' : nextStatus === 'archived' ? 'Comentario archivado.' : 'Comentario devuelto a revisión.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar el comentario.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Web & contenido · Comunidad"
        title="Comentarios de Inspiraciones"
        description="Revisa comentarios y sugerencias de los álbumes. Los aportes nuevos quedan pendientes hasta que decidas publicarlos. Nada se elimina automáticamente: puedes archivarlos para conservar el seguimiento."
        actions={<button onClick={() => void reload()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#171612]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>}
      />

      <AdminStats>
        <AdminStat label="Pendientes" value={pending} note="Esperando revisión" icon={MessageCircle} />
        <AdminStat label="Publicados" value={published} note="Visibles en álbumes" icon={CheckCircle2} />
        <AdminStat label="Sugerencias" value={suggestions} note="Ideas de visitantes" icon={Sparkles} />
        <AdminStat label="Total" value={rows.length} note="Historial conservado" icon={MessagesSquare} />
      </AdminStats>

      <AdminSurface title="Bandeja de moderación" description="Filtra por estado, tipo, álbum, visitante o contenido.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3"><Search className="h-4 w-4 text-[#c77a00]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comentario, álbum o persona…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><span className="text-[10px] font-black text-black/35">{filtered.length}</span></label>
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | Status)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#171612]"><option value="all">Todos los estados</option><option value="pending">Pendientes</option><option value="published">Publicados</option><option value="archived">Archivados</option></select>
          <select value={kind} onChange={(event) => setKind(event.target.value as 'all' | Kind)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#171612]"><option value="all">Comentarios y sugerencias</option><option value="comment">Comentarios</option><option value="suggestion">Sugerencias</option></select>
        </div>
        {notice ? <p className="mt-3 rounded-xl border border-[#c77a00]/15 bg-[#c77a00]/[.06] p-3 text-xs text-[#6d4b11]">{notice}</p> : null}
      </AdminSurface>

      <div className="space-y-3">
        {loading ? <AdminSurface><div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c77a00]" /></div></AdminSurface> : filtered.length ? filtered.map((row) => (
          <AdminSurface key={row.id} className={row.status === 'pending' ? 'ring-1 ring-[#c77a00]/20' : ''}>
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${row.status === 'published' ? 'bg-emerald-100 text-emerald-800' : row.status === 'archived' ? 'bg-zinc-200 text-zinc-600' : 'bg-amber-100 text-amber-800'}`}>{row.status === 'published' ? 'Publicado' : row.status === 'archived' ? 'Archivado' : 'Pendiente'}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${row.kind === 'suggestion' ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-orange-800'}`}>{row.kind === 'suggestion' ? 'Sugerencia' : 'Comentario'}</span>
                  <time className="text-[9px] text-black/35">{new Date(row.created_at).toLocaleString('es-CL')}</time>
                </div>
                <h3 className="mt-3 text-lg font-black text-[#171612]">{row.album_title}</h3>
                <p className="mt-1 text-xs text-black/45">{row.author_name}{row.author_email ? ` · ${row.author_email}` : ''}</p>
                <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#4d493f]">{row.body}</p>
                <Link href={`/inspiraciones/${row.album_slug}`} target="_blank" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#9b6a12]">Ver álbum <ExternalLink className="h-3.5 w-3.5" /></Link>
              </div>

              <div className="rounded-2xl border border-black/8 bg-[#f7f2e9] p-4">
                <label className="text-[9px] font-black uppercase tracking-[.13em] text-[#8f887c]">Respuesta de Soluciones Fabrick<textarea value={replies[row.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [row.id]: event.target.value }))} rows={5} maxLength={1200} placeholder="Respuesta opcional que se mostrará debajo del comentario cuando esté publicado." className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-sm leading-6 text-[#171612] outline-none focus:border-[#c77a00]/50" /></label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => void save(row, 'published')} disabled={savingId === row.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-3 text-[10px] font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Publicar</button>
                  <button onClick={() => void save(row, 'archived')} disabled={savingId === row.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black text-[#171612] disabled:opacity-50"><Archive className="h-4 w-4" />Archivar</button>
                </div>
                <button onClick={() => void save(row, 'pending')} disabled={savingId === row.id} className="mt-2 min-h-10 w-full rounded-xl border border-[#c77a00]/20 bg-[#c77a00]/[.06] px-3 text-[10px] font-black text-[#7b5410] disabled:opacity-50">Guardar respuesta y dejar pendiente</button>
              </div>
            </div>
          </AdminSurface>
        )) : <AdminSurface><div className="grid min-h-52 place-items-center text-center"><div><MessagesSquare className="mx-auto h-7 w-7 text-[#c77a00]" /><h3 className="mt-3 text-lg font-black text-[#171612]">No hay comentarios en este filtro.</h3><p className="mt-1 text-sm text-[#817a6f]">Cambia los filtros o espera nuevos aportes desde los álbumes.</p></div></div></AdminSurface>}
      </div>
    </AdminPage>
  );
}
