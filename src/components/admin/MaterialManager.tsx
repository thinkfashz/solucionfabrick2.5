'use client';

/**
 * MaterialManager
 * ---------------
 * Admin panel component for the budget configurator (`ProjectBuilder`).
 * Lets the administrator create / edit / delete the materials and services
 * shown on the public quote builder.
 *
 * State is held locally (`useState`). The database wiring is intentionally
 * left as commented stubs — replace the bodies of `dbList`, `dbCreate`,
 * `dbUpdate` and `dbDelete` with InsForge / REST / RPC calls when ready.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  Package,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                         */
/* -------------------------------------------------------------------------- */

export type MaterialCategory =
  | 'obra-gruesa'
  | 'terminaciones'
  | 'electricidad'
  | 'gasfiteria'
  | 'climatizacion'
  | 'conectividad'
  | 'seguridad'
  | 'servicios';

export type MaterialUnit = 'm2' | 'ml' | 'unidad' | 'global' | 'kit' | 'instalacion';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  price: number;
  imageUrl: string;
  active: boolean;
  /** Optional ISO timestamps when wired to a DB. */
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORY_OPTIONS: { value: MaterialCategory; label: string }[] = [
  { value: 'obra-gruesa',   label: 'Obra Gruesa' },
  { value: 'terminaciones', label: 'Terminaciones' },
  { value: 'electricidad',  label: 'Electricidad' },
  { value: 'gasfiteria',    label: 'Gasfitería' },
  { value: 'climatizacion', label: 'Aire Acondicionado' },
  { value: 'conectividad',  label: 'Internet Satelital' },
  { value: 'seguridad',     label: 'Cámaras / Seguridad' },
  { value: 'servicios',     label: 'Servicios' },
];

const UNIT_OPTIONS: { value: MaterialUnit; label: string }[] = [
  { value: 'm2',          label: 'm²' },
  { value: 'ml',          label: 'metro lineal' },
  { value: 'unidad',      label: 'unidad' },
  { value: 'kit',         label: 'kit' },
  { value: 'global',      label: 'global' },
  { value: 'instalacion', label: 'instalación' },
];

const CATEGORY_LABEL: Record<MaterialCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
) as Record<MaterialCategory, string>;

const UNIT_LABEL: Record<MaterialUnit, string> = Object.fromEntries(
  UNIT_OPTIONS.map((u) => [u.value, u.label]),
) as Record<MaterialUnit, string>;

const EMPTY_FORM: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  category: 'obra-gruesa',
  unit: 'm2',
  price: 0,
  imageUrl: '',
  active: true,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* -------------------------------------------------------------------------- */
/*  DB stubs — wire these to your backend (InsForge / REST / Server Actions)  */
/* -------------------------------------------------------------------------- */

// async function dbList(): Promise<Material[]> {
//   // TODO: GET /api/admin/materials → return rows
//   //   const res = await fetch('/api/admin/materials', { cache: 'no-store' });
//   //   if (!res.ok) throw new Error('No se pudieron cargar los materiales');
//   //   return (await res.json()) as Material[];
//   return [];
// }

// async function dbCreate(input: Omit<Material, 'id'>): Promise<Material> {
//   // TODO: POST /api/admin/materials with `input` → return persisted row
//   //   const res = await fetch('/api/admin/materials', {
//   //     method: 'POST',
//   //     headers: { 'Content-Type': 'application/json' },
//   //     body: JSON.stringify(input),
//   //   });
//   //   if (!res.ok) throw new Error('Error al crear material');
//   //   return (await res.json()) as Material;
//   return { ...input, id: uid() };
// }

// async function dbUpdate(id: string, input: Partial<Material>): Promise<Material> {
//   // TODO: PATCH /api/admin/materials/:id with `input`
//   //   const res = await fetch(`/api/admin/materials/${id}`, {
//   //     method: 'PATCH',
//   //     headers: { 'Content-Type': 'application/json' },
//   //     body: JSON.stringify(input),
//   //   });
//   //   if (!res.ok) throw new Error('Error al actualizar material');
//   //   return (await res.json()) as Material;
//   throw new Error('not implemented');
// }

// async function dbDelete(id: string): Promise<void> {
//   // TODO: DELETE /api/admin/materials/:id
//   //   const res = await fetch(`/api/admin/materials/${id}`, { method: 'DELETE' });
//   //   if (!res.ok) throw new Error('Error al eliminar material');
// }

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export interface MaterialManagerProps {
  /** Optional initial dataset (e.g. injected from a server component). */
  initialMaterials?: Material[];
}

