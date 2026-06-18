'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cloud, Upload } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { useCategories } from '@/hooks/useCategories';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function parsePositiveNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  const raw = String(value ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatDisplayPrice(raw: string | number) {
  const n = parseInt(String(raw).replace(/\D/g, ''), 10);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('es-CL');
}

function formatPct(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function salePriceFromMargin(cost: number, marginPct: number) {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  const safeMargin = Number.isFinite(marginPct) ? marginPct : 25;
  return Math.max(0, Math.round(cost * (1 + safeMargin / 100)));
}

function markupFromPrice(cost: number, salePrice: number) {
  if (!cost || cost <= 0 || !salePrice || salePrice <= 0) return 25;
  return ((salePrice - cost) / cost) * 100;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <span className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#facc15]/50 focus:ring-offset-2 focus:ring-offset-black ${checked ? 'bg-[#facc15]' : 'bg-zinc-700'}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${type === 'success' ? 'bg-zinc-900 border-[#facc15]/40 text-[#facc15]' : 'bg-zinc-900 border-red-500/40 text-red-400'}`}>
      {message}
    </div>
  );
}

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-zinc-500">
        {label}{required && <span className="text-[#facc15] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-4 text-zinc-600">{hint}</p>}
    </div>
  );
}

const inputClass =
  'bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#facc15]/50 transition-colors';

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

