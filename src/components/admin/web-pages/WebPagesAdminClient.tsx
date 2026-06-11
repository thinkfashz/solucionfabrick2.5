'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { nicheOptions } from '@/lib/web-pages/templates';

type PageRow = { id:number; slug:string; title:string; niche:string; client_name:string; client_phone:string; status:string; visits:number; updated_at:string; published_at?:string };

export function WebPagesAdminClient() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: 'Página comercial Fabrick', niche: 'general', client_name: '', client_phone: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/web-pages', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudieron cargar las páginas');
      setPages(json.pages || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setup() {
    setSetupLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/web-pages/setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo migrar');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al migrar'); }
    finally { setSetupLoading(false); }
  }

  async function createPage() {
    setCreating(true); setError(null);
    try {
      const res = await fetch('/api/admin/web-pages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo crear');
      location.href = `/admin/paginas/${json.page.id}/editar`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al crear'); }
    finally { setCreating(false); }
  }

  async function remove(id:number) {
    if (!confirm('¿Eliminar esta página?')) return;
    const res = await fetch(`/api/admin/web-pages/${id}`, { method:'DELETE' });
    if (res.ok) await load();
  }

  return <div className="min-h-screen space-y-6 overflow-x-hidden p-3 text-white sm:p-6 lg:p-8">
    <section className="rounded-[28px] border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[.25em] text-amber-400">Fabrick Page Engine</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Creador de páginas web</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Crea HTMLs por nicho, edítalos con GrapesJS, guarda HTML/CSS/JS + JSON interno y comparte por URL pública con token único.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={setup} disabled={setupLoading} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200 disabled:opacity-50">{setupLoading ? 'Migrando...' : 'Migrar tabla SQL'}</button>
          <button onClick={load} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"><RefreshCw className="mr-2 inline size-4"/>Actualizar</button>
        </div>
      </div>
    </section>

    {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-[24px] border border-white/10 bg-zinc-950/80 p-4">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><Wand2 className="size-5 text-amber-400"/>Nueva página</h2>
        <label className="text-xs text-zinc-500">Nombre de la plantilla</label>
        <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-amber-400" />
        <label className="mt-3 block text-xs text-zinc-500">Nicho</label>
        <select value={form.niche} onChange={e=>setForm({...form,niche:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-amber-400">
          {nicheOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="mt-3 block text-xs text-zinc-500">Cliente / negocio</label>
        <input value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-amber-400" placeholder="Nombre del cliente" />
        <label className="mt-3 block text-xs text-zinc-500">WhatsApp</label>
        <input value={form.client_phone} onChange={e=>setForm({...form,client_phone:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-amber-400" placeholder="+56 9..." />
        <button onClick={createPage} disabled={creating} className="mt-4 w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50"><Plus className="mr-2 inline size-4"/>{creating?'Creando...':'Crear y editar'}</button>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-zinc-950/80 p-4">
        <h2 className="mb-4 text-lg font-black">Páginas creadas</h2>
        {loading ? <div className="grid h-52 place-items-center"><Loader2 className="size-7 animate-spin text-amber-400"/></div> : null}
        {!loading && pages.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">Aún no hay páginas. Migra la tabla y crea la primera.</div> : null}
        <div className="grid gap-3">
          {pages.map(p=><article key={p.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><h3 className="truncate font-black">{p.title}</h3><p className="mt-1 truncate text-xs text-zinc-500">/l/{p.slug}</p><p className="mt-1 text-xs text-zinc-500">{p.niche} · {p.status} · {p.visits||0} visitas</p></div>
              <div className="flex flex-wrap gap-2"><Link href={`/admin/paginas/${p.id}/editar`} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black">Editar</Link><a href={`/l/${p.slug}`} target="_blank" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><ExternalLink className="mr-1 inline size-3"/>Ver</a><button onClick={()=>remove(p.id)} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"><Trash2 className="mr-1 inline size-3"/>Eliminar</button></div>
            </div>
          </article>)}
        </div>
      </div>
    </section>
  </div>;
}
