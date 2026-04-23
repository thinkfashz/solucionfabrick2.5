'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Search, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import type { FabrickProject } from '@/lib/projects';

type SourceFlag = 'db' | 'seed' | 'unknown';

export default function AdminProyectosPage() {
  const [projects, setProjects] = useState<FabrickProject[]>([]);
  const [source, setSource] = useState<SourceFlag>('unknown');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FabrickProject | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch('/api/proyectos', { cache: 'no-store' });
      const json = (await res.json()) as { data: FabrickProject[]; source?: SourceFlag };
      setProjects(json.data || []);
      setSource(json.source || 'unknown');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(values: FabrickProject) {
    try {
      const isNew = creating || !projects.find((p) => p.id === values.id);
      const url = isNew ? '/api/proyectos' : `/api/proyectos?id=${encodeURIComponent(values.id)}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error desconocido');
      notify(isNew ? 'Proyecto creado' : 'Proyecto actualizado', 'success');
      setEditing(null);
      setCreating(false);
      void reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/proyectos?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al eliminar');
      notify('Proyecto eliminado', 'success');
      setDeleteId(null);
      void reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter((p) =>
      [p.title, p.location, p.category, p.summary].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [projects, query]);

  if (editing || creating) {
    const initial: FabrickProject = editing ?? {
      id: `PRJ-${Date.now().toString(36).toUpperCase()}`,
      title: '',
      location: '',
      year: new Date().getFullYear(),
      area_m2: 0,
      category: 'Vivienda nueva',
      hero_image: '',
      gallery: [],
      summary: '',
      description: '',
      materials: [],
      highlights: [],
      scope: [],
      featured: false,
    };
    return (
      <ProjectForm
        initial={initial}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#facc15]">Proyectos</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Gestión de obras
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Fuente actual:{' '}
            <span className={source === 'db' ? 'text-emerald-400' : 'text-yellow-400'}>
              {source === 'db' ? 'Base de datos' : 'Datos de demostración (seed)'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#facc15] px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#fde047]"
        >
          <Plus size={14} /> Nuevo proyecto
        </button>
      </div>

      {source === 'seed' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-xs text-yellow-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p>
              Se está mostrando la lista por defecto porque la tabla <code className="rounded bg-black/40 px-1">projects</code> aún no existe en InsForge. Crea la tabla con los campos mostrados en el formulario para habilitar el CRUD completo. Mientras tanto, los 5 proyectos precargados se muestran automáticamente en la página pública <Link href="/proyectos" className="underline">/proyectos</Link>.
            </p>
            <Link
              href="/admin/setup"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-yellow-200 transition hover:bg-yellow-500/20"
            >
              Crear tablas en InsForge
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5">
        <Search size={14} className="text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, ubicación, categoría..."
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/80 p-10 text-center text-sm text-zinc-500">
          No hay proyectos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="flex overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/80"
            >
              <div className="h-auto w-32 flex-shrink-0 bg-zinc-900">
                {p.hero_image ? (
                  <img src={p.hero_image} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">Sin imagen</div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#facc15]">{p.category}</p>
                    {p.featured ? <span className="text-[9px] text-yellow-400">★</span> : null}
                  </div>
                  <h3 className="text-sm font-bold uppercase leading-tight text-white">{p.title}</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {p.location} · {p.area_m2} m² · {p.year}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[10px] uppercase tracking-wider text-white/70 hover:border-[#facc15]/40 hover:text-white"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/20 px-3 py-2 text-red-400 hover:bg-red-500/10"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="mb-2 font-bold text-white">Eliminar proyecto</h3>
            <p className="mb-5 text-sm text-zinc-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-5 py-3 text-sm font-medium shadow-xl ${
            toast.type === 'success'
              ? 'border-[#facc15]/40 bg-zinc-900 text-[#facc15]'
              : 'border-red-500/40 bg-zinc-900 text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────── */
/* Form                                            */
/* ────────────────────────────────────────────── */

function ProjectForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: FabrickProject;
  onCancel: () => void;
  onSave: (v: FabrickProject) => void;
}) {
  const [form, setForm] = useState<FabrickProject>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FabrickProject>(key: K, value: FabrickProject[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setList(key: 'materials' | 'highlights' | 'scope' | 'gallery', raw: string) {
    const items = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    set(key, items as FabrickProject[typeof key]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10 md:px-10">
      <button
        type="button"
        onClick={onCancel}
        className="mb-6 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={12} /> Volver al listado
      </button>

      <h1 className="mb-8 text-2xl font-black uppercase tracking-tight text-white">
        {initial.title ? 'Editar proyecto' : 'Nuevo proyecto'}
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Field label="Título" required>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ubicación" required>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                required
                placeholder="Comuna, Región"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              />
            </Field>
            <Field label="Categoría" required>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              >
                <option>Vivienda nueva</option>
                <option>Remodelación</option>
                <option>Ampliación</option>
                <option>Comercial</option>
                <option>Otro</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Año" required>
              <input
                type="number"
                value={form.year}
                onChange={(e) => set('year', Number(e.target.value))}
                required
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              />
            </Field>
            <Field label="Superficie (m²)" required>
              <input
                type="number"
                value={form.area_m2}
                onChange={(e) => set('area_m2', Number(e.target.value))}
                required
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              />
            </Field>
            <Field label="Destacado">
              <button
                type="button"
                onClick={() => set('featured', !form.featured)}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  form.featured
                    ? 'border-[#facc15] bg-[#facc15]/15 text-[#facc15]'
                    : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                }`}
              >
                {form.featured ? '★ Destacado' : 'Normal'}
              </button>
            </Field>
          </div>

          <Field label="Resumen (1-2 líneas)" required>
            <textarea
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              required
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>

          <Field label="Descripción completa" required>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              required
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Materiales (uno por línea)">
              <textarea
                value={(form.materials || []).join('\n')}
                onChange={(e) => setList('materials', e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              />
            </Field>
            <Field label="Alcance ejecutado (uno por línea)">
              <textarea
                value={(form.scope || []).join('\n')}
                onChange={(e) => setList('scope', e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
              />
            </Field>
          </div>

          <Field label="Highlights (uno por línea)">
            <textarea
              value={(form.highlights || []).join('\n')}
              onChange={(e) => setList('highlights', e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>
        </div>

        <div className="space-y-5">
          <Field label="Imagen principal (URL)" required>
            <input
              value={form.hero_image}
              onChange={(e) => set('hero_image', e.target.value)}
              required
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>
          {form.hero_image ? (
            <img
              src={form.hero_image}
              alt="preview"
              className="aspect-[4/3] w-full rounded-xl border border-white/10 object-cover"
            />
          ) : null}

          <Field label="Galería (URLs, una por línea)">
            <textarea
              value={(form.gallery || []).join('\n')}
              onChange={(e) => setList('gallery', e.target.value)}
              rows={4}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#facc15]/60"
            />
          </Field>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#facc15] py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#fde047] disabled:opacity-60"
            >
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar proyecto'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/10 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </span>
      {children}
    </label>
  );
}