export default function ProductForm({ initialData, productId, mode }: ProductFormProps) {
  const router = useRouter();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cloudFileInputRef = useRef<HTMLInputElement>(null);

  const initialSupplierPrice = parsePositiveNumber(initialData?.supplier_price);
  const initialPublicPrice = parsePositiveNumber(initialData?.price);
  const initialMarginPct = initialSupplierPrice > 0 && initialPublicPrice > 0
    ? formatPct(markupFromPrice(initialSupplierPrice, initialPublicPrice))
    : '25';

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
    source: initialData?.source ?? '',
    source_url: initialData?.source_url ?? '',
    source_id: initialData?.source_id ?? '',
    supplier_price: initialData?.supplier_price ?? '',
    supplier_currency: initialData?.supplier_currency ?? 'CLP',
  });

  const [priceDisplay, setPriceDisplay] = useState(initialData?.price ? formatDisplayPrice(initialData.price) : '');
  const [profitMarginPct, setProfitMarginPct] = useState(initialMarginPct);
  const [uploading, setUploading] = useState(false);
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState('');
  const prevPreviewUrl = useRef('');

  useEffect(() => {
    if (prevPreviewUrl.current && prevPreviewUrl.current !== previewUrl) URL.revokeObjectURL(prevPreviewUrl.current);
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

  function applyPublicPrice(nextPrice: number) {
    const digits = nextPrice > 0 ? String(Math.round(nextPrice)) : '';
    setPriceDisplay(digits ? formatDisplayPrice(digits) : '');
    return digits;
  }

  function handlePriceChange(raw: string) {
    const digits = onlyDigits(raw);
    setForm((f) => ({ ...f, price: digits }));
    setPriceDisplay(digits ? formatDisplayPrice(digits) : '');

    const supplierPrice = parsePositiveNumber(form.supplier_price);
    const publicPrice = parsePositiveNumber(digits);
    if (supplierPrice > 0 && publicPrice > 0) {
      setProfitMarginPct(formatPct(markupFromPrice(supplierPrice, publicPrice)));
    }
  }

  function handleSupplierPriceChange(raw: string) {
    const normalized = onlyDigits(raw);
    const supplierPrice = parsePositiveNumber(normalized);
    const margin = parsePositiveNumber(profitMarginPct || '25');
    const publicPrice = supplierPrice > 0 ? salePriceFromMargin(supplierPrice, margin) : parsePositiveNumber(form.price);
    const price = supplierPrice > 0 ? applyPublicPrice(publicPrice) : form.price;
    setForm((f) => ({
      ...f,
      supplier_price: normalized,
      supplier_currency: f.supplier_currency || 'CLP',
      price,
    }));
  }

  function handleMarginChange(raw: string) {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    setProfitMarginPct(cleaned);
    const margin = parsePositiveNumber(cleaned);
    const supplierPrice = parsePositiveNumber(form.supplier_price);
    if (supplierPrice > 0 && Number.isFinite(margin)) {
      const price = applyPublicPrice(salePriceFromMargin(supplierPrice, margin));
      setForm((f) => ({ ...f, price }));
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try { setPreviewUrl(URL.createObjectURL(file)); } catch { /* ignore */ }
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await insforge.storage.from('product-images').upload(path, file);
      if (uploadError) throw uploadError;
      const publicUrlResult = await insforge.storage.from('product-images').getPublicUrl(path);
      const publicUrl =
        typeof publicUrlResult === 'string'
          ? publicUrlResult
          : (publicUrlResult as { data?: { publicUrl?: string }; publicUrl?: string })?.data?.publicUrl ??
            (publicUrlResult as { publicUrl?: string })?.publicUrl ??
            '';
      setForm((f) => ({ ...f, image_url: publicUrl }));
      setPreviewUrl('');
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
      let msg = 'Storage no disponible. Ingresa una URL de imagen manual.';
      if (/bucket.*(not.*found|does not exist)|404|no such bucket/.test(raw)) msg = 'Bucket "product-images" no existe. Créalo en InsForge y reintenta.';
      else if (/permission|unauthorized|401|403/.test(raw)) msg = 'Sin permisos para subir al bucket "product-images". Revisa las policies en InsForge.';
      else if (/payload too large|413|file size|too large/.test(raw)) msg = 'La imagen supera el tamaño máximo permitido. Comprímela e inténtalo de nuevo.';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleCloudinaryUpload(file: File) {
    setUploadingCloud(true);
    try { setPreviewUrl(URL.createObjectURL(file)); } catch { /* ignore */ }
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'fabrick/productos');
      const res = await fetch('/api/admin/cloudinary', { method: 'POST', body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; asset?: { url?: string } };
      if (!res.ok) {
        if (json.code === 'NOT_CONFIGURED') {
          showToast('Cloudinary no configurado. Ve a Configuración → Integraciones.', 'error');
          return;
        }
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const url = json.url || json.asset?.url || '';
      if (!url) throw new Error('Cloudinary no devolvió una URL.');
      setForm((f) => ({ ...f, image_url: url }));
      setPreviewUrl('');
      showToast('Imagen subida a Cloudinary.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir a Cloudinary.', 'error');
    } finally {
      setUploadingCloud(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.price) errs.price = 'El precio es requerido';
    return errs;
  }

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
      delivery_days: (() => {
        if (!form.delivery_days) return null;
        const n = parseInt(form.delivery_days, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })(),
      tagline: form.tagline.trim() || null,
      image_url: form.image_url || null,
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
      if (/relation .* does not exist|table .* not found|42p01/.test(raw) || /products/.test(raw) && /not.*exist/.test(raw)) hint = ' La tabla "products" no existe en InsForge. Ve a /admin/productos y usa el botón "Configurar tablas".';
      else if (/permission denied|42501|not authorized|unauthorized/.test(raw)) hint = ' Revisa los permisos de la tabla "products" en InsForge.';
      else if (/duplicate key|23505/.test(raw)) hint = ' Ya existe un producto con esos valores únicos.';
      else if (/violates not-null|null value in column/.test(raw)) hint = ' Falta completar un campo obligatorio en la tabla.';
      const base = errAny.message || 'Error al guardar el producto';
      showToast(`${base}.${hint} Por favor, inténtalo de nuevo.`, 'error');
    } else {
      showToast(mode === 'create' ? '✓ Producto creado exitosamente' : '✓ Producto actualizado correctamente');
      setTimeout(() => router.push('/admin/productos'), 1200);
    }
  }

  const priceNumber = parsePositiveNumber(form.price);
  const supplierPriceNumber = parsePositiveNumber(form.supplier_price);
  const marginNumber = parsePositiveNumber(profitMarginPct);
  const estimatedProfit = Math.max(0, priceNumber - supplierPriceNumber);
  const previewImage = previewUrl || form.image_url;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin/productos')} aria-label="Volver a productos" className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-bold text-xl tracking-tight">{mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{mode === 'create' ? 'Agrega un nuevo producto al catálogo' : 'Modifica los datos del producto'}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="Nombre" required>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cerradura Biométrica Titanio" className={inputClass} />
            {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
          </Field>

          <Field label="Tagline">
            <input type="text" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Tu familia, siempre segura" className={inputClass} />
          </Field>

          <Field label="Descripción">
            <textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe las características del producto…" className={inputClass + ' resize-none'} />
          </Field>

          <div className="rounded-3xl border border-yellow-300/15 bg-yellow-300/[0.04] p-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-yellow-200">Precio y margen de reventa</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Puedes editar el margen y el precio público se recalcula automáticamente desde el costo del proveedor. El importador usa 25% por defecto.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Costo proveedor" hint="Precio real de compra.">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <input type="text" inputMode="numeric" value={form.supplier_price ? formatDisplayPrice(form.supplier_price) : ''} onChange={(e) => handleSupplierPriceChange(e.target.value)} placeholder="0" className={inputClass + ' pl-8'} />
                </div>
              </Field>
              <Field label="Margen ganancia %" hint="Ej: 25 = costo + 25%">
                <div className="relative">
                  <input type="text" inputMode="decimal" value={profitMarginPct} onChange={(e) => handleMarginChange(e.target.value)} placeholder="25" className={inputClass + ' pr-8'} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                </div>
              </Field>
              <Field label="Precio público CLP" required hint="Editable manualmente si quieres redondear.">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <input type="text" inputMode="numeric" value={priceDisplay} onChange={(e) => handlePriceChange(e.target.value)} placeholder="000.000" className={inputClass + ' pl-8'} />
                </div>
                {errors.price && <span className="text-red-400 text-xs">{errors.price}</span>}
              </Field>
            </div>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <InfoChip label="Ganancia estimada" value={priceNumber && supplierPriceNumber ? `$${estimatedProfit.toLocaleString('es-CL')}` : '—'} />
              <InfoChip label="Margen aplicado" value={supplierPriceNumber ? `${formatPct(marginNumber || 0)}%` : '—'} />
              <InfoChip label="Precio calculado" value={supplierPriceNumber ? `$${salePriceFromMargin(supplierPriceNumber, marginNumber || 25).toLocaleString('es-CL')}` : '—'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Stock">
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" className={inputClass} />
            </Field>
            <Field label="Días de envío">
              <input type="number" min="0" step="1" value={form.delivery_days} onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))} placeholder="3" className={inputClass} />
            </Field>
            <Field label="Moneda proveedor">
              <input type="text" value={form.supplier_currency} onChange={(e) => setForm((f) => ({ ...f, supplier_currency: e.target.value.toUpperCase() }))} placeholder="CLP" maxLength={5} className={inputClass} />
            </Field>
          </div>

          <Field label="Categoría">
            <select aria-label="Categoría del producto" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className={inputClass}>
              {categoryOptions.length === 0 ? <option value="">Sin categorías disponibles</option> : categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </Field>

          <Field label="Imagen del producto">
            <div className="space-y-3">
              {(previewUrl || form.image_url) && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10">
                  <img src={previewUrl || form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setForm((f) => ({ ...f, image_url: '' })); setPreviewUrl(''); }} aria-label="Eliminar imagen" className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white/70 hover:text-white transition-colors">✕</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || uploadingCloud} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-colors text-sm disabled:opacity-50">
                  <Upload className="w-4 h-4" /> {uploading ? 'Subiendo…' : 'Subir a InsForge'}
                </button>
                <button type="button" onClick={() => cloudFileInputRef.current?.click()} disabled={uploading || uploadingCloud} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-yellow-400/40 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/70 transition-colors text-sm disabled:opacity-50">
                  <Cloud className="w-4 h-4" /> {uploadingCloud ? 'Subiendo a Cloudinary…' : 'Subir a Cloudinary'}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" aria-label="Seleccionar imagen para InsForge" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file); e.target.value = ''; }} />
              <input ref={cloudFileInputRef} type="file" accept="image/*" aria-label="Seleccionar imagen para Cloudinary" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleCloudinaryUpload(file); e.target.value = ''; }} />
              <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="O ingresa una URL de imagen…" className={inputClass} />
            </div>
          </Field>

          <div className="space-y-4 pt-2">
            <Toggle checked={form.activo} onChange={(v) => setForm((f) => ({ ...f, activo: v }))} label="Activo — visible en la tienda" />
            <Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="Destacado — aparece en el inicio" />
          </div>

          <div className="border-t border-white/5 pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Origen del producto</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Guarda el link del proveedor. Cuando el cliente compre, el correo interno de Resend te mostrará este link para comprarlo y enviarlo.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Origen">
                <select aria-label="Origen del producto" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inputClass}>
                  <option value="">Manual / propio</option>
                  <option value="mercadolibre">Mercado Libre</option>
                  <option value="falabella">Falabella</option>
                  <option value="aliexpress">AliExpress</option>
                  <option value="generic">Otra tienda</option>
                </select>
              </Field>
              <Field label="ID externo">
                <input type="text" value={form.source_id} aria-label="ID externo del proveedor" onChange={(e) => setForm((f) => ({ ...f, source_id: e.target.value }))} placeholder="MLC123456789, SKU…" className={inputClass} />
              </Field>
            </div>
            <Field label="URL del proveedor / link de compra">
              <input type="url" value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} placeholder="https://articulo.mercadolibre.cl/MLC-…" className={inputClass} />
            </Field>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving || uploading || uploadingCloud} className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-[#facc15] text-black">
              {saving ? 'Guardando…' : mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        <aside className="xl:sticky xl:top-28 xl:h-fit">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
            <div className="relative h-56 border-b border-white/10 bg-zinc-900">
              {previewImage ? <img src={previewImage} alt={form.name || 'Preview producto'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">Sin imagen de portada</div>}
              <div className="absolute left-3 top-3 flex gap-2">
                <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${form.activo ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : 'border-zinc-500/30 bg-zinc-600/20 text-zinc-400'}`}>{form.activo ? 'Activo' : 'Oculto'}</span>
                {form.featured && <span className="rounded-full border border-yellow-400/30 bg-yellow-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-300">Destacado</span>}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Preview en vivo</p>
              <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">{form.name || 'Nombre del producto'}</h3>
              <p className="line-clamp-2 text-sm text-zinc-400">{form.tagline || 'Tagline comercial del producto'}</p>
              <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{form.description || 'Descripción técnica y comercial.'}</p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <PreviewChip label="Categoría" value={form.category_id || 'Sin categoría'} />
                <PreviewChip label="Stock" value={form.stock || '—'} />
                <PreviewChip label="Entrega" value={form.delivery_days ? `${form.delivery_days} días` : 'Sin dato'} />
                <PreviewChip label="Origen" value={form.source || 'Propio'} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Precio público</p>
                <p className="mt-1 text-2xl font-black text-yellow-300">{priceNumber > 0 ? `$${priceNumber.toLocaleString('es-CL')}` : '$0'}</p>
                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  <p>Proveedor: {supplierPriceNumber > 0 ? `${supplierPriceNumber.toLocaleString('es-CL')} ${form.supplier_currency || ''}` : 'no definido'}</p>
                  <p>Margen editable: {supplierPriceNumber > 0 ? `${formatPct(marginNumber || 0)}%` : '—'}</p>
                  <p>Ganancia estimada: {supplierPriceNumber > 0 && priceNumber > 0 ? `$${estimatedProfit.toLocaleString('es-CL')}` : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

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

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</p>
      <p className="mt-1 font-black text-zinc-100">{value}</p>
    </div>
  );
}
