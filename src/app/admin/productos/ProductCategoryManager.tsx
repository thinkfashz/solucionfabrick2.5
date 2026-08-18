'use client';

import { useMemo, useState } from 'react';
import { Check, Edit3, FolderOpen, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import type { CategoryRecord } from '@/lib/commerce';

function folderSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
}

type Props = {
  open: boolean;
  categories: CategoryRecord[];
  productCounts: Record<string, number>;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

export default function ProductCategoryManager({ open, categories, productCounts, onClose, onChanged }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es')), [categories]);
  if (!open) return null;

  function resetForm() {
    setName('');
    setDescription('');
    setEditingId(null);
  }

  function edit(category: CategoryRecord) {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description || '');
    setMessage(null);
  }

  async function save() {
    if (name.trim().length < 2) {
      setMessage({ text: 'Escribe un nombre de categoría válido.', error: true });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/categories${editingId ? `?id=${encodeURIComponent(editingId)}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo guardar la categoría.');
      await onChanged();
      setMessage({ text: editingId ? 'Categoría actualizada.' : 'Categoría y carpeta vinculada creadas.' });
      resetForm();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'No se pudo guardar.', error: true });
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: CategoryRecord) {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, { method: 'DELETE' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo eliminar la categoría.');
      await onChanged();
      if (editingId === category.id) resetForm();
      setMessage({ text: 'Categoría eliminada.' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'No se pudo eliminar.', error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#111214]/65 p-3 backdrop-blur-xl sm:p-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#f8efdd] text-[#111214] shadow-[0_40px_130px_rgba(0,0,0,.35)]">
        <header className="flex items-start justify-between gap-4 border-b border-black/10 p-5 sm:p-7">
          <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#C97700]">Orden del catálogo</p><h2 className="mt-1 text-3xl font-black tracking-[-.05em]">Categorías y carpetas</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/52">Cada categoría usa automáticamente una carpeta Cloudinary dentro de <b>fabrick/productos</b>. La carpeta se materializa con la primera imagen subida.</p></div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-yellow-300" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[340px_1fr]">
          <section className="h-fit rounded-[1.6rem] bg-[#e8d8b8] p-4 sm:p-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-yellow-300">{editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span><div><b className="block">{editingId ? 'Editar categoría' : 'Nueva categoría'}</b><span className="text-xs text-black/45">Nombre y descripción comercial</span></div></div>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-black/45">Nombre</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Climatización" className="mt-2 w-full rounded-2xl border border-black/10 bg-white/55 px-4 py-3 text-sm font-semibold text-black outline-none placeholder:text-black/30 focus:border-[#b07a10]" />
            <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-black/45">Descripción</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Qué productos reúne esta categoría" className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white/55 px-4 py-3 text-sm text-black outline-none placeholder:text-black/30 focus:border-[#b07a10]" />
            {name.trim() ? <div className="mt-4 rounded-2xl bg-white/45 p-3"><span className="text-[9px] font-black uppercase tracking-widest text-black/40">Carpeta automática</span><code className="mt-1 block break-all text-xs font-bold text-[#7b550d]">fabrick/productos/{folderSlug(name)}</code></div> : null}
            {message ? <p className={`mt-4 rounded-2xl p-3 text-xs font-semibold ${message.error ? 'bg-[#f8c9bc] text-[#7d2618]' : 'bg-emerald-700/10 text-emerald-900'}`}>{message.text}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {editingId ? <button type="button" onClick={resetForm} className="rounded-2xl border border-black/10 px-4 py-3 text-xs font-black">Cancelar</button> : <span />}
              <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-yellow-300 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? 'Guardar' : 'Crear'}</button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-black/40">Estructura disponible</p><h3 className="mt-1 text-xl font-black">{sorted.length} categorías</h3></div><span className="rounded-full bg-black/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black/45">Cloudinary conectado por nombre</span></div>
            {sorted.length ? sorted.map((category) => {
              const count = productCounts[category.id] || 0;
              return <article key={category.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[1.35rem] bg-white/52 p-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d8c39c] text-[#6f4a0a]"><FolderOpen className="h-5 w-5" /></span>
                <div className="min-w-0"><b className="block truncate text-sm">{category.name}</b><span className="mt-1 block truncate text-[10px] text-black/42">{count} producto{count === 1 ? '' : 's'} · /{folderSlug(category.name)}</span></div>
                <div className="flex gap-1"><button type="button" onClick={() => edit(category)} className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black/55 hover:bg-black hover:text-yellow-300" aria-label={`Editar ${category.name}`}><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void remove(category)} disabled={count > 0 || saving} className="grid h-9 w-9 place-items-center rounded-xl bg-red-600/[0.07] text-red-800 disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Eliminar ${category.name}`} title={count ? 'Mueve sus productos antes de eliminarla' : 'Eliminar categoría'}><Trash2 className="h-4 w-4" /></button></div>
              </article>;
            }) : <div className="grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed border-black/15 text-center"><div><FolderOpen className="mx-auto h-7 w-7 text-black/25" /><p className="mt-3 text-sm font-bold">Aún no hay categorías</p><p className="mt-1 text-xs text-black/40">Crea la primera para ordenar productos e imágenes.</p></div></div>}
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-black/[0.045] p-3 text-xs text-black/50"><Check className="h-4 w-4 text-emerald-700" />Las categorías creadas por importación automática también aparecen aquí.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
