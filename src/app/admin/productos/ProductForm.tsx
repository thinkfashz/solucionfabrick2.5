'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useCategories } from '@/hooks/useCategories';
import { Upload, ArrowLeft } from 'lucide-react';

/* ── Helpers ── */
function formatDisplayPrice(raw: string) {
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  if (isNaN(n)) return '';
  return n.toLocaleString('es-CL');
}

/* ── Toggle switch ── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? 'bg-[#facc15]' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

/* ── Toast ── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${
        type === 'success'
          ? 'bg-zinc-900 border-[#facc15]/40 text-[#facc15]'
          : 'bg-zinc-900 border-red-500/40 text-red-400'
      }`}
    >
      {message}
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-zinc-500">
        {label}{required && <span className="text-[#facc15] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#facc15]/50 transition-colors';

/* ════════════════════════════════════════════════
   PROPS
════════════════════════════════════════════════ */
export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  stock: string;
  tagline: string;
  image_url: string;
  activo: boolean;
  featured: boolean;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  mode: 'create' | 'edit';
}

/* ════════════════════════════════════════════════
   FORM COMPONENT
════════════════════════════════════════════════ */
export default function ProductForm({ initialData, productId, mode }: ProductFormProps) {
  const router = useRouter();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price ?? '',
    category_id: initialData?.category_id ?? '',
    stock: initialData?.stock ?? '',
    tagline: initialData?.tagline ?? '',
    image_url: initialData?.image_url ?? '',
    activo: initialData?.activo ?? true,
    featured: initialData?.featured ?? false,
  });

  const [priceDisplay, setPriceDisplay] = useState(
    initialData?.price ? formatDisplayPrice(initialData.price) : ''
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({ value: category.id, label: category.name }));
    if (form.category_id && !options.some((option) => option.value === form.category_id)) {
      options.unshift({ value: form.category_id, label: form.category_id });
    }
    return options;
  }, [categories, form.category_id]);

  useEffect(() => {
    if (!form.category_id && categoryOptions.length > 0) {
      setForm((current) => ({ ...current, category_id: categoryOptions[0].value }));
    }
  }, [categoryOptions, form.category_id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Price input handler ── */
  function handlePriceChange(raw: string) {
    const digits = raw.replace(/\D/g, '');
    setForm((f) => ({ ...f, price: digits }));
    setPriceDisplay(digits ? parseInt(digits, 10).toLocaleString('es-CL') : '');
  }

  /* ── Image upload ── */
  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await insforge.storage
        .from('product-images')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const publicUrlResult = await insforge.storage
        .from('product-images')
        .getPublicUrl(path);

      const publicUrl =
        typeof publicUrlResult === 'string'
          ? publicUrlResult
          : (publicUrlResult as { data?: { publicUrl?: string }; publicUrl?: string })?.data?.publicUrl ??
            (publicUrlResult as { publicUrl?: string })?.publicUrl ??
            '';
      setForm((f) => ({ ...f, image_url: publicUrl }));
    } catch {
      // Fallback: try to create an object URL for preview only
      try {
        const localUrl = URL.createObjectURL(file);
        setForm((f) => ({ ...f, image_url: localUrl }));
      } catch {
        // If object URL creation also fails, leave image_url empty
      }
      showToast('Storage no disponible. Ingresa una URL de imagen manual.', 'error');
    } finally {
      setUploading(false);
    }
  }

  /* ── Validate ── */
  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.price) errs.price = 'El precio es requerido';
    return errs;
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseInt(form.price, 10),
      category_id: form.category_id,
      stock: form.stock ? parseInt(form.stock, 10) : null,
      tagline: form.tagline.trim() || null,
      image_url: form.image_url || null,
      activo: form.activo,
      featured: form.featured,
    };

    let error;
    if (mode === 'create') {
      ({ error } = await insforge.database.from('products').insert([payload]));
    } else {
      ({ error } = await insforge.database.from('products').update(payload).eq('id', productId!));
    }

    setSaving(false);
    if (error) {
      showToast('Error al guardar el producto. Por favor, inténtalo de nuevo.', 'error');
    } else {
      showToast(mode === 'create' ? '✓ Producto creado exitosamente' : '✓ Producto actualizado correctamente');
      setTimeout(() => router.push('/admin/productos'), 1200);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <div className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/productos')}
          className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-bold text-xl tracking-tight">
            {mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            {mode === 'create' ? 'Agrega un nuevo producto al catálogo' : 'Modifica los datos del producto'}
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Nombre */}
        <Field label="Nombre" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Cerradura Biométrica Titanio"
            className={inputClass}
          />
          {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
        </Field>

        {/* Tagline */}
        <Field label="Tagline">
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            placeholder="Tu familia, siempre segura"
            className={inputClass}
          />
        </Field>

        {/* Descripción */}
        <Field label="Descripción">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe las características del producto…"
            className={inputClass + ' resize-none'}
          />
        </Field>

        {/* Precio y Stock */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio CLP" required>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="000.000"
                className={inputClass + ' pl-8'}
              />
            </div>
            {errors.price && <span className="text-red-400 text-xs">{errors.price}</span>}
          </Field>

          <Field label="Stock">
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Categoría */}
        <Field label="Categoría">
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className={inputClass}
          >
            {categoryOptions.length === 0 ? (
              <option value="">Sin categorías disponibles</option>
            ) : (
              categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))
            )}
          </select>
        </Field>

        {/* Imagen */}
        <Field label="Imagen del producto">
          <div className="space-y-3">
            {/* Preview */}
            {form.image_url && (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-colors text-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Subiendo imagen…' : 'Subir imagen'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />

            {/* URL manual */}
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="O ingresa una URL de imagen…"
              className={inputClass}
            />
          </div>
        </Field>

        {/* Toggles */}
        <div className="space-y-4 pt-2">
          <Toggle
            checked={form.activo}
            onChange={(v) => setForm((f) => ({ ...f, activo: v }))}
            label="Activo — visible en la tienda"
          />
          <Toggle
            checked={form.featured}
            onChange={(v) => setForm((f) => ({ ...f, featured: v }))}
            label="Destacado — aparece en el inicio"
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: '#facc15', color: '#000' }}
          >
            {saving ? 'Guardando…' : mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}