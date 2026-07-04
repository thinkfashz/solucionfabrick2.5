'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useCategories } from '@/hooks/useCategories';
import { ArrowLeft, ChevronLeft, ChevronRight, Cloud, ImagePlus, Star, Trash2, Upload } from 'lucide-react';

/* ── Helpers ── */
function formatDisplayPrice(raw: string) {
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  if (isNaN(n)) return '';
  return n.toLocaleString('es-CL');
}

function normalizeSpecs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function toImageArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function buildInitialGallery(imageUrl?: string, specs?: Record<string, unknown>) {
  const images = [
    imageUrl?.trim() || '',
    ...toImageArray(specs?.gallery_images),
    ...toImageArray(specs?.images),
    ...toImageArray(specs?.image_urls),
  ].filter(Boolean);
  return Array.from(new Set(images));
}

function uniqImages(images: string[]) {
  return Array.from(new Set(images.map((item) => item.trim()).filter(Boolean)));
}

/* ── Toggle switch ── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#facc15]/50 focus:ring-offset-2 focus:ring-offset-black ${checked ? 'bg-[#facc15]' : 'bg-zinc-700'}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

/* ── Toast ── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-28 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-2xl px-5 py-3 text-sm font-medium shadow-xl border backdrop-blur-xl md:bottom-6 ${
        type === 'success'
          ? 'bg-zinc-900/95 border-[#facc15]/40 text-[#facc15]'
          : 'bg-zinc-900/95 border-red-500/40 text-red-400'
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
  delivery_days: string;
  tagline: string;
  image_url: string;
  activo: boolean;
  featured: boolean;
  specifications: Record<string, unknown>;
  /* Origen del producto (importado de Mercado Libre / Falabella / etc.) */
  source: string;
  source_url: string;
  source_id: string;
  supplier_price: string;
  supplier_currency: string;
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
  const cloudFileInputRef = useRef<HTMLInputElement>(null);

  const initialSpecs = normalizeSpecs(initialData?.specifications);

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price ?? '',
    category_id: initialData?.category_id ?? '',
    stock: initialData?.stock ?? '',
    delivery_days: initialData?.delivery_days ?? '',
    tagline: initialData?.tagline ?? '',
    image_url: initialData?.image_url ?? '',
    activo: initialData?.activo ?? true,
    featured: initialData?.featured ?? false,
    specifications: initialSpecs,
    source: initialData?.source ?? '',
    source_url: initialData?.source_url ?? '',
    source_id: initialData?.source_id ?? '',
    supplier_price: initialData?.supplier_price ?? '',
    supplier_currency: initialData?.supplier_currency ?? '',
  });

  const [galleryImages, setGalleryImages] = useState<string[]>(() => buildInitialGallery(initialData?.image_url, initialSpecs));
  const [priceDisplay, setPriceDisplay] = useState(
    initialData?.price ? formatDisplayPrice(initialData.price) : ''
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /* previewUrl holds a temporary blob: URL for local preview only — never saved to DB */
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const prevPreviewUrl = useRef<string>('');

  /* Revoke stale objectURL when previewUrl changes or component unmounts */
  useEffect(() => {
    if (prevPreviewUrl.current && prevPreviewUrl.current !== previewUrl) {
      URL.revokeObjectURL(prevPreviewUrl.current);
    }
    prevPreviewUrl.current = previewUrl;
    return () => {
      if (prevPreviewUrl.current) {
        URL.revokeObjectURL(prevPreviewUrl.current);
        prevPreviewUrl.current = '';
      }
    };
  }, [previewUrl]);

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

  function addGalleryImage(url: string, makeCover = false) {
    const clean = url.trim();
    if (!clean) return;
    setGalleryImages((current) => uniqImages([...current, clean]));
    setForm((current) => ({
      ...current,
      image_url: makeCover || !current.image_url ? clean : current.image_url,
    }));
  }

  function removeGalleryImage(url: string) {
    const clean = url.trim();
    setGalleryImages((current) => {
      const next = current.filter((item) => item !== clean);
      setForm((formState) => ({ ...formState, image_url: formState.image_url === clean ? (next[0] ?? '') : formState.image_url }));
      return next;
    });
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    setGalleryImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setCoverImage(url: string) {
    addGalleryImage(url, true);
    setPreviewUrl('');
  }

  async function uploadToInsForge(file: File) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await insforge.storage
      .from('product-images')
      .upload(path, file);

    if (uploadError) throw uploadError;

    const publicUrlResult = await insforge.storage
      .from('product-images')
      .getPublicUrl(path);

    return typeof publicUrlResult === 'string'
      ? publicUrlResult
      : (publicUrlResult as { data?: { publicUrl?: string }; publicUrl?: string })?.data?.publicUrl ??
        (publicUrlResult as { publicUrl?: string })?.publicUrl ??
        '';
  }

  /* ── Image upload ── */
  async function handleImageUpload(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    setUploading(true);
    try {
      try {
        const localBlob = URL.createObjectURL(selected[0]);
        setPreviewUrl(localBlob);
      } catch { /* ignore if browser doesn't support it */ }

      let added = 0;
      for (const file of selected) {
        const publicUrl = await uploadToInsForge(file);
        if (publicUrl) {
          addGalleryImage(publicUrl, galleryImages.length === 0 && added === 0 && !form.image_url);
          added += 1;
        }
      }
      setPreviewUrl('');
      if (added > 0) showToast(`${added} imagen${added === 1 ? '' : 'es'} agregada${added === 1 ? '' : 's'} a la galería.`, 'success');
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
      let msg = 'Storage no disponible. Ingresa una URL de imagen manual.';
      if (/bucket.*(not.*found|does not exist)|404|no such bucket/.test(raw)) {
        msg = 'Bucket "product-images" no existe. Créalo en InsForge (Storage → New bucket) y reintenta.';
      } else if (/permission|unauthorized|401|403/.test(raw)) {
        msg = 'Sin permisos para subir al bucket "product-images". Revisa las policies en InsForge.';
      } else if (/payload too large|413|file size|too large/.test(raw)) {
        msg = 'La imagen supera el tamaño máximo permitido. Comprímela e inténtalo de nuevo.';
      }
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function uploadToCloudinary(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'fabrick/productos');
    const res = await fetch('/api/admin/cloudinary', { method: 'POST', body: fd });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; asset?: { url?: string } };
    if (!res.ok) {
      if (json.code === 'NOT_CONFIGURED') {
        throw new Error('Cloudinary no configurado. Ve a Configuración → Integraciones.');
      }
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    const url = json.url || json.asset?.url || '';
    if (!url) throw new Error('Cloudinary no devolvió una URL.');
    return url;
  }

  /* ── Image upload to Cloudinary ── */
  async function handleCloudinaryUpload(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    setUploadingCloud(true);
    try {
      try {
        const localBlob = URL.createObjectURL(selected[0]);
        setPreviewUrl(localBlob);
      } catch { /* ignore */ }

      let added = 0;
      for (const file of selected) {
        const url = await uploadToCloudinary(file);
        addGalleryImage(url, galleryImages.length === 0 && added === 0 && !form.image_url);
        added += 1;
      }
      setPreviewUrl('');
      showToast(`${added} imagen${added === 1 ? '' : 'es'} subida${added === 1 ? '' : 's'} a Cloudinary.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir a Cloudinary.', 'error');
    } finally {
      setUploadingCloud(false);
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

    const cleanGallery = uniqImages([form.image_url, ...galleryImages]);
    const specifications = {
      ...form.specifications,
      gallery_images: cleanGallery,
    };

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseInt(form.price, 10),
      category_id: form.category_id,
      stock: form.stock ? parseInt(form.stock, 10) : null,
      delivery_days: (() => {
        if (!form.delivery_days) return null;
        const n = parseInt(form.delivery_days, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })(),
      tagline: form.tagline.trim() || null,
      image_url: cleanGallery[0] || form.image_url || null,
      specifications,
      activo: form.activo,
      featured: form.featured,
      source: form.source.trim() || null,
      source_url: form.source_url.trim() || null,
      source_id: form.source_id.trim() || null,
      supplier_price: form.supplier_price ? Number(form.supplier_price) : null,
      supplier_currency: form.supplier_currency.trim() || null,
    };

    let error;
    if (mode === 'create') {
      ({ error } = await insforge.database.from('products').insert([payload]));
    } else {
      ({ error } = await insforge.database.from('products').update(payload).eq('id', productId!));
    }

    setSaving(false);
    if (error) {
      const errAny = error as unknown as { message?: string; code?: string; status?: number };
      const raw = (errAny.message ?? '').toLowerCase();
      let hint = '';
      if (/relation .* does not exist|table .* not found|42p01/.test(raw) || /products/.test(raw) && /not.*exist/.test(raw)) {
        hint = ' La tabla "products" no existe en InsForge. Ve a /admin/productos y usa el botón "Configurar tablas".';
      } else if (/permission denied|42501|not authorized|unauthorized/.test(raw)) {
        hint = ' Revisa los permisos de la tabla "products" en InsForge (policy / RLS).';
      } else if (/duplicate key|23505/.test(raw)) {
        hint = ' Ya existe un producto con esos valores únicos.';
      } else if (/violates not-null|null value in column/.test(raw)) {
        hint = ' Falta completar un campo obligatorio en la tabla.';
      }
      const base = errAny.message || 'Error al guardar el producto';
      showToast(`${base}.${hint} Por favor, inténtalo de nuevo.`, 'error');
    } else {
      showToast(mode === 'create' ? '✓ Producto creado exitosamente' : '✓ Producto actualizado correctamente');
      setTimeout(() => router.push('/admin/productos'), 1200);
    }
  }

  const priceNumber = parseInt(form.price || '0', 10) || 0;
  const supplierPriceNumber = Number(form.supplier_price || 0);
  const marginPct =
    priceNumber > 0 && supplierPriceNumber > 0
      ? Math.round(((priceNumber - supplierPriceNumber) / priceNumber) * 100)
      : null;
  const previewImage = previewUrl || form.image_url || galleryImages[0] || '';

  return (
    <div className="min-h-screen bg-black pb-32 text-white lg:pb-8">
      {/* ── Header ── */}
      <div className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm px-5 py-4 flex items-center gap-4 sm:px-6">
        <button
          onClick={() => router.push('/admin/productos')}
          aria-label="Volver a productos"
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

      {/* ── Form + Preview ── */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={handleSubmit} className="space-y-6">

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

        {/* Precio, Stock y Días de envío */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

          <Field label="Días de envío">
            <input
              type="number"
              min="0"
              step="1"
              value={form.delivery_days}
              onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))}
              placeholder="3"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Categoría */}
        <Field label="Categoría">
          <select
            aria-label="Categoría del producto"
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
        <Field label="Imágenes del producto">
          <div className="space-y-3">
            {/* Preview: show blob preview during upload, or the saved URL */}
            {previewImage && (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setForm((f) => ({ ...f, image_url: '' })); setPreviewUrl(''); }}
                  aria-label="Quitar portada"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
                <span className="absolute bottom-2 left-2 rounded-full border border-yellow-300/40 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                  Portada
                </span>
              </div>
            )}

            {/* Upload buttons: InsForge + Cloudinary */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || uploadingCloud}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Subiendo…' : 'Subir imágenes a InsForge'}
              </button>
              <button
                type="button"
                onClick={() => cloudFileInputRef.current?.click()}
                disabled={uploading || uploadingCloud}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-yellow-400/40 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/70 transition-colors text-sm disabled:opacity-50"
                title="Sube estas fotos a tu cuenta de Cloudinary (carpeta fabrick/productos)"
              >
                <Cloud className="w-4 h-4" />
                {uploadingCloud ? 'Subiendo a Cloudinary…' : 'Subir imágenes a Cloudinary'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              aria-label="Seleccionar imágenes para InsForge"
              title="Seleccionar imágenes para InsForge"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) void handleImageUpload(files);
                e.target.value = '';
              }}
            />
            <input
              ref={cloudFileInputRef}
              type="file"
              multiple
              accept="image/*"
              aria-label="Seleccionar imágenes para Cloudinary"
              title="Seleccionar imágenes para Cloudinary"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) void handleCloudinaryUpload(files);
                e.target.value = '';
              }}
            />

            {galleryImages.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Galería horizontal</p>
                  <p className="text-xs text-zinc-600">{galleryImages.length} imagen{galleryImages.length === 1 ? '' : 'es'}</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 pr-2 scrollbar-hide">
                  {galleryImages.map((url, index) => (
                    <div key={`${url}-${index}`} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <img src={url} alt={`Miniatura ${index + 1}`} className="h-full w-full object-cover" />
                      {form.image_url === url && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">Portada</span>
                      )}
                      <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-full bg-black/65 p-1 opacity-100 backdrop-blur-sm sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                        <button type="button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} aria-label="Mover imagen a la izquierda" className="grid h-6 w-6 place-items-center rounded-full text-white/80 disabled:opacity-25 hover:bg-white/10"><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setCoverImage(url)} aria-label="Usar como portada" className="grid h-6 w-6 place-items-center rounded-full text-yellow-300 hover:bg-yellow-300/10"><Star className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => moveGalleryImage(index, 1)} disabled={index === galleryImages.length - 1} aria-label="Mover imagen a la derecha" className="grid h-6 w-6 place-items-center rounded-full text-white/80 disabled:opacity-25 hover:bg-white/10"><ChevronRight className="h-3.5 w-3.5" /></button>
                      </div>
                      <button type="button" onClick={() => removeGalleryImage(url)} aria-label="Eliminar miniatura" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-red-200 backdrop-blur-sm hover:bg-red-500 hover:text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-600">Toca ★ para elegir portada, usa las flechas para cambiar el orden o elimina la imagen que no te guste.</p>
              </div>
            )}

            {/* URL manual */}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="O ingresa una URL de imagen…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => addGalleryImage(form.image_url, true)}
                disabled={!form.image_url.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-yellow-300/40 hover:text-yellow-200 disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" />
                Añadir
              </button>
            </div>
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

        {/* Origen del producto — para dropshipping / reventa. */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Origen del producto</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Si revendes este producto desde otro proveedor, guarda el link y el precio de origen para poder comprarlo y enviarlo al cliente desde el pedido.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Origen">
              <select
                aria-label="Origen del producto"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                className={inputClass}
              >
                <option value="">Manual / propio</option>
                <option value="mercadolibre">Mercado Libre</option>
                <option value="generic">Otra tienda</option>
              </select>
            </Field>
            <Field label="ID externo">
              <input
                type="text"
                value={form.source_id}
                aria-label="ID externo del proveedor"
                onChange={(e) => setForm((f) => ({ ...f, source_id: e.target.value }))}
                placeholder="MLC123456789, SKU…"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="URL del proveedor">
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
              placeholder="https://articulo.mercadolibre.cl/MLC-…"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio del proveedor">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.supplier_price}
                aria-label="Precio del proveedor"
                onChange={(e) => setForm((f) => ({ ...f, supplier_price: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <Field label="Moneda proveedor">
              <input
                type="text"
                value={form.supplier_currency}
                onChange={(e) => setForm((f) => ({ ...f, supplier_currency: e.target.value.toUpperCase() }))}
                placeholder="CLP, USD…"
                maxLength={5}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Submit */}
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 pt-4 md:static md:z-auto">
          <button
            type="submit"
            disabled={saving || uploading || uploadingCloud}
            className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-[#facc15] text-black shadow-[0_16px_45px_rgba(250,204,21,0.18)]"
          >
            {saving ? 'Guardando…' : mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      <aside className="xl:sticky xl:top-28 xl:h-fit">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          <div className="relative h-56 border-b border-white/10 bg-zinc-900">
            {previewImage ? (
              <img
                src={previewImage}
                alt={form.name || 'Preview producto'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
                Sin imagen de portada
              </div>
            )}
            <div className="absolute left-3 top-3 flex gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                  form.activo
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-500/30 bg-zinc-600/20 text-zinc-400'
                }`}
              >
                {form.activo ? 'Activo' : 'Oculto'}
              </span>
              {form.featured && (
                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-300">
                  Destacado
                </span>
              )}
            </div>
            {galleryImages.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] font-black text-white/75 backdrop-blur">
                {galleryImages.length} fotos
              </span>
            )}
          </div>

          <div className="space-y-3 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Preview en vivo</p>
            <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">
              {form.name || 'Nombre del producto'}
            </h3>
            <p className="line-clamp-2 text-sm text-zinc-400">
              {form.tagline || 'Tagline comercial del producto'}
            </p>
            <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">
              {form.description || 'Descripción técnica y comercial.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <PreviewChip label="Categoría" value={form.category_id || 'Sin categoría'} />
              <PreviewChip label="Stock" value={form.stock || '—'} />
              <PreviewChip label="Entrega" value={form.delivery_days ? `${form.delivery_days} días` : 'Sin dato'} />
              <PreviewChip label="Fotos" value={String(galleryImages.length || (form.image_url ? 1 : 0))} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Precio público</p>
              <p className="mt-1 text-2xl font-black text-yellow-300">
                {priceNumber > 0 ? `$${priceNumber.toLocaleString('es-CL')}` : '$0'}
              </p>
              <div className="mt-2 space-y-1 text-xs text-zinc-500">
                <p>
                  Proveedor: {supplierPriceNumber > 0 ? `${supplierPriceNumber.toLocaleString('es-CL')} ${form.supplier_currency || ''}` : 'no definido'}
                </p>
                <p>
                  Margen estimado: {marginPct === null ? '—' : `${marginPct}%`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function PreviewChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-2">
      <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">{label}</p>
      <p className="truncate text-xs font-semibold text-zinc-300">{value}</p>
    </div>
  );
}