export default function MaterialManager({ initialMaterials = [] }: MaterialManagerProps) {
  /* --------------------------- list state ---------------------------- */
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<MaterialCategory | 'all'>('all');

  /* --------------------------- form state ---------------------------- */
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* --------------------------- data load ----------------------------- */
  useEffect(() => {
    // TODO: replace with `dbList()` once the API is ready.
    // (async () => {
    //   try { setMaterials(await dbList()); }
    //   catch (e) { console.error(e); }
    // })();
  }, []);

  /* ------------------------- derived values -------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (filterCategory !== 'all' && m.category !== filterCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        CATEGORY_LABEL[m.category].toLowerCase().includes(q)
      );
    });
  }, [materials, query, filterCategory]);

  /* ---------------------------- handlers ----------------------------- */

  const updateField = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (material: Material) => {
    setEditingId(material.id);
    setForm({
      name: material.name,
      category: material.category,
      unit: material.unit,
      price: material.price,
      imageUrl: material.imageUrl,
      active: material.active,
    });
    setFeedback(null);
    // Scroll the form into view on mobile.
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Basic validation.
    if (!form.name.trim()) {
      setFeedback({ kind: 'err', msg: 'El nombre es obligatorio.' });
      return;
    }
    if (!Number.isFinite(form.price) || form.price < 0) {
      setFeedback({ kind: 'err', msg: 'El precio debe ser un número válido (≥ 0).' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        // TODO: replace with `await dbUpdate(editingId, form)`.
        const updated: Material = {
          id: editingId,
          ...form,
          updatedAt: new Date().toISOString(),
        };
        setMaterials((list) => list.map((m) => (m.id === editingId ? updated : m)));
        setFeedback({ kind: 'ok', msg: 'Material actualizado.' });
      } else {
        // TODO: replace with `await dbCreate(form)`.
        const created: Material = {
          id: uid(),
          ...form,
          createdAt: new Date().toISOString(),
        };
        setMaterials((list) => [created, ...list]);
        setFeedback({ kind: 'ok', msg: 'Material añadido al cotizador.' });
      }
      resetForm();
    } catch (err) {
      setFeedback({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = materials.find((m) => m.id === id);
    if (!target) return;
    if (!confirm(`¿Eliminar "${target.name}" del cotizador?`)) return;

    try {
      // TODO: replace with `await dbDelete(id)`.
      setMaterials((list) => list.filter((m) => m.id !== id));
      if (editingId === id) resetForm();
      setFeedback({ kind: 'ok', msg: 'Material eliminado.' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'No se pudo eliminar el material.',
      });
    }
  };

  const toggleActive = async (id: string) => {
    setMaterials((list) =>
      list.map((m) => (m.id === id ? { ...m, active: !m.active } : m)),
    );
    // TODO: persist via `dbUpdate(id, { active: !current.active })`.
  };

  const handleImagePick = (file: File | null) => {
    if (!file) return;
    // For now we only preview the file via an object URL. Wire this to your
    // upload endpoint (e.g. /api/admin/upload) and store the resulting URL.
    // TODO: const url = await uploadToStorage(file);
    const url = URL.createObjectURL(file);
    updateField('imageUrl', url);
  };

  /* ------------------------------ UI -------------------------------- */

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-yellow-400/90">
              <Package className="h-3.5 w-3.5" aria-hidden /> Panel administrador
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
              Gestor de Materiales
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Crea, edita y publica los ítems que aparecen en el cotizador.
            </p>
          </div>
          <div className="text-sm text-zinc-500">
            <span className="font-semibold text-white">{materials.length}</span> ítems &middot;{' '}
            <span className="font-semibold text-yellow-400">
              {materials.filter((m) => m.active).length}
            </span>{' '}
            online
          </div>
        </header>

        {/* Feedback banner */}
        {feedback && (
          <div
            role="status"
            className={[
              'mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
              feedback.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300',
            ].join(' ')}
          >
            {feedback.kind === 'ok' ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            <span>{feedback.msg}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar mensaje"
              className="ml-auto text-current opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {/* Form Card */}
        <div ref={formRef} className="mb-10 rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-base font-semibold text-white">
              {editingId ? 'Editar material' : 'Añadir nuevo material'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            {/* Name */}
            <Field label="Nombre del material o servicio" htmlFor="mm-name" className="md:col-span-2">
              <input
                id="mm-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ej. Radier 10 cm"
                className="input"
              />
            </Field>

            {/* Category */}
            <Field label="Categoría" htmlFor="mm-category">
              <select
                id="mm-category"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as MaterialCategory)}
                className="input"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Unit */}
            <Field label="Unidad de cobro" htmlFor="mm-unit">
              <select
                id="mm-unit"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value as MaterialUnit)}
                className="input"
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Price */}
            <Field label="Precio (CLP)" htmlFor="mm-price">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  $
                </span>
                <input
                  id="mm-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.price}
                  onChange={(e) => updateField('price', Number(e.target.value))}
                  className="input pl-7"
                  placeholder="0"
                />
              </div>
            </Field>

            {/* Image URL + upload */}
            <Field label="Imagen (URL o archivo)" htmlFor="mm-image">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="mm-image"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => updateField('imageUrl', e.target.value)}
                  placeholder="https://…"
                  className="input flex-1"
                />
                <label
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08] focus-within:ring-2 focus-within:ring-yellow-300"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Subir
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </Field>

            {/* Image preview */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-black/40 p-3">
                <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-white/10">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-zinc-600" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 text-xs text-zinc-500">
                  <p className="font-medium text-zinc-300">Vista previa</p>
                  <p className="mt-0.5 truncate">
                    {form.imageUrl || 'Pega una URL o sube una imagen.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <Field label="Estado en la web" htmlFor="mm-active" className="md:col-span-2">
              <label htmlFor="mm-active" className="flex cursor-pointer items-center gap-3">
                <button
                  id="mm-active"
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  onClick={() => updateField('active', !form.active)}
                  className={[
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    form.active ? 'bg-yellow-400' : 'bg-zinc-700',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      form.active ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  {form.active ? (
                    <>
                      <span className="font-semibold text-yellow-400">Activo</span> · visible en
                      el cotizador público
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-zinc-400">Inactivo</span> · oculto al
                      cliente
                    </>
                  )}
                </span>
              </label>
            </Field>

            {/* Submit */}
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(250,204,21,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingId ? <Save className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                {submitting
                  ? 'Guardando…'
                  : editingId
                  ? 'Guardar cambios'
                  : 'Añadir al Cotizador'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  Descartar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Materiales registrados</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="input h-9 w-56 pl-9 text-sm"
                aria-label="Buscar material"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as MaterialCategory | 'all')
              }
              className="input h-9 w-44 text-sm"
              aria-label="Filtrar por categoría"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5 text-sm">
              <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Material</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Unidad</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Precio</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                      {materials.length === 0
                        ? 'Aún no hay materiales. Crea el primero usando el formulario.'
                        : 'No se encontraron materiales con esos filtros.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-950 ring-1 ring-white/10">
                            {m.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-zinc-600" aria-hidden />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{m.name}</p>
                            <p className="truncate text-xs text-zinc-500">ID: {m.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{CATEGORY_LABEL[m.category]}</td>
                      <td className="px-4 py-3 text-zinc-300">{UNIT_LABEL[m.unit]}</td>
                      <td className="px-4 py-3 font-semibold text-yellow-400">
                        {formatCLP(m.price)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(m.id)}
                          aria-label={`Cambiar estado de ${m.name}`}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                            m.active
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25'
                              : 'bg-zinc-700/30 text-zinc-400 ring-1 ring-white/10 hover:bg-zinc-700/50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-1.5 w-1.5 rounded-full',
                              m.active ? 'bg-emerald-400' : 'bg-zinc-500',
                            ].join(' ')}
                          />
                          {m.active ? 'Online' : 'Offline'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            aria-label={`Editar ${m.name}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            aria-label={`Eliminar ${m.name}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Local input styles — keeps the file self-contained without needing a
          shared design-system class. */}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(0, 0, 0, 0.5);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #fafafa;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms, background-color 150ms;
        }
        :global(.input::placeholder) {
          color: #52525b;
        }
        :global(.input:hover) {
          border-color: rgba(255, 255, 255, 0.18);
        }
        :global(.input:focus) {
          border-color: rgba(250, 204, 21, 0.6);
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.15);
          background-color: rgba(0, 0, 0, 0.7);
        }
        :global(select.input) {
          appearance: none;
          background-image: linear-gradient(
              45deg,
              transparent 50%,
              rgba(250, 204, 21, 0.7) 50%
            ),
            linear-gradient(135deg, rgba(250, 204, 21, 0.7) 50%, transparent 50%);
          background-position:
            calc(100% - 16px) 50%,
            calc(100% - 11px) 50%;
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
          padding-right: 2rem;
        }
        :global(select.input option) {
          background-color: #18181b;
          color: #fafafa;
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  htmlFor,
  children,
  className = '',
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
