'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useCategories } from '@/hooks/useCategories';
import {
  ArrowLeft, ArrowRight, BadgePercent, Calculator, Check, ChevronLeft, ChevronRight,
  Cloud, ImagePlus, Images, Loader2, Package, Sparkles, Star, Trash2, Truck, WandSparkles,
} from 'lucide-react';

type GalleryImage = { url: string; public_id?: string; source?: 'cloudinary' | 'manual' | 'legacy' };
type Step = 1 | 2 | 3 | 4 | 5 | 6;
type Analysis = {
  title: string; shortDescription: string; longDescription: string; category: string; tags: string[];
  rating: number; estimatedDemand: number; estimatedPurchasePopularity: number;
  priceLow: number; priceMid: number; priceHigh: number; recommendedPrice: number;
  marginNote: string; buyerProfile: string; positioning: string; evidenceNote: string;
};

function money(value: unknown) {
  const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}
function clp(value: unknown) { return '$' + Math.round(money(value)).toLocaleString('es-CL'); }
function slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general'; }
function specs(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}; }
function uniqueImages(images: GalleryImage[]) { const map = new Map<string, GalleryImage>(); images.forEach((image) => { const url = image.url.trim(); if (url) map.set(url, { ...map.get(url), ...image, url }); }); return Array.from(map.values()); }
function initialGallery(image?: string, specifications?: Record<string, unknown>) {
  const result: GalleryImage[] = [];
  if (image) result.push({ url: image, source: 'legacy' });
  const gallery = specifications?.gallery_assets;
  if (Array.isArray(gallery)) gallery.forEach((item) => { if (item && typeof item === 'object') { const row = item as Record<string, unknown>; const url = String(row.url || row.secure_url || ''); if (url) result.push({ url, public_id: String(row.public_id || '') || undefined, source: 'legacy' }); } });
  const urls = specifications?.gallery_images;
  if (Array.isArray(urls)) urls.forEach((url) => { if (String(url).trim()) result.push({ url: String(url), source: 'legacy' }); });
  return uniqueImages(result);
}

export interface ProductFormData {
  name: string; description: string; price: string; category_id: string; stock: string; delivery_days: string;
  tagline: string; image_url: string; activo: boolean; featured: boolean; specifications: Record<string, unknown>;
  source: string; source_url: string; source_id: string; supplier_price: string; supplier_currency: string;
  shipping_fee: string; tax_percentage: string; discount_percentage: string;
}

