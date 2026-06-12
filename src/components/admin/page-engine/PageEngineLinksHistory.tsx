'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, RefreshCcw, Trash2 } from 'lucide-react';

type Doc = { token: string; title: string; status: string; expires_at?: string | null; updated_at?: string; created_at?: string };

function fmt(date?: string | null) {
  if (!date) return 'sin expiración';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'sin fecha';
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function PageEngineLinksHistory() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/page-engine', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setStatus(json.error || 'No pude cargar historial.'); return; }
    setDocs(Array.isArray(json.documents) ? json.documents : []);
    setStatus('');
  }

  async function remove(token: string) {
    if (!confirm('¿Eliminar este link generado?')) return;
    const res = await fetch(`/api/admin/page-engine?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(json.error || 'No se pudo eliminar.'); return; }
    setDocs((list) => list.filter((doc) => doc.token !== token));
    setStatus('Link eliminado.');
  }

  useEffect(() => { void load(); }, []);

  return <section className="mx-auto mt-4 w-full max-w-[1780px] rounded-[28px] border border-amber-300/15 bg-black/55 p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,.45)] backdrop-blur-2xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Historial Page Engine</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">HTMLs y demos publicados</h2></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 disabled:opacity-60"><RefreshCcw className="h-4 w-4" />Actualizar</button>
    </div>
    {status && <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">{status}</p>}
    <div className="mt-4 grid gap-2">
      {docs.length ? docs.map((doc) => {
        const url = `${location.origin}/w/${doc.token}`;
        return <article key={doc.token} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0"><b className="block truncate text-white">{doc.title}</b><span className="mt-1 block text-xs text-white/45">/{doc.token} · {doc.status} · vence: {fmt(doc.expires_at)}</span><a href={url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-amber-200 underline">{url}</a></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(url)} className="rounded-xl bg-white/[.06] p-3 text-white"><Copy className="h-4 w-4" /></button><a href={url} target="_blank" rel="noreferrer" className="rounded-xl bg-white/[.06] p-3 text-white"><ExternalLink className="h-4 w-4" /></a><button onClick={() => remove(doc.token)} className="rounded-xl bg-red-500/10 p-3 text-red-300"><Trash2 className="h-4 w-4" /></button></div>
        </article>;
      }) : <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">No hay HTMLs publicados todavía.</p>}
    </div>
  </section>;
}
