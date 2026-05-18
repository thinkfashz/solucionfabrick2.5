'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import type { FabrickProject } from '@/lib/projects';

type SourceFlag = 'db' | 'seed' | 'unknown';
type ToastState = { msg: string; type: 'success' | 'error' } | null;

const EMPTY_PROJECT = (): FabrickProject => ({
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
});

export default function AdminProyectosPage() {
  const [projects, setProjects] = useState<FabrickProject[]>([]);
  const [source, setSource] = useState<SourceFlag>('unknown');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FabrickProject | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch('/api/proyectos', { cache: 'no-store' });
      const json = (await res.json()) as { data?: FabrickProject[]; source?: SourceFlag };
      const nextSource = json.source || 'unknown';
      setSource(nextSource);
      setProjects(nextSource === 'db' ? (json.data || []) : []);
    } catch {
      setSource('unknown');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(values: FabrickProject) {
    try {
      const isNew = creating || !projects.some((project) => project.id === values.id);
      const url = isNew ? '/api/proyectos' : `/api/proyectos?id=${encodeURIComponent(values.id)}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Error desconocido');
      notify(isNew ? 'Proyecto creado' : 'Proyecto actualizado');
      setEditing(null);
      setCreating(false);
      void reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el proyecto.', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/proyectos?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Error al eliminar');
      notify('Proyecto eliminado');
      setDeleteId(null);
      void reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar el proyecto.', 'error');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) =>
      [project.title, project.location, project.category, project.summary]
        .some((value) => String(value || '').toLowerCase().includes(q)),
    );
  }, [projects, query]);

  if (editing || creating) {
    return (
      <ProjectForm
        initial={editing ?? EMPTY_PROJECT()}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={handleSave}
      />
    );
  }

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#facc15]">Proyectos</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Gestión de obras</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Fuente actual:{' '}
            <span className={source === 'db' ? 'text-emerald-400' : 'text-yellow-400'}>
              {source === 'db' ? 'Base de datos' : 'Tabla projects no disponible'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={source !== 'db'}
          className="inline-flex items-center gap-2 rounded-xl bg-[#facc15] px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#fde047] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> Nuevo proyecto
        </button>
      </div>

      {source !== 'db' ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-xs text-yellow-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p>
              El admin no muestra proyectos seed/demo. Crea la tabla{' '}
              <code className="rounded bg-black/40 px-1">projects</code> en InsForge para habilitar el CRUD real.
            </p>
            <Link
              href="/admin/setup"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-yellow-200 transition hover:bg-yellow-500/20"
            >
              Crear tablas en InsForge
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5">
        <Search size={14} className="text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título, ubicación, categoría..."
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/80 p-10 text-center text-sm text-zinc-500">
          {source === 'db' ? 'No hay proyectos que coincidan con la búsqueda.' : 'Sin proyectos reales disponibles hasta crear la tabla projects.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((project) => (
            <article key={project.id} className="flex overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/80">
              <div className="h-auto w-32 flex-shrink-0 bg-zinc-900">
                {project.hero_image ? (
                  <img src={project.hero_image} alt={project.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">Sin imagen</div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#facc15]">{project.category}</p>
                    {project.featured ? <span className="text-[9px] text-yellow-400">★</span> : null}
                  </div>
                  <h3 className="text-sm font-bold uppercase leading-tight text-white">{project.title}</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">{project.location} · {project.area_m2} m² · {project.year}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(project)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[10px] uppercase tracking-wider text-white/70 hover:border-[#facc15]/40 hover:text-white"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(project.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="mb-2 font-bold text-white">Eliminar proyecto</h3>
            <p className="mb-5 text-sm text-zinc-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={() => void handleDelete(deleteId)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500">Eliminar</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-5 py-3 text-sm font-medium shadow-xl ${toast.type === 'success' ? 'border-[#facc15]/40 bg-zinc-900 text-[#facc15]' : 'border-red-500/40 bg-zinc-900 text-red-400'}`}>
          {toast.msg}
        </div>
      ) : null}
    </main>
  );
}

