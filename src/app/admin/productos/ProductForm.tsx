'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useCategories } from '@/hooks/useCategories';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FolderOpen,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Star,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

type GalleryImage = {
  url: string;
  public_id?: string;
  source?: 'cloudinary' | 'manual' | 'legacy';
};

type CloudinaryStatus = 'checking' | 'ready' | 'missing' | 'error';

type CloudinaryAsset = {
  public_id: string;
  url: string;
  width?: number;
  height?: number;
};

function folderSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
}

function formatDisplayPrice(raw: string) {
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('es-CL');
}

function toMoney(raw: string | number | null | undefined) {
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function formatCLP(value: number) {
  return '$' + Math.round(value).toLocaleString('es-CL');
}

function normalizeSpecs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function toImageArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function toGalleryAssets(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  const assets: GalleryImage[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = String(row.url ?? row.secure_url ?? '').trim();
    if (!url) continue;
    assets.push({
      url,
      public_id: String(row.public_id ?? row.publicId ?? '').trim() || undefined,
      source: String(row.source ?? '').trim() === 'cloudinary' ? 'cloudinary' : 'legacy',
    });
  }

  return assets;
}

function uniqueGallery(images: GalleryImage[]) {
  const map = new Map<string, GalleryImage>();
  images.forEach((image) => {
    const url = image.url.trim();
    if (!url) return;
    const previous = map.get(url);
    map.set(url, { ...previous, ...image, url });
  });
  return Array.from(map.values());
}

function buildInitialGallery(imageUrl?: string, specs?: Record<string, unknown>) {
  const initial: GalleryImage[] = [];
  if (imageUrl?.trim()) initial.push({ url: imageUrl.trim(), source: 'legacy' });
  initial.push(...toGalleryAssets(specs?.gallery_assets));
  initial.push(...toImageArray(specs?.gallery_images).map((url) => ({ url, source: 'legacy' as const })));
  initial.push(...toImageArray(specs?.images).map((url) => ({ url, source: 'legacy' as const })));
  initial.push(...toImageArray(specs?.image_urls).map((url) => ({ url, source: 'legacy' as const })));
  return uniqueGallery(initial);
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="flex items-center gap-3 group">
      <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? 'bg-[#facc15]' : 'bg-zinc-700'}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-28 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-2xl px-5 py-3 text-sm font-medium shadow-xl border backdrop-blur-xl md:bottom-6 ${type === 'success' ? 'bg-zinc-900/95 border-[#facc15]/40 text-[#facc15]' : 'bg-zinc-900/95 border-red-500/40 text-red-400'}`}>
      {message}
    </div>
  );
}

function Field({ label, children, required, hint }: { label: string; children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-zinc-500">
        {label}{required && <span className="text-[#facc15] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-5 text-zinc-600">{hint}</p>}
    </div>
  );
}

const inputClass = 'bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#facc15]/50 transition-colors';

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
  source: string;
  source_url: string;
  source_id: string;
  supplier_price: string;
  supplier_currency: string;
  shipping_fee: string;
  tax_percentage: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  mode: 'create' | 'edit';
}

export default function ProductForm({ initialData, productId, mode }: ProductFormProps) {
  const router = useRouter();
  const { categories, reload: reloadCategories } = useCategories();
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
    supplier_currency: initialData?.supplier_currency ?? 'CLP',
    shipping_fee: initialData?.shipping_fee ?? '',
    tax_percentage: initialData?.tax_percentage ?? String(initialSpecs.tax_percentage ?? '19'),
  });

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => buildInitialGallery(initialData?.image_url, initialSpecs));
  const [priceDisplay, setPriceDisplay] = useState(initialData?.price ? formatDisplayPrice(initialData.price) : '');
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [cloudStatus, setCloudStatus] = useState<CloudinaryStatus>('checking');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<CloudinaryAsset[]>([]);
  const prevPreviewUrl = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/cloudinary?folder=fabrick/productos&max_results=1', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          setCloudStatus('ready');
        } else {
          const json = await res.json().catch(() => ({})) as { code?: string };
          setCloudStatus(json.code === 'NOT_CONFIGURED' ? 'missing' : 'error');
        }
      } catch {
        if (!cancelled) setCloudStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    if (form.category_id && !options.some((option) => option.value === form.category_id)) options.unshift({ value: form.category_id, label: form.category_id });
    return options;
  }, [categories, form.category_id]);

  useEffect(() => {
    if (!form.category_id && categoryOptions.length > 0) setForm((current) => ({ ...current, category_id: categoryOptions[0].value }));
  }, [categoryOptions, form.category_id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  function handlePriceChange(raw: string) {
    const digits = raw.replace(/\D/g, '');
    setForm((f) => ({ ...f, price: digits }));
    setPriceDisplay(digits ? parseInt(digits, 10).toLocaleString('es-CL') : '');
  }

  function addGalleryImage(image: GalleryImage, makeCover = false) {
    const clean = image.url.trim();
    if (!clean) return;
    setGalleryImages((current) => uniqueGallery([...current, { ...image, url: clean }]));
    setForm((current) => ({ ...current, image_url: makeCover || !current.image_url ? clean : current.image_url }));
  }

  async function removeGalleryImage(image: GalleryImage) {
    const clean = image.url.trim();
    setGalleryImages((current) => {
      const next = current.filter((item) => item.url !== clean);
      setForm((formState) => ({ ...formState, image_url: formState.image_url === clean ? (next[0]?.url ?? '') : formState.image_url }));
      return next;
    });

    if (image.public_id) {
      fetch(`/api/admin/cloudinary?public_id=${encodeURIComponent(image.public_id)}`, { method: 'DELETE' }).catch(() => undefined);
    }
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

  function setCoverImage(image: GalleryImage) {
    addGalleryImage(image, true);
    setPreviewUrl('');
  }

  async function uploadToCloudinary(file: File): Promise<GalleryImage> {
    const fd = new FormData();
    fd.append('file', file);
    const category = categories.find((item) => item.id === form.category_id);
    fd.append('folder', `fabrick/productos/${folderSlug(category?.name || 'general')}`);
    const res = await fetch('/api/admin/cloudinary', { method: 'POST', body: fd });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; asset?: { url?: string; public_id?: string; source?: 'cloudinary' } };
    if (!res.ok) {
      if (json.code === 'NOT_CONFIGURED') throw new Error('Cloudinary no configurado. Ve a Configuración → Integraciones.');
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    const url = json.url || json.asset?.url || '';
    if (!url) throw new Error('Cloudinary no devolvió una URL.');
    return { url, public_id: json.asset?.public_id, source: 'cloudinary' };
  }

  async function handleCloudinaryUpload(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    setUploadingCloud(true);
    try {
      try { setPreviewUrl(URL.createObjectURL(selected[0])); } catch { /* ignore */ }
      let added = 0;
      for (const file of selected) {
        const image = await uploadToCloudinary(file);
        addGalleryImage(image, galleryImages.length === 0 && added === 0 && !form.image_url);
        added += 1;
      }
      setPreviewUrl('');
      setCloudStatus('ready');
      showToast(`${added} imagen${added === 1 ? '' : 'es'} subida${added === 1 ? '' : 's'} a Cloudinary.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir a Cloudinary.', 'error');
    } finally {
      setUploadingCloud(false);
    }
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) return;
    setCreatingCategory(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: 'Creada desde la ficha de producto.' }) });
      const body = await response.json() as { error?: string; category?: { id?: string } };
      if (!response.ok) throw new Error(body.error || 'No se pudo crear la categoría.');
      await reloadCategories();
      const createdCategoryId = body.category?.id;
      if (!createdCategoryId) throw new Error('La categoría se creó sin un identificador válido. Actualiza el catálogo.');
      setForm((current) => ({ ...current, category_id: createdCategoryId }));
      setNewCategoryName('');
      showToast('Categoría creada y seleccionada.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo crear la categoría.', 'error');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function openMediaLibrary() {
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      const category = categories.find((item) => item.id === form.category_id);
      const folder = `fabrick/productos/${folderSlug(category?.name || 'general')}`;
      const response = await fetch(`/api/admin/cloudinary?folder=${encodeURIComponent(folder)}&max_results=80`, { cache: 'no-store' });
      const body = await response.json() as { assets?: CloudinaryAsset[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo abrir la carpeta de imágenes.');
      setLibraryAssets(Array.isArray(body.assets) ? body.assets : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo abrir la biblioteca.', 'error');
      setLibraryAssets([]);
    } finally {
      setLibraryLoading(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.price) errs.price = 'El precio es requerido';
    if (toMoney(form.tax_percentage) < 0) errs.tax_percentage = 'El impuesto no puede ser negativo';
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const cleanGallery = uniqueGallery([{ url: form.image_url, source: 'legacy' }, ...galleryImages]);
    const galleryUrls = cleanGallery.map((image) => image.url);
    const taxPercentage = toMoney(form.tax_percentage);
    const shippingFee = toMoney(form.shipping_fee);
    const specifications = {
      ...form.specifications,
      gallery_images: galleryUrls,
      gallery_assets: cleanGallery,
      tax_percentage: taxPercentage,
    };

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseInt(form.price, 10),
      category_id: form.category_id || null,
      stock: form.stock ? parseInt(form.stock, 10) : null,
      delivery_days: form.delivery_days ? Math.max(0, parseInt(form.delivery_days, 10) || 0) : null,
      tagline: form.tagline.trim() || null,
      image_url: galleryUrls[0] || null,
      specifications,
      activo: form.activo,
      featured: form.featured,
      source: form.source.trim() || null,
      source_url: form.source_url.trim() || null,
      source_id: form.source_id.trim() || null,
      supplier_price: form.supplier_price ? Number(form.supplier_price) : null,
      supplier_currency: form.supplier_currency.trim() || null,
      shipping_fee: shippingFee > 0 ? shippingFee : null,
    };

    let error;
    if (mode === 'create') ({ error } = await insforge.database.from('products').insert([payload]));
    else ({ error } = await insforge.database.from('products').update(payload).eq('id', productId!));

    setSaving(false);
    if (error) {
      const errAny = error as unknown as { message?: string };
      const raw = (errAny.message ?? '').toLowerCase();
      let hint = '';
      if (/relation .* does not exist|table .* not found|42p01/.test(raw) || (/products/.test(raw) && /not.*exist/.test(raw))) hint = ' La tabla "products" no existe en InsForge. Ve a /admin/productos y usa el botón "Configurar tablas".';
      else if (/permission denied|42501|not authorized|unauthorized/.test(raw)) hint = ' Revisa los permisos de la tabla "products" en InsForge.';
      else if (/violates not-null|null value in column/.test(raw)) hint = ' Falta completar un campo obligatorio.';
      showToast(`${errAny.message || 'Error al guardar el producto'}.${hint}`, 'error');
    } else {
      showToast(mode === 'create' ? '✓ Producto creado exitosamente' : '✓ Producto actualizado correctamente');
      setTimeout(() => router.push('/admin/productos'), 1200);
    }
  }

  const priceNumber = toMoney(form.price);
  const supplierPriceNumber = toMoney(form.supplier_price);
  const shippingFee = toMoney(form.shipping_fee);
  const taxPct = toMoney(form.tax_percentage);
  const taxAmount = Math.round((priceNumber + shippingFee) * (taxPct / 100));
  const totalWithCharges = priceNumber + shippingFee + taxAmount;
  const marginPct = priceNumber > 0 && supplierPriceNumber > 0 ? Math.round(((priceNumber - supplierPriceNumber) / priceNumber) * 100) : null;
  const previewImage = previewUrl || form.image_url || galleryImages[0]?.url || '';

  return (
    <div data-product-form="" className="min-h-screen pb-32 text-[#1b1710] lg:pb-8">
      <div className="rounded-[2rem] bg-[radial-gradient(circle_at_88%_10%,rgba(250,204,21,.55),transparent_24rem),linear-gradient(135deg,#fff9ec,#dfcdab)] px-4 py-5 shadow-[0_26px_90px_rgba(58,45,19,.13)] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <button onClick={() => router.push('/admin/productos')} aria-label="Volver a productos" className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-yellow-300 transition">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#91620e]">Catálogo y galería</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-.045em] sm:text-3xl">{mode === 'create' ? 'Crear producto' : 'Editar producto'}</h1>
            <p className="mt-1 text-xs text-black/45">Información comercial, categoría, carpeta de imágenes, stock y precio en una sola vista.</p>
          </div>
          <CloudStatusBadge status={cloudStatus} />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-[1.7rem] bg-[#fbf5e8] p-4 shadow-[0_24px_80px_rgba(58,45,19,.10)] sm:p-5">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-yellow-300 text-black"><Star className="h-4 w-4" /></span><div><h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Información principal</h2><p className="text-xs text-zinc-500">Nombre, descripción y estado comercial.</p></div></div>
            <div className="space-y-4">
              <Field label="Nombre" required><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Aire acondicionado inverter 12000 BTU" className={inputClass} />{errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}</Field>
              <Field label="Tagline"><input type="text" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Frío eficiente, instalación rápida" className={inputClass} /></Field>
              <Field label="Descripción"><textarea rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe características, beneficios, instalación, garantía y condiciones…" className={inputClass + ' resize-none'} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría" required><select value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))} className={inputClass}><option value="">Sin categoría</option>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="text-[10px] text-black/40">Carpeta: fabrick/productos/{folderSlug(categories.find((item) => item.id === form.category_id)?.name || 'general')}</p></Field>
                <Field label="Stock disponible"><input type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} placeholder="0" className={inputClass} /></Field>
              </div>
              <div className="grid gap-2 rounded-2xl bg-[#e8dcc2] p-3 sm:grid-cols-[1fr_auto]"><input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Crear nueva categoría sin salir" className={inputClass} /><button type="button" onClick={() => void createCategory()} disabled={creatingCategory || newCategoryName.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-black text-yellow-300 disabled:opacity-40">{creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Crear categoría</button></div>
              <div className="grid gap-4 sm:grid-cols-2"><Toggle checked={form.activo} onChange={(v) => setForm((f) => ({ ...f, activo: v }))} label="Activo — visible en la tienda" /><Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="Destacado — aparece en inicio" /></div>
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-white/10 bg-zinc-950/65 p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Calculator className="h-4 w-4" /></span><div><h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Precio, envío e impuesto</h2><p className="text-xs text-zinc-500">Controla venta, costo, envío e IVA por producto.</p></div></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Precio venta CLP" required><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span><input type="text" inputMode="numeric" value={priceDisplay} onChange={(e) => handlePriceChange(e.target.value)} placeholder="000.000" className={inputClass + ' pl-8'} /></div>{errors.price && <span className="text-red-400 text-xs">{errors.price}</span>}</Field>
              <Field label="Precio proveedor"><input type="number" step="1" min="0" value={form.supplier_price} aria-label="Precio del proveedor" onChange={(e) => setForm((f) => ({ ...f, supplier_price: e.target.value }))} placeholder="0" className={inputClass} /></Field>
              <Field label="Moneda"><input type="text" value={form.supplier_currency} onChange={(e) => setForm((f) => ({ ...f, supplier_currency: e.target.value.toUpperCase() }))} placeholder="CLP" maxLength={5} className={inputClass} /></Field>
              <Field label="Precio envío"><div className="relative"><Truck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input type="number" min="0" step="1" value={form.shipping_fee} onChange={(e) => setForm((f) => ({ ...f, shipping_fee: e.target.value }))} placeholder="0" className={inputClass + ' pl-10'} /></div></Field>
              <Field label="Impuesto / IVA %"><input type="number" min="0" step="0.1" value={form.tax_percentage} onChange={(e) => setForm((f) => ({ ...f, tax_percentage: e.target.value }))} placeholder="19" className={inputClass} />{errors.tax_percentage && <span className="text-red-400 text-xs">{errors.tax_percentage}</span>}</Field>
              <Field label="Días de envío"><input type="number" min="0" step="1" value={form.delivery_days} onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))} placeholder="3" className={inputClass} /></Field>
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.05] p-3 text-xs sm:grid-cols-4"><PreviewChip label="Venta" value={formatCLP(priceNumber)} /><PreviewChip label="Envío" value={shippingFee > 0 ? formatCLP(shippingFee) : 'Gratis / no definido'} /><PreviewChip label="Impuesto" value={`${formatCLP(taxAmount)} (${taxPct || 0}%)`} /><PreviewChip label="Total ref." value={formatCLP(totalWithCharges)} /></div>
          </section>

          <section className="rounded-[1.7rem] border border-white/10 bg-zinc-950/65 p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-400/15 text-sky-300"><Cloud className="h-4 w-4" /></span><div><h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Galería Cloudinary</h2><p className="text-xs text-zinc-500">Las fotos se suben a Cloudinary; en la base solo queda la URL y el public_id.</p></div></div>
            <div className="space-y-3">
              {previewImage && <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"><img src={previewImage} alt="Preview" className="h-full w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-full border border-yellow-300/40 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">Portada</span></div>}
              <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => cloudFileInputRef.current?.click()} disabled={uploadingCloud || cloudStatus === 'missing'} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-4 text-xs font-black uppercase tracking-[0.13em] text-black transition disabled:opacity-50">{uploadingCloud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}{uploadingCloud ? 'Subiendo…' : 'Subir a esta carpeta'}</button><button type="button" onClick={() => void openMediaLibrary()} disabled={cloudStatus === 'missing'} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-4 text-xs font-black uppercase tracking-[0.13em] text-yellow-300 disabled:opacity-50"><Images className="h-4 w-4" />Abrir carpeta</button></div>
              <input ref={cloudFileInputRef} type="file" multiple accept="image/*" aria-label="Seleccionar imágenes para Cloudinary" className="hidden" onChange={(e) => { const files = e.target.files; if (files) void handleCloudinaryUpload(files); e.target.value = ''; }} />
              {galleryImages.length > 0 && <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Miniaturas</p><p className="text-xs text-zinc-600">{galleryImages.length} imagen{galleryImages.length === 1 ? '' : 'es'}</p></div><div className="flex gap-3 overflow-x-auto pb-2 pr-2 scrollbar-hide">{galleryImages.map((image, index) => <div key={`${image.url}-${index}`} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={image.url} alt={`Miniatura ${index + 1}`} className="h-full w-full object-cover" />{form.image_url === image.url && <span className="absolute left-1.5 top-1.5 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">Portada</span>}<div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-full bg-black/65 p-1 backdrop-blur-sm"><button type="button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} aria-label="Mover imagen a la izquierda" className="grid h-6 w-6 place-items-center rounded-full text-white/80 disabled:opacity-25 hover:bg-white/10"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setCoverImage(image)} aria-label="Usar como portada" className="grid h-6 w-6 place-items-center rounded-full text-yellow-300 hover:bg-yellow-300/10"><Star className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveGalleryImage(index, 1)} disabled={index === galleryImages.length - 1} aria-label="Mover imagen a la derecha" className="grid h-6 w-6 place-items-center rounded-full text-white/80 disabled:opacity-25 hover:bg-white/10"><ChevronRight className="h-3.5 w-3.5" /></button></div><button type="button" onClick={() => void removeGalleryImage(image)} aria-label="Eliminar miniatura" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-red-200 backdrop-blur-sm hover:bg-red-500 hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><p className="mt-1 text-[11px] leading-5 text-zinc-600">★ define la portada. Las flechas ordenan la galería. Eliminar quita la miniatura y, si tiene public_id, también la borra de Cloudinary.</p></div>}
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="URL manual de imagen Cloudinary…" className={inputClass} /><button type="button" onClick={() => addGalleryImage({ url: form.image_url, source: 'manual' }, true)} disabled={!form.image_url.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-yellow-300/40 hover:text-yellow-200 disabled:opacity-40"><ImagePlus className="h-4 w-4" />Añadir</button></div>
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-white/10 bg-zinc-950/65 p-4 sm:p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white"><Truck className="h-4 w-4" /></span><div><h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Proveedor / origen</h2><p className="text-xs text-zinc-500">Datos para reventa, dropshipping o compra externa.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Origen"><input type="text" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Midea Store, TCL Store, Mercado Libre…" className={inputClass} /></Field><Field label="ID / SKU externo"><input type="text" value={form.source_id} onChange={(e) => setForm((f) => ({ ...f, source_id: e.target.value }))} placeholder="SKU, modelo, MLC…" className={inputClass} /></Field></div><div className="mt-4"><Field label="URL del proveedor"><input type="url" value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} placeholder="https://..." className={inputClass} /></Field></div></section>

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 pt-2 md:static md:z-auto"><button type="submit" disabled={saving || uploadingCloud} className="w-full rounded-2xl bg-[#facc15] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_18px_48px_rgba(250,204,21,0.22)] transition hover:bg-yellow-200 active:scale-[0.99] disabled:opacity-50">{saving ? 'Guardando…' : mode === 'create' ? 'Crear producto' : 'Guardar cambios'}</button></div>
        </form>

        <aside className="xl:sticky xl:top-28 xl:h-fit"><div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"><div className="relative h-64 border-b border-white/10 bg-zinc-900">{previewImage ? <img src={previewImage} alt={form.name || 'Preview producto'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">Sin portada</div>}<div className="absolute left-3 top-3 flex gap-2"><Badge tone={form.activo ? 'green' : 'gray'}>{form.activo ? 'Activo' : 'Oculto'}</Badge>{form.featured && <Badge tone="yellow">Destacado</Badge>}</div>{galleryImages.length > 1 && <span className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] font-black text-white/75 backdrop-blur">{galleryImages.length} fotos</span>}</div><div className="space-y-4 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Preview y margen</p><h3 className="line-clamp-2 text-xl font-black leading-tight text-white">{form.name || 'Nombre del producto'}</h3><p className="line-clamp-2 text-sm text-zinc-400">{form.tagline || 'Tagline comercial del producto'}</p><div className="grid grid-cols-2 gap-2"><PreviewChip label="Stock" value={form.stock || '—'} /><PreviewChip label="Fotos" value={String(galleryImages.length || (form.image_url ? 1 : 0))} /><PreviewChip label="Envío" value={shippingFee > 0 ? formatCLP(shippingFee) : 'No definido'} /><PreviewChip label="IVA" value={`${taxPct || 0}%`} /></div><div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.055] p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-yellow-200/60">Total referencia</p><p className="mt-1 text-3xl font-black text-yellow-300">{formatCLP(totalWithCharges)}</p><div className="mt-2 space-y-1 text-xs text-zinc-500"><p>Venta: {formatCLP(priceNumber)}</p><p>Proveedor: {supplierPriceNumber > 0 ? `${formatCLP(supplierPriceNumber)} ${form.supplier_currency || ''}` : 'no definido'}</p><p>Margen estimado: {marginPct === null ? '—' : `${marginPct}%`}</p></div></div></div></div></aside>
      </div>

      {libraryOpen ? <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/70 p-3 backdrop-blur-xl sm:p-6"><div className="mx-auto max-w-5xl rounded-[2rem] bg-[#f8efdd] p-4 text-[#1b1710] shadow-[0_35px_120px_rgba(0,0,0,.38)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#91620e]">Biblioteca del producto</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Imágenes de {categories.find((item) => item.id === form.category_id)?.name || 'General'}</h2><p className="mt-1 text-xs text-black/45">Selecciona imágenes existentes para reutilizarlas sin volver a subir archivos.</p></div><button type="button" onClick={() => setLibraryOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-yellow-300"><X className="h-5 w-5" /></button></div>{libraryLoading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#91620e]" /></div> : libraryAssets.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{libraryAssets.map((asset) => <button key={asset.public_id} type="button" onClick={() => { addGalleryImage({ url: asset.url, public_id: asset.public_id, source: 'cloudinary' }, !form.image_url); setLibraryOpen(false); }} className="group overflow-hidden rounded-2xl bg-white p-2 text-left shadow-sm"><img src={asset.url} alt={asset.public_id} className="aspect-square w-full rounded-xl object-contain" /><span className="mt-2 block truncate px-1 text-[10px] font-bold text-black/45">{asset.public_id.split('/').pop()}</span></button>)}</div> : <div className="mt-5 grid min-h-72 place-items-center rounded-[1.5rem] border border-dashed border-black/15 text-center"><div><FolderOpen className="mx-auto h-8 w-8 text-black/20" /><b className="mt-3 block">La carpeta todavía está vacía</b><p className="mt-1 text-xs text-black/40">Sube la primera imagen y aparecerá aquí automáticamente.</p></div></div>}</div></div> : null}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function CloudStatusBadge({ status }: { status: CloudinaryStatus }) {
  const content = status === 'checking'
    ? { text: 'Revisando Cloudinary', cls: 'border-white/10 bg-white/5 text-zinc-300' }
    : status === 'ready'
      ? { text: 'Cloudinary conectado', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' }
      : status === 'missing'
        ? { text: 'Cloudinary sin configurar', cls: 'border-red-400/30 bg-red-400/10 text-red-200' }
        : { text: 'Cloudinary con error', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-200' };
  return <span className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] sm:inline-flex ${content.cls}`}>{status === 'checking' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}{content.text}</span>;
}

function Badge({ tone, children }: { tone: 'green' | 'gray' | 'yellow'; children: ReactNode }) {
  const cls = tone === 'green' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : tone === 'yellow' ? 'border-yellow-400/30 bg-yellow-400/15 text-yellow-300' : 'border-zinc-500/30 bg-zinc-600/20 text-zinc-400';
  return <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function PreviewChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="truncate text-xs font-semibold text-zinc-300">{value}</p></div>;
}