export default function ProductForm({ initialData, productId, mode }: { initialData?: Partial<ProductFormData>; productId?: string; mode: 'create' | 'edit' }) {
  const router = useRouter();
  const { categories } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialSpecs = specs(initialData?.specifications);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name || '', description: initialData?.description || '', price: initialData?.price || '', category_id: initialData?.category_id || '',
    stock: initialData?.stock || '', delivery_days: initialData?.delivery_days || '', tagline: initialData?.tagline || '', image_url: initialData?.image_url || '',
    activo: initialData?.activo ?? true, featured: initialData?.featured ?? false, specifications: initialSpecs,
    source: initialData?.source || '', source_url: initialData?.source_url || '', source_id: initialData?.source_id || '', supplier_price: initialData?.supplier_price || '',
    supplier_currency: initialData?.supplier_currency || 'CLP', shipping_fee: initialData?.shipping_fee || '', tax_percentage: initialData?.tax_percentage || String(initialSpecs.tax_percentage || '19'),
    discount_percentage: initialData?.discount_percentage || String(initialSpecs.discount_percentage || '0'),
  });
  const [gallery, setGallery] = useState<GalleryImage[]>(() => initialGallery(initialData?.image_url, initialSpecs));
  const [markup, setMarkup] = useState(Number(initialSpecs.default_markup_percentage || 30));
  const [autoMarkup, setAutoMarkup] = useState(mode === 'create' || Boolean(initialSpecs.auto_markup_enabled));
  const [analysis, setAnalysis] = useState<Analysis | null>((initialSpecs.commerce_ai as Analysis | undefined) || null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!form.category_id && categories[0]?.id) setForm((current) => ({ ...current, category_id: categories[0].id }));
  }, [categories, form.category_id]);

  const cost = money(form.supplier_price);
  const basePrice = money(form.price);
  const discount = Math.min(100, Math.max(0, money(form.discount_percentage)));
  const suggestedPrice = cost > 0 ? Math.round(cost * (1 + markup / 100)) : basePrice;
  const regularPrice = autoMarkup && cost > 0 ? suggestedPrice : basePrice;
  const promoPrice = Math.round(regularPrice * (1 - discount / 100));
  const shipping = money(form.shipping_fee);
  const tax = Math.round((promoPrice + shipping) * (money(form.tax_percentage) / 100));
  const checkoutReference = promoPrice + shipping + tax;
  const margin = regularPrice > 0 && cost > 0 ? Math.round(((regularPrice - cost) / regularPrice) * 100) : null;
  const cover = form.image_url || gallery[0]?.url || '';

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function next() { setStep((current) => Math.min(6, current + 1) as Step); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function previous() { setStep((current) => Math.max(1, current - 1) as Step); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function chooseCover(image: GalleryImage) { set('image_url', image.url); }
  function moveImage(index: number, direction: -1 | 1) { setGallery((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; }); }
  function removeImage(image: GalleryImage) { setGallery((current) => { const next = current.filter((item) => item.url !== image.url); if (form.image_url === image.url) set('image_url', next[0]?.url || ''); return next; }); if (image.public_id) void fetch(`/api/admin/cloudinary?public_id=${encodeURIComponent(image.public_id)}`, { method: 'DELETE' }); }

  async function upload(files: FileList) {
    setUploading(true); setNotice('');
    try {
      const added: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const data = new FormData(); data.append('file', file);
        const category = categories.find((item) => item.id === form.category_id)?.name || 'general';
        data.append('folder', `fabrick/productos/${slug(category)}`);
        const response = await fetch('/api/admin/cloudinary', { method: 'POST', body: data });
        const json = await response.json() as { url?: string; asset?: { url?: string; public_id?: string }; error?: string };
        if (!response.ok) throw new Error(json.error || 'No se pudo subir una imagen.');
        const url = json.url || json.asset?.url || '';
        if (url) added.push({ url, public_id: json.asset?.public_id, source: 'cloudinary' });
      }
      setGallery((current) => uniqueImages([...current, ...added]));
      if (!form.image_url && added[0]) set('image_url', added[0].url);
      setNotice(`${added.length} imagen${added.length === 1 ? '' : 'es'} añadida${added.length === 1 ? '' : 's'}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Error subiendo imágenes.'); }
    finally { setUploading(false); }
  }

  async function analyze() {
    if (!form.name.trim()) { setNotice('Escribe primero el nombre del producto.'); return; }
    setLoadingAi(true); setNotice('');
    try {
      const category = categories.find((item) => item.id === form.category_id)?.name || '';
      const response = await fetch('/api/admin/products/ai-commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: { name: form.name, description: form.description, category, price: regularPrice, cost, stock: form.stock, specifications: form.specifications } }) });
      const json = await response.json() as { analysis?: Analysis; error?: string; warning?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'La IA no pudo analizar el producto.');
      setAnalysis(json.analysis); setNotice(json.warning || 'Análisis privado generado. Revisa y aplica solo lo que te convenga.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Error analizando el producto.'); }
    finally { setLoadingAi(false); }
  }

  function applyAnalysis() {
    if (!analysis) return;
    setForm((current) => ({ ...current, name: analysis.title, tagline: analysis.shortDescription, description: analysis.longDescription, price: String(analysis.recommendedPrice), specifications: { ...current.specifications, commerce_ai: analysis } }));
    setAutoMarkup(false); setNotice('Título, descripción y precio recomendado aplicados.'); setStep(6);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || regularPrice <= 0) { setNotice('Completa el nombre y un precio válido.'); return; }
    setSaving(true); setNotice('');
    const cleanGallery = uniqueImages([{ url: form.image_url, source: 'legacy' }, ...gallery].filter((item) => item.url));
    const specifications = {
      ...form.specifications,
      gallery_images: cleanGallery.map((image) => image.url), gallery_assets: cleanGallery,
      tax_percentage: money(form.tax_percentage), discount_percentage: discount,
      default_markup_percentage: markup, auto_markup_enabled: autoMarkup,
      ...(analysis ? { commerce_ai: analysis } : {}),
    };
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null, tagline: form.tagline.trim() || null,
      price: regularPrice, discount_percentage: discount, supplier_price: cost || null, supplier_currency: form.supplier_currency || 'CLP',
      shipping_fee: shipping || null, category_id: form.category_id || null, stock: form.stock ? Number(form.stock) : null,
      delivery_days: form.delivery_days ? Number(form.delivery_days) : null, image_url: cleanGallery[0]?.url || null,
      activo: form.activo, featured: form.featured, source: form.source || null, source_url: form.source_url || null, source_id: form.source_id || null, specifications,
    };
    const query = insforge.database.from('products');
    const { error } = mode === 'create' ? await query.insert([payload]) : await query.update(payload).eq('id', productId!);
    setSaving(false);
    if (error) { setNotice(error.message || 'No se pudo guardar el producto.'); return; }
    setNotice(mode === 'create' ? 'Producto creado correctamente.' : 'Producto actualizado correctamente.');
    setTimeout(() => router.push('/admin/productos'), 900);
  }

  const steps = [
    ['Información', 'Nombre y clasificación'], ['Imágenes', 'Portada y galería'], ['Costo y margen', 'Precio automático'],
    ['Promoción', 'Antes y ahora'], ['IA', 'Análisis privado'], ['Publicar', 'Vista final'],
  ];

  return (
    <div className="min-h-screen bg-[#EDE3D8] pb-28 text-[#171820] md:pb-10">
      <header className="sticky top-0 z-40 bg-[#171820]/96 px-3 py-3 text-[#F8F0E9] shadow-xl backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3">
          <button type="button" onClick={() => router.push('/admin/productos')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/8"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#CCB196]">Editor profesional de productos</p><h1 className="truncate text-xl font-black">{mode === 'create' ? 'Crear producto' : form.name || 'Editar producto'}</h1></div>
          <div className="hidden rounded-full bg-[#B6906C] px-4 py-2 text-xs font-black text-[#171820] sm:block">Paso {step} de 6</div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-2 py-4 sm:px-5 lg:px-7">
        <nav className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-[#F8F0E9] p-2 shadow-[0_15px_50px_rgba(23,24,32,.08)] lg:grid-cols-6">
          {steps.map(([title, subtitle], index) => { const number = (index + 1) as Step; const active = step === number; const complete = step > number; return <button type="button" key={title} onClick={() => setStep(number)} className={`rounded-[1.15rem] px-3 py-3 text-left transition ${active ? 'bg-[#171820] text-white' : complete ? 'bg-[#D8C0A8] text-[#171820]' : 'bg-white text-[#6E625A]'}`}><span className="text-[9px] font-black uppercase tracking-[.14em]">{complete ? '✓' : `0${number}`} · {title}</span><span className="mt-1 hidden text-[10px] opacity-65 sm:block">{subtitle}</span></button>; })}
        </nav>

        {notice ? <div className="mt-4 rounded-2xl bg-[#171820] px-4 py-3 text-sm text-[#F8F0E9]">{notice}</div> : null}

        <form onSubmit={submit} className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="min-w-0 rounded-[2rem] bg-[#F8F0E9] p-4 shadow-[0_24px_80px_rgba(23,24,32,.09)] sm:p-7">
            {step === 1 && <StepInfo form={form} set={set} categories={categories} />}
            {step === 2 && <StepImages cover={cover} gallery={gallery} uploading={uploading} fileRef={fileRef} onUpload={upload} onCover={chooseCover} onMove={moveImage} onRemove={removeImage} onManual={(url) => { if (!url.trim()) return; const image = { url: url.trim(), source: 'manual' as const }; setGallery((current) => uniqueImages([...current, image])); if (!form.image_url) set('image_url', image.url); }} />}
            {step === 3 && <StepPricing form={form} set={set} markup={markup} setMarkup={setMarkup} autoMarkup={autoMarkup} setAutoMarkup={setAutoMarkup} cost={cost} regularPrice={regularPrice} margin={margin} />}
            {step === 4 && <StepPromotion form={form} set={set} regularPrice={regularPrice} promoPrice={promoPrice} discount={discount} />}
            {step === 5 && <StepAi analysis={analysis} loading={loadingAi} onAnalyze={analyze} onApply={applyAnalysis} />}
            {step === 6 && <StepPublish form={form} set={set} regularPrice={regularPrice} promoPrice={promoPrice} checkoutReference={checkoutReference} margin={margin} galleryCount={gallery.length} />}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#171820]/8 pt-5">
              <button type="button" onClick={previous} disabled={step === 1} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Anterior</button>
              {step < 6 ? <button type="button" onClick={next} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#171820] px-6 text-sm font-black text-white">Continuar <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={saving || uploading} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B6906C] px-7 text-sm font-black text-[#171820] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Guardando…' : 'Guardar y publicar'}</button>}
            </div>
          </main>

          <aside className="min-w-0 xl:sticky xl:top-24 xl:h-fit">
            <div className="overflow-hidden rounded-[2rem] bg-[#171820] text-[#F8F0E9] shadow-[0_28px_90px_rgba(23,24,32,.28)]">
              <div className="relative aspect-[4/3] bg-[#2B2C34]">{cover ? <img src={cover} alt={form.name || 'Producto'} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-14 w-14 text-white/15" /></div>}<div className="absolute left-4 top-4 flex gap-2">{form.featured ? <Badge>Destacado</Badge> : null}{discount > 0 ? <Badge>-{discount}%</Badge> : null}</div></div>
              <div className="p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#CCB196]">Vista previa permanente</p><h2 className="mt-3 text-2xl font-black leading-tight">{form.name || 'Nombre del producto'}</h2><p className="mt-2 text-sm leading-6 text-white/55">{form.tagline || form.description || 'La descripción aparecerá aquí mientras avanzas.'}</p><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[10px] text-white/38">Precio actual</p><p className="text-3xl font-black text-[#E5CFBA]">{clp(promoPrice || regularPrice)}</p>{discount > 0 ? <p className="text-xs text-white/35 line-through">Antes {clp(regularPrice)}</p> : null}</div><div className="text-right text-xs text-white/45"><p>{gallery.length} fotos</p><p>{margin == null ? 'Margen pendiente' : `${margin}% margen`}</p></div></div></div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Label({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) { return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#895E3D]">{title}</span><div className="mt-2">{children}</div>{hint ? <p className="mt-2 text-[11px] leading-5 text-[#7A6D64]">{hint}</p> : null}</label>; }
const input = 'min-h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#171820] outline-none shadow-[inset_0_0_0_1px_rgba(23,24,32,.08)] focus:shadow-[inset_0_0_0_2px_rgba(182,144,108,.7)]';
function StepTitle({ icon: Icon, eyebrow, title, text }: { icon: typeof Star; eyebrow: string; title: string; text: string }) { return <div className="mb-7 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#895E3D]">{eyebrow}</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#70645C]">{text}</p></div></div>; }
function StepInfo({ form, set, categories }: { form: ProductFormData; set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void; categories: Array<{ id: string; name: string }> }) { return <><StepTitle icon={Star} eyebrow="Paso 1" title="Información principal" text="Primero define qué vendes. El resto del editor utilizará estos datos para imágenes, precio, promoción e IA." /><div className="grid gap-5"><Label title="Nombre del producto"><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre claro, modelo y característica principal" /></Label><Label title="Frase comercial"><input className={input} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Beneficio principal en una frase" /></Label><Label title="Descripción"><textarea className={`${input} min-h-40 py-4`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Características comprobables, beneficios, condiciones y uso recomendado" /></Label><div className="grid gap-4 sm:grid-cols-2"><Label title="Categoría"><select className={input} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Label><Label title="Stock"><input className={input} type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Label></div></div></>; }
function StepImages({ cover, gallery, uploading, fileRef, onUpload, onCover, onMove, onRemove, onManual }: { cover: string; gallery: GalleryImage[]; uploading: boolean; fileRef: React.RefObject<HTMLInputElement | null>; onUpload: (files: FileList) => void; onCover: (image: GalleryImage) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (image: GalleryImage) => void; onManual: (url: string) => void }) { const [url, setUrl] = useState(''); return <><StepTitle icon={Images} eyebrow="Paso 2" title="Portada y galería" text="Ocupa todo el ancho disponible. Elige una portada grande y ordena el resto como una secuencia visual del producto." /><button type="button" onClick={() => fileRef.current?.click()} className="grid min-h-40 w-full place-items-center rounded-[1.7rem] bg-[#E5D2C0] p-6 text-center"><span><Cloud className="mx-auto h-8 w-8" /><b className="mt-3 block">{uploading ? 'Subiendo imágenes…' : 'Subir varias imágenes'}</b><small className="mt-1 block text-[#756B63]">JPG, PNG, WEBP o AVIF</small></span></button><input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) void onUpload(e.target.files); e.target.value = ''; }} />{cover ? <img src={cover} alt="Portada" className="mt-5 aspect-[16/8] w-full rounded-[1.7rem] object-cover" /> : null}<div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{gallery.map((image, index) => <div key={image.url} className="relative overflow-hidden rounded-2xl bg-white p-2 shadow-sm"><img src={image.url} alt={`Imagen ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /><div className="mt-2 grid grid-cols-4 gap-1"><button type="button" onClick={() => onMove(index, -1)} className="grid h-9 place-items-center rounded-xl bg-[#EEE5DC]" disabled={index === 0}><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => onCover(image)} className="grid h-9 place-items-center rounded-xl bg-[#D8C0A8]"><Star className="h-4 w-4" /></button><button type="button" onClick={() => onMove(index, 1)} className="grid h-9 place-items-center rounded-xl bg-[#EEE5DC]" disabled={index === gallery.length - 1}><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => onRemove(image)} className="grid h-9 place-items-center rounded-xl bg-red-100 text-red-700"><Trash2 className="h-4 w-4" /></button></div></div>)}</div><div className="mt-5 flex gap-2"><input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Pegar URL de imagen" /><button type="button" onClick={() => { onManual(url); setUrl(''); }} className="rounded-2xl bg-[#171820] px-5 text-white"><ImagePlus className="h-4 w-4" /></button></div></>; }
function StepPricing({ form, set, markup, setMarkup, autoMarkup, setAutoMarkup, cost, regularPrice, margin }: { form: ProductFormData; set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void; markup: number; setMarkup: (value: number) => void; autoMarkup: boolean; setAutoMarkup: (value: boolean) => void; cost: number; regularPrice: number; margin: number | null }) { return <><StepTitle icon={Calculator} eyebrow="Paso 3" title="Costo, margen y precio de venta" text="El precio se construye en orden: costo del proveedor → porcentaje de aumento → precio normal. Por defecto, cada producto nuevo o importado utiliza 30%." /><div className="grid gap-4 md:grid-cols-3"><PriceBox label="1. Costo proveedor" value={form.supplier_price} onChange={(value) => set('supplier_price', value)} /><PriceBox label="2. Aumento %" value={String(markup)} onChange={(value) => setMarkup(Math.max(0, Number(value) || 0))} suffix="%" /><div className="rounded-[1.5rem] bg-[#171820] p-5 text-white"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#CCB196]">3. Precio normal calculado</p><p className="mt-3 text-3xl font-black">{clp(regularPrice)}</p><p className="mt-2 text-xs text-white/50">{margin == null ? 'Ingresa el costo para calcular margen.' : `${margin}% de margen bruto sobre el precio normal.`}</p></div></div><label className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white p-4"><span><b className="block text-sm">Calcular automáticamente desde el costo</b><small className="text-[#756B63]">Al cambiar el precio proveedor, se recalcula el precio normal.</small></span><input type="checkbox" checked={autoMarkup} onChange={(e) => setAutoMarkup(e.target.checked)} className="h-6 w-6" /></label>{!autoMarkup ? <div className="mt-4"><Label title="Precio normal manual"><input className={input} inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} /></Label></div> : null}<div className="mt-5 grid gap-4 sm:grid-cols-3"><Label title="Envío"><input className={input} type="number" min="0" value={form.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} /></Label><Label title="IVA %"><input className={input} type="number" min="0" value={form.tax_percentage} onChange={(e) => set('tax_percentage', e.target.value)} /></Label><Label title="Días de entrega"><input className={input} type="number" min="0" value={form.delivery_days} onChange={(e) => set('delivery_days', e.target.value)} /></Label></div></>; }
function PriceBox({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) { return <label className="rounded-[1.5rem] bg-white p-5 shadow-sm"><span className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">{label}</span><div className="mt-3 flex items-center gap-2"><span className="text-xl font-black">{suffix ? '' : '$'}</span><input type="number" min="0" className="min-w-0 flex-1 bg-transparent text-2xl font-black outline-none" value={value} onChange={(e) => onChange(e.target.value)} /><span className="font-black">{suffix}</span></div></label>; }
function StepPromotion({ form, set, regularPrice, promoPrice, discount }: { form: ProductFormData; set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void; regularPrice: number; promoPrice: number; discount: number }) { return <><StepTitle icon={BadgePercent} eyebrow="Paso 4" title="Precio antes y precio ahora" text="La promoción queda visualmente separada del costo. El cliente verá el precio normal tachado y el precio actual destacado." /><div className="grid gap-4 md:grid-cols-[1fr_.7fr_1fr]"><div className="rounded-[1.6rem] bg-white p-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#895E3D]">Precio antes</p><p className="mt-3 text-3xl font-black">{clp(regularPrice)}</p><p className="mt-2 text-xs text-[#756B63]">Precio normal construido en el paso anterior.</p></div><label className="rounded-[1.6rem] bg-[#D8C0A8] p-6"><span className="text-[9px] font-black uppercase tracking-[.18em]">Descuento</span><div className="mt-3 flex items-center"><input type="number" min="0" max="100" className="w-full bg-transparent text-4xl font-black outline-none" value={form.discount_percentage} onChange={(e) => set('discount_percentage', e.target.value)} /><b className="text-2xl">%</b></div></label><div className="rounded-[1.6rem] bg-[#171820] p-6 text-white"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#CCB196]">Precio ahora</p><p className="mt-3 text-3xl font-black text-[#E5CFBA]">{clp(promoPrice)}</p><p className="mt-2 text-xs text-white/50">Ahorro visible: {clp(regularPrice - promoPrice)}.</p></div></div><label className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4"><span><b className="block">Mostrar como producto destacado</b><small className="text-[#756B63]">Puede aparecer en los bloques editoriales de la tienda.</small></span><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="h-6 w-6" /></label><p className="mt-4 rounded-2xl bg-[#EADBCB] p-4 text-sm leading-6 text-[#685D55]">El descuento de {discount}% no modifica el costo proveedor. Solo calcula el precio promocional que verá el cliente.</p></>; }
function StepAi({ analysis, loading, onAnalyze, onApply }: { analysis: Analysis | null; loading: boolean; onAnalyze: () => void; onApply: () => void }) { return <><StepTitle icon={WandSparkles} eyebrow="Paso 5" title="Análisis privado con IA" text="La IA propone título, descripción, clasificación y rango de precio. Las señales de demanda son estimaciones editoriales, no ventas ni búsquedas verificadas." /><button type="button" onClick={() => void onAnalyze()} disabled={loading} className="inline-flex min-h-13 items-center gap-2 rounded-full bg-[#171820] px-6 text-sm font-black text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#CCB196]" />}{loading ? 'Analizando producto…' : 'Generar análisis privado'}</button>{analysis ? <div className="mt-6 grid gap-4"><div className="grid gap-3 sm:grid-cols-4"><Metric label="Precio inicial" value={clp(analysis.priceLow)} /><Metric label="Precio medio" value={clp(analysis.priceMid)} /><Metric label="Precio máximo" value={clp(analysis.priceHigh)} /><Metric label="Recomendado" value={clp(analysis.recommendedPrice)} dark /></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-[1.5rem] bg-white p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Demanda estimada</p><p className="mt-2 text-4xl font-black">{analysis.estimatedDemand}%</p><p className="mt-2 text-xs leading-5 text-[#756B63]">{analysis.evidenceNote}</p></div><div className="rounded-[1.5rem] bg-white p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Popularidad de compra estimada</p><p className="mt-2 text-4xl font-black">{analysis.estimatedPurchasePopularity}%</p><div className="mt-2 flex gap-1">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(analysis.rating) ? 'fill-[#B6906C] text-[#B6906C]' : 'text-black/15'}`} />)}</div></div></div><div className="rounded-[1.5rem] bg-white p-5"><h3 className="text-xl font-black">{analysis.title}</h3><p className="mt-2 text-sm leading-6 text-[#685D55]">{analysis.longDescription}</p><p className="mt-4 text-xs font-bold text-[#895E3D]">{analysis.tags.join(' · ')}</p></div><button type="button" onClick={onApply} className="rounded-full bg-[#B6906C] px-6 py-4 text-sm font-black">Aplicar título, descripción y precio recomendado</button></div> : null}</>; }
function Metric({ label, value, dark }: { label: string; value: string; dark?: boolean }) { return <div className={`rounded-2xl p-4 ${dark ? 'bg-[#171820] text-white' : 'bg-white'}`}><p className="text-[9px] font-black uppercase tracking-[.14em] opacity-55">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>; }
function StepPublish({ form, set, regularPrice, promoPrice, checkoutReference, margin, galleryCount }: { form: ProductFormData; set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void; regularPrice: number; promoPrice: number; checkoutReference: number; margin: number | null; galleryCount: number }) { return <><StepTitle icon={Check} eyebrow="Paso 6" title="Revisión y publicación" text="Comprueba la ficha completa. Al guardar, el precio normal, el descuento y el precio actual quedarán coordinados en la tienda." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Precio normal" value={clp(regularPrice)} /><Metric label="Precio promoción" value={clp(promoPrice)} dark /><Metric label="Total referencial" value={clp(checkoutReference)} /><Metric label="Margen bruto" value={margin == null ? 'Pendiente' : `${margin}%`} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="flex items-center justify-between rounded-2xl bg-white p-4"><span><b className="block">Visible en la tienda</b><small className="text-[#756B63]">Publica la ficha al guardar.</small></span><input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} className="h-6 w-6" /></label><div className="rounded-2xl bg-white p-4"><b className="block">Galería</b><small className="text-[#756B63]">{galleryCount} imágenes preparadas.</small></div></div><div className="mt-5 rounded-[1.5rem] bg-[#EADBCB] p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Resumen comercial</p><h3 className="mt-2 text-2xl font-black">{form.name || 'Producto sin nombre'}</h3><p className="mt-2 text-sm leading-6 text-[#685D55]">{form.description || 'Sin descripción.'}</p></div></>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-[#B6906C] px-3 py-1.5 text-[9px] font-black uppercase text-[#171820]">{children}</span>; }