function ProjectForm({ initial, onCancel, onSave }: { initial: FabrickProject; onCancel: () => void; onSave: (value: FabrickProject) => void | Promise<void> }) {
  const [form, setForm] = useState<FabrickProject>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FabrickProject>(key: K, value: FabrickProject[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setList(key: 'materials' | 'highlights' | 'scope' | 'gallery', raw: string) {
    const items = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    set(key, items as FabrickProject[typeof key]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10 md:px-10">
      <button type="button" onClick={onCancel} className="mb-6 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft size={12} /> Volver al listado
      </button>

      <h1 className="mb-8 text-2xl font-black uppercase tracking-tight text-white">
        {initial.title ? 'Editar proyecto' : 'Nuevo proyecto'}
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Field label="Título" required>
            <input value={form.title} onChange={(event) => set('title', event.target.value)} required className="input-project" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ubicación" required>
              <input value={form.location} onChange={(event) => set('location', event.target.value)} required placeholder="Comuna, Región" className="input-project" />
            </Field>
            <Field label="Categoría" required>
              <select value={form.category} onChange={(event) => set('category', event.target.value)} className="input-project">
                <option>Vivienda nueva</option>
                <option>Remodelación</option>
                <option>Ampliación</option>
                <option>Comercial</option>
                <option>Otro</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Año" required>
              <input type="number" value={form.year} onChange={(event) => set('year', Number(event.target.value))} required className="input-project" />
            </Field>
            <Field label="Superficie (m²)" required>
              <input type="number" value={form.area_m2} onChange={(event) => set('area_m2', Number(event.target.value))} required className="input-project" />
            </Field>
            <Field label="Destacado">
              <button type="button" onClick={() => set('featured', !form.featured)} className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${form.featured ? 'border-[#facc15] bg-[#facc15]/15 text-[#facc15]' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'}`}>
                {form.featured ? '★ Destacado' : 'Normal'}
              </button>
            </Field>
          </div>

          <Field label="Resumen" required>
            <textarea value={form.summary} onChange={(event) => set('summary', event.target.value)} required rows={2} className="input-project" />
          </Field>
          <Field label="Descripción" required>
            <textarea value={form.description} onChange={(event) => set('description', event.target.value)} required rows={5} className="input-project" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Materiales (uno por línea)">
              <textarea value={(form.materials || []).join('\n')} onChange={(event) => setList('materials', event.target.value)} rows={6} className="input-project" />
            </Field>
            <Field label="Alcance ejecutado (uno por línea)">
              <textarea value={(form.scope || []).join('\n')} onChange={(event) => setList('scope', event.target.value)} rows={6} className="input-project" />
            </Field>
          </div>

          <Field label="Highlights (uno por línea)">
            <textarea value={(form.highlights || []).join('\n')} onChange={(event) => setList('highlights', event.target.value)} rows={5} className="input-project" />
          </Field>
        </div>

        <aside className="space-y-5">
          <Field label="Imagen principal">
            <input value={form.hero_image || ''} onChange={(event) => set('hero_image', event.target.value)} placeholder="https://..." className="input-project" />
          </Field>

          <Field label="Galería (una URL por línea)">
            <textarea value={(form.gallery || []).join('\n')} onChange={(event) => setList('gallery', event.target.value)} rows={8} className="input-project" />
          </Field>

          {form.hero_image ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              <img src={form.hero_image} alt="Vista previa" className="h-48 w-full object-cover" />
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-6">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 hover:bg-white/5">Cancelar</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#facc15] px-5 py-3 text-sm font-bold text-black hover:bg-[#fde047] disabled:opacity-50">
          <Save size={16} /> {saving ? 'Guardando…' : 'Guardar proyecto'}
        </button>
      </div>

      <style jsx>{`
        .input-project {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgb(24 24 27);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
        }
        .input-project:focus {
          border-color: rgba(250, 204, 21, 0.6);
        }
      `}</style>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
