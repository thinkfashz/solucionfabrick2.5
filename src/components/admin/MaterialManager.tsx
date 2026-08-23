'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Loader2, Package, Pencil, Plus, Search, Trash2, Upload, XCircle } from 'lucide-react';

export type MaterialCategory = 'obra-gruesa' | 'terminaciones' | 'electricidad' | 'gasfiteria' | 'climatizacion' | 'conectividad' | 'seguridad' | 'servicios';
export type MaterialUnit = 'm2' | 'ml' | 'unidad' | 'global' | 'kit' | 'instalacion';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  price: number;
  imageUrl: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'obra-gruesa', label: 'Obra gruesa' },
  { value: 'terminaciones', label: 'Terminaciones' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'gasfiteria', label: 'Gasfitería' },
  { value: 'climatizacion', label: 'Aire acondicionado' },
  { value: 'conectividad', label: 'Conectividad' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'servicios', label: 'Servicios' },
];
const UNITS: { value: MaterialUnit; label: string }[] = [
  { value: 'm2', label: 'm²' }, { value: 'ml', label: 'metro lineal' }, { value: 'unidad', label: 'unidad' },
  { value: 'kit', label: 'kit' }, { value: 'global', label: 'global' }, { value: 'instalacion', label: 'instalación' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<MaterialCategory, string>;
const UNIT_LABEL = Object.fromEntries(UNITS.map((u) => [u.value, u.label])) as Record<MaterialUnit, string>;
const EMPTY = { name: '', category: 'obra-gruesa' as MaterialCategory, unit: 'm2' as MaterialUnit, price: 0, imageUrl: '', active: true };

type FormState = typeof EMPTY;
type ApiMaterial = { id: string; name: string; category: string; unit: string; price: number; image_url: string | null; active: boolean; created_at?: string | null; updated_at?: string | null };

function money(value: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0)); }
function row(r: ApiMaterial): Material { return { id: r.id, name: r.name, category: (r.category || 'obra-gruesa') as MaterialCategory, unit: (r.unit || 'unidad') as MaterialUnit, price: Number(r.price) || 0, imageUrl: r.image_url || '', active: Boolean(r.active), createdAt: r.created_at || undefined, updatedAt: r.updated_at || undefined }; }
async function errorText(response: Response) { try { const json = await response.json() as { error?: string }; return json.error || `HTTP ${response.status}`; } catch { return `HTTP ${response.status}`; } }
async function listMaterials() { const r = await fetch('/api/admin/materials', { cache: 'no-store' }); if (!r.ok) throw new Error(await errorText(r)); const j = await r.json() as { materials?: ApiMaterial[] }; return (j.materials || []).map(row); }
async function createMaterial(form: FormState) { const r = await fetch('/api/admin/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), category: form.category, unit: form.unit, price: Math.round(form.price || 0), image_url: form.imageUrl || null, active: form.active }) }); if (!r.ok) throw new Error(await errorText(r)); return row((await r.json() as { material: ApiMaterial }).material); }
async function patchMaterial(id: string, form: Partial<FormState>) { const body: Record<string, unknown> = {}; if (form.name !== undefined) body.name = form.name.trim(); if (form.category !== undefined) body.category = form.category; if (form.unit !== undefined) body.unit = form.unit; if (form.price !== undefined) body.price = Math.round(form.price || 0); if (form.imageUrl !== undefined) body.image_url = form.imageUrl || null; if (form.active !== undefined) body.active = form.active; const r = await fetch(`/api/admin/materials/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(await errorText(r)); return row((await r.json() as { material: ApiMaterial }).material); }
async function removeMaterial(id: string) { const r = await fetch(`/api/admin/materials/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (!r.ok) throw new Error(await errorText(r)); }

export default function MaterialManager({ initialMaterials = [] }: { initialMaterials?: Material[] }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MaterialCategory | 'all'>('all');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { let alive = true; void listMaterials().then((items) => { if (alive) setMaterials(items); }).catch((e) => { if (alive) setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'No se pudieron cargar los materiales.' }); }); return () => { alive = false; }; }, []);

  const filtered = useMemo(() => materials.filter((m) => (category === 'all' || m.category === category) && (!query.trim() || `${m.name} ${CATEGORY_LABEL[m.category]}`.toLowerCase().includes(query.toLowerCase()))), [materials, category, query]);
  const online = materials.filter((m) => m.active).length;

  function reset() { setForm(EMPTY); setEditingId(null); if (fileRef.current) fileRef.current.value = ''; }
  function edit(material: Material) { setEditingId(material.id); setForm({ name: material.name, category: material.category, unit: material.unit, price: material.price, imageUrl: material.imageUrl, active: material.active }); setFeedback(null); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }

  async function upload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFeedback({ kind: 'err', msg: 'Selecciona una imagen válida.' }); return; }
    if (file.size > 8 * 1024 * 1024) { setFeedback({ kind: 'err', msg: 'La imagen no puede superar 8 MB.' }); return; }
    setBusy('upload'); setFeedback(null);
    try {
      const data = new FormData(); data.append('file', file); data.append('folder', `fabrick/materiales/${form.category}`);
      const r = await fetch('/api/admin/cloudinary', { method: 'POST', body: data });
      const j = await r.json() as { url?: string; asset?: { url?: string }; error?: string };
      if (!r.ok) throw new Error(j.error || 'No se pudo subir la imagen.');
      const url = j.url || j.asset?.url;
      if (!url) throw new Error('El proveedor no devolvió una URL de imagen.');
      setForm((current) => ({ ...current, imageUrl: url }));
      setFeedback({ kind: 'ok', msg: 'Imagen subida y lista para guardar.' });
    } catch (e) { setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'Error subiendo la imagen.' }); }
    finally { setBusy(''); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setFeedback(null);
    if (!form.name.trim()) { setFeedback({ kind: 'err', msg: 'El nombre es obligatorio.' }); return; }
    if (!Number.isFinite(form.price) || form.price < 0) { setFeedback({ kind: 'err', msg: 'Ingresa un precio válido.' }); return; }
    setBusy('save');
    try {
      if (editingId) { const updated = await patchMaterial(editingId, form); setMaterials((list) => list.map((m) => m.id === editingId ? updated : m)); setFeedback({ kind: 'ok', msg: 'Material actualizado.' }); }
      else { const created = await createMaterial(form); setMaterials((list) => [created, ...list]); setFeedback({ kind: 'ok', msg: 'Material publicado en el cotizador.' }); }
      reset();
    } catch (e) { setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    finally { setBusy(''); }
  }

  async function toggle(material: Material) { const next = !material.active; setMaterials((list) => list.map((m) => m.id === material.id ? { ...m, active: next } : m)); try { const updated = await patchMaterial(material.id, { active: next }); setMaterials((list) => list.map((m) => m.id === material.id ? updated : m)); } catch (e) { setMaterials((list) => list.map((m) => m.id === material.id ? material : m)); setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'No se pudo cambiar el estado.' }); } }
  async function remove(material: Material) { if (!confirm(`¿Eliminar “${material.name}”?`)) return; try { await removeMaterial(material.id); setMaterials((list) => list.filter((m) => m.id !== material.id)); if (editingId === material.id) reset(); setFeedback({ kind: 'ok', msg: 'Material eliminado.' }); } catch (e) { setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'No se pudo eliminar.' }); } }

  return (
    <main className="mx-auto max-w-[1480px] px-3 pb-24 pt-5 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8d6715]">Catálogo del cotizador</p><h1 className="mt-1 text-3xl font-black text-[#111214]">Materiales y servicios</h1><p className="mt-2 max-w-2xl text-sm text-black/55">Administra precios, imágenes y disponibilidad. Las imágenes se guardan ahora en Cloudinary y persisten después de recargar.</p></div>
        <div className="text-sm text-black/50"><b className="text-black">{materials.length}</b> ítems · <b className="text-emerald-700">{online}</b> publicados</div>
      </header>

      {feedback && <div className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${feedback.kind === 'ok' ? 'border-emerald-600/20 bg-emerald-600/8 text-emerald-800' : 'border-red-600/20 bg-red-600/8 text-red-800'}`}>{feedback.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{feedback.msg}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar material o categoría…" className="w-full rounded-xl border border-black/10 bg-white/70 py-3 pl-10 pr-4 text-sm text-black outline-none focus:border-black/25" /></label>
            <select value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory | 'all')} className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black outline-none"><option value="all">Todas las categorías</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/55">
            {filtered.length === 0 ? <div className="px-5 py-16 text-center text-sm text-black/40">No hay materiales que coincidan.</div> : <div className="divide-y divide-black/8">{filtered.map((material) => <article key={material.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center">
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-black/5">{material.imageUrl ? <img src={material.imageUrl} alt={material.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-black/20"><ImageIcon className="h-5 w-5" /></div>}</div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-black">{material.name}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${material.active ? 'bg-emerald-700/10 text-emerald-800' : 'bg-black/7 text-black/45'}`}>{material.active ? 'Publicado' : 'Oculto'}</span></div><p className="mt-1 text-xs text-black/45">{CATEGORY_LABEL[material.category]} · {money(material.price)} / {UNIT_LABEL[material.unit]}</p></div>
              <div className="flex items-center gap-2"><button type="button" onClick={() => void toggle(material)} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-black/60 hover:bg-black/5">{material.active ? 'Ocultar' : 'Publicar'}</button><button type="button" onClick={() => edit(material)} className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-black/60 hover:bg-black/5" aria-label="Editar"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void remove(material)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-600/15 text-red-700 hover:bg-red-600/5" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button></div>
            </article>)}</div>}
          </div>
        </section>

        <aside ref={formRef} className="xl:sticky xl:top-20 xl:self-start">
          <form onSubmit={save} className="rounded-2xl border border-black/10 bg-[#f7efdF]/85 p-5">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8d6715]">{editingId ? 'Edición' : 'Nuevo ítem'}</p><h2 className="mt-1 text-xl font-black text-black">{editingId ? 'Editar material' : 'Agregar material'}</h2></div>{editingId && <button type="button" onClick={reset} className="text-xs font-bold text-black/45 hover:text-black">Cancelar</button>}</div>
            <div className="space-y-4">
              <Field label="Nombre"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Categoría"><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MaterialCategory }))} className="field">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field><Field label="Unidad"><select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as MaterialUnit }))} className="field">{UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></Field></div>
              <Field label="Precio CLP"><input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="field" /></Field>
              <Field label="Imagen"><div className="overflow-hidden rounded-xl border border-black/10 bg-white/65">{form.imageUrl ? <img src={form.imageUrl} alt="Vista previa" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center text-black/25"><Package className="h-8 w-8" /></div>}<button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'} className="flex w-full items-center justify-center gap-2 border-t border-black/10 px-4 py-3 text-xs font-black text-black/65 hover:bg-black/5 disabled:opacity-50">{busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy === 'upload' ? 'Subiendo…' : 'Subir imagen'}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void upload(e.target.files?.[0] || null); e.currentTarget.value = ''; }} /></div></Field>
              <label className="flex items-center justify-between border-t border-black/8 pt-4 text-sm font-semibold text-black/65"><span>Visible en el cotizador</span><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-5 w-5 accent-black" /></label>
              <button type="submit" disabled={busy === 'save' || busy === 'upload'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-black text-yellow-300 disabled:opacity-50">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{busy === 'save' ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar al cotizador'}</button>
            </div>
          </form>
        </aside>
      </div>
      <style jsx>{`.field{min-height:44px;width:100%;border-radius:12px;border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.72);padding:0 12px;font-size:14px;color:#111214;outline:none}.field:focus{border-color:rgba(0,0,0,.28)}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.14em] text-black/45">{label}</span>{children}</label>; }
