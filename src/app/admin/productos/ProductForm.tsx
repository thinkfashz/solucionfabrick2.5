'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/hooks/useCategories';
import { ArrowLeft, ArrowRight, BadgePercent, Calculator, Check, ChevronLeft, ChevronRight, Cloud, Images, Loader2, Package, Sparkles, Star, Trash2, WandSparkles } from 'lucide-react';

type GalleryImage = { url: string; public_id?: string; source?: string };
type Analysis = { title: string; shortDescription: string; longDescription: string; category: string; tags: string[]; rating: number; estimatedDemand: number; estimatedPurchasePopularity: number; priceLow: number; priceMid: number; priceHigh: number; recommendedPrice: number; marginNote: string; buyerProfile: string; positioning: string; evidenceNote: string };
export interface ProductFormData { name: string; description: string; price: string; category_id: string; stock: string; delivery_days: string; tagline: string; image_url: string; activo: boolean; featured: boolean; specifications: Record<string, unknown>; source: string; source_url: string; source_id: string; supplier_price: string; supplier_currency: string; shipping_fee: string; tax_percentage: string; discount_percentage: string }

const input = 'min-h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#08090A] outline-none shadow-[inset_0_0_0_1px_rgba(23,24,32,.08)] focus:shadow-[inset_0_0_0_2px_rgba(182,144,108,.7)]';
function num(value: unknown) { const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : 0; }
function clp(value: unknown) { return '$' + Math.round(num(value)).toLocaleString('es-CL'); }
function cleanSpecs(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}; }
function unique(images: GalleryImage[]) { const map = new Map<string, GalleryImage>(); images.forEach((image) => { if (image.url.trim()) map.set(image.url.trim(), { ...image, url: image.url.trim() }); }); return Array.from(map.values()); }
function initialImages(image: string | undefined, specifications: Record<string, unknown>) { const list: GalleryImage[] = image ? [{ url: image, source: 'legacy' }] : []; const stored = specifications.gallery_assets; if (Array.isArray(stored)) stored.forEach((item) => { if (item && typeof item === 'object') { const row = item as Record<string, unknown>; const url = String(row.url || row.secure_url || ''); if (url) list.push({ url, public_id: String(row.public_id || '') || undefined, source: String(row.source || 'legacy') }); } }); return unique(list); }
function folder(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general'; }

export default function ProductForm({ initialData, productId, mode }: { initialData?: Partial<ProductFormData>; productId?: string; mode: 'create' | 'edit' }) {
  const router = useRouter();
  const { categories } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const storedSpecs = cleanSpecs(initialData?.specifications);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProductFormData>({ name: initialData?.name || '', description: initialData?.description || '', price: initialData?.price || '', category_id: initialData?.category_id || '', stock: initialData?.stock || '', delivery_days: initialData?.delivery_days || '', tagline: initialData?.tagline || '', image_url: initialData?.image_url || '', activo: initialData?.activo ?? true, featured: initialData?.featured ?? false, specifications: storedSpecs, source: initialData?.source || '', source_url: initialData?.source_url || '', source_id: initialData?.source_id || '', supplier_price: initialData?.supplier_price || '', supplier_currency: initialData?.supplier_currency || 'CLP', shipping_fee: initialData?.shipping_fee || '', tax_percentage: initialData?.tax_percentage || String(storedSpecs.tax_percentage || 19), discount_percentage: initialData?.discount_percentage || String(storedSpecs.discount_percentage || 0) });
  const [gallery, setGallery] = useState<GalleryImage[]>(() => initialImages(initialData?.image_url, storedSpecs));
  const [markup, setMarkup] = useState(Number(storedSpecs.default_markup_percentage || 30));
  const [autoMarkup, setAutoMarkup] = useState(mode === 'create' || Boolean(storedSpecs.auto_markup_enabled));
  const [analysis, setAnalysis] = useState<Analysis | null>((storedSpecs.commerce_ai as Analysis | undefined) || null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { if (!form.category_id && categories[0]?.id) setForm((current) => ({ ...current, category_id: categories[0].id })); }, [categories, form.category_id]);
  const cost = num(form.supplier_price);
  const manualPrice = num(form.price);
  const normalPrice = autoMarkup && cost > 0 ? Math.round(cost * (1 + markup / 100)) : manualPrice;
  const discount = Math.min(100, Math.max(0, num(form.discount_percentage)));
  const currentPrice = Math.round(normalPrice * (1 - discount / 100));
  const shipping = num(form.shipping_fee);
  const iva = Math.round((currentPrice + shipping) * num(form.tax_percentage) / 100);
  const total = currentPrice + shipping + iva;
  const margin = normalPrice > 0 && cost > 0 ? Math.round((normalPrice - cost) / normalPrice * 100) : null;
  const cover = form.image_url || gallery[0]?.url || '';
  const categoryName = categories.find((category) => category.id === form.category_id)?.name || 'general';
  const steps = ['Información', 'Imágenes', 'Costo y margen', 'Promoción', 'IA privada', 'Publicar'];
  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function upload(files: FileList) {
    setBusy('upload'); setNotice('');
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append('file', file); body.append('folder', `fabrick/productos/${folder(categoryName)}`);
        const response = await fetch('/api/admin/cloudinary', { method: 'POST', body });
        const json = await response.json() as { url?: string; asset?: { url?: string; public_id?: string }; error?: string };
        if (!response.ok) throw new Error(json.error || 'No se pudo subir la imagen.');
        const url = json.url || json.asset?.url || '';
        if (url) uploaded.push({ url, public_id: json.asset?.public_id, source: 'cloudinary' });
      }
      setGallery((current) => unique([...current, ...uploaded]));
      if (!form.image_url && uploaded[0]) set('image_url', uploaded[0].url);
      setNotice(`${uploaded.length} imagen${uploaded.length === 1 ? '' : 'es'} añadida${uploaded.length === 1 ? '' : 's'}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Error subiendo imágenes.'); }
    finally { setBusy(''); }
  }
  function moveImage(index: number, direction: -1 | 1) { setGallery((current) => { const destination = index + direction; if (destination < 0 || destination >= current.length) return current; const copy = [...current]; [copy[index], copy[destination]] = [copy[destination], copy[index]]; return copy; }); }
  function removeImage(image: GalleryImage) { setGallery((current) => { const next = current.filter((item) => item.url !== image.url); if (form.image_url === image.url) set('image_url', next[0]?.url || ''); return next; }); if (image.public_id) void fetch(`/api/admin/cloudinary?public_id=${encodeURIComponent(image.public_id)}`, { method: 'DELETE' }); }
  async function analyze() {
    if (!form.name.trim()) { setNotice('Escribe primero el nombre del producto.'); return; }
    setBusy('ai'); setNotice('');
    try {
      const response = await fetch('/api/admin/products/ai-commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: { name: form.name, description: form.description, category: categoryName, price: normalPrice, cost, stock: form.stock, specifications: form.specifications } }) });
      const json = await response.json() as { analysis?: Analysis; error?: string; warning?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'No se pudo generar el análisis.');
      setAnalysis(json.analysis); setNotice(json.warning || 'Análisis generado. Revisa antes de aplicar.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Error analizando el producto.'); }
    finally { setBusy(''); }
  }
  function applyAnalysis() { if (!analysis) return; setForm((current) => ({ ...current, name: analysis.title, tagline: analysis.shortDescription, description: analysis.longDescription, price: String(analysis.recommendedPrice), specifications: { ...current.specifications, commerce_ai: analysis } })); setAutoMarkup(false); setStep(6); setNotice('Análisis aplicado. Revisa la vista previa antes de guardar.'); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || normalPrice <= 0) { setNotice('Completa el nombre y un precio válido.'); return; }
    if (mode === 'edit' && !productId) { setNotice('No se pudo resolver el producto a editar.'); return; }
    setBusy('save'); setNotice('');
    const cleanGallery: GalleryImage[] = unique([{ url: form.image_url, source: 'legacy' }, ...gallery].filter((item) => Boolean(item.url)));
    const specifications = { ...form.specifications, gallery_images: cleanGallery.map((image) => image.url), gallery_assets: cleanGallery, tax_percentage: num(form.tax_percentage), discount_percentage: discount, default_markup_percentage: markup, auto_markup_enabled: autoMarkup, ...(analysis ? { commerce_ai: analysis } : {}) };
    const payload = { name: form.name.trim(), description: form.description.trim() || null, tagline: form.tagline.trim() || null, price: normalPrice, discount_percentage: discount, supplier_price: cost || null, supplier_currency: form.supplier_currency || 'CLP', shipping_fee: shipping || null, category_id: form.category_id || null, stock: form.stock ? Number(form.stock) : null, delivery_days: form.delivery_days ? Number(form.delivery_days) : null, image_url: cleanGallery[0]?.url || null, activo: form.activo, featured: form.featured, source: form.source || null, source_url: form.source_url || null, source_id: form.source_id || null, specifications };
    try {
      const endpoint = mode === 'create' ? '/api/admin/products' : `/api/admin/products?id=${encodeURIComponent(productId || '')}`;
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar.');
      setNotice('Producto guardado correctamente.');
      setTimeout(() => router.push('/admin/productos'), 900);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setBusy('');
    }
  }

  return <div className="min-h-screen bg-[#EDE3D8] pb-28 text-[#08090A] md:pb-8">
    <header className="sticky top-0 z-40 bg-[#08090A]/96 px-3 py-3 text-[#FFF9EE] shadow-xl backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-[1600px] items-center gap-3"><button type="button" onClick={() => router.push('/admin/productos')} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#FFB000]">Editor guiado</p><h1 className="truncate text-xl font-black">{mode === 'create' ? 'Crear producto' : form.name || 'Editar producto'}</h1></div><span className="rounded-full bg-[#F5871F] px-4 py-2 text-xs font-black text-[#08090A]">{step}/6</span></div></header>
    <div className="mx-auto max-w-[1600px] px-1.5 py-4 sm:px-5 lg:px-7">
      <nav className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-[#FFF9EE] p-2 shadow-sm lg:grid-cols-6">{steps.map((name, index) => <button type="button" key={name} onClick={() => setStep(index + 1)} className={`rounded-[1.1rem] px-3 py-3 text-left text-[10px] font-black uppercase tracking-[.12em] ${step === index + 1 ? 'bg-[#08090A] text-white' : step > index + 1 ? 'bg-[#D8C0A8]' : 'bg-white text-[#BFB8AC]'}`}>0{index + 1} · {name}</button>)}</nav>
      {notice ? <p className="mt-4 rounded-2xl bg-[#08090A] px-4 py-3 text-sm text-white">{notice}</p> : null}
      <form onSubmit={submit} className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <main className="rounded-[2rem] bg-[#FFF9EE] p-4 shadow-[0_24px_80px_rgba(23,24,32,.09)] sm:p-7">
          {step === 1 && <><Title icon={Star} step="Paso 1" title="Información principal" text="Define el producto primero. Los siguientes pasos usarán estos datos." /><Field label="Nombre"><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field><div className="mt-4"><Field label="Frase comercial"><input className={input} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field></div><div className="mt-4"><Field label="Descripción"><textarea className={`${input} min-h-40 py-4`} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Categoría"><select className={input} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Stock"><input type="number" min="0" className={input} value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field></div></>}
          {step === 2 && <><Title icon={Images} step="Paso 2" title="Portada y galería" text="Las imágenes ocupan todo el ancho y se muestran separadas, sin apilarse." /><button type="button" onClick={() => fileRef.current?.click()} className="grid min-h-36 w-full place-items-center rounded-[1.7rem] bg-[#E5D2C0]"><span><Cloud className="mx-auto h-7 w-7" /><b className="mt-2 block">{busy === 'upload' ? 'Subiendo…' : 'Subir varias imágenes'}</b></span></button><input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ''; }} />{cover ? <img src={cover} alt="Portada" className="mt-5 aspect-[16/8] w-full rounded-[1.7rem] object-cover" /> : null}<div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{gallery.map((image, index) => <div key={image.url} className="rounded-2xl bg-white p-2"><img src={image.url} alt={`Imagen ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /><div className="mt-2 grid grid-cols-4 gap-1"><Small onClick={() => moveImage(index, -1)} disabled={index === 0}><ChevronLeft /></Small><Small onClick={() => set('image_url', image.url)}><Star /></Small><Small onClick={() => moveImage(index, 1)} disabled={index === gallery.length - 1}><ChevronRight /></Small><Small onClick={() => removeImage(image)} danger><Trash2 /></Small></div></div>)}</div></>}
          {step === 3 && <><Title icon={Calculator} step="Paso 3" title="Costo, aumento y precio normal" text="Por defecto, el precio se calcula como costo proveedor + 30%." /><div className="grid gap-4 md:grid-cols-3"><Price label="1. Costo proveedor" value={form.supplier_price} onChange={(value) => set('supplier_price', value)} /><Price label="2. Aumento" value={String(markup)} onChange={(value) => setMarkup(Math.max(0, Number(value) || 0))} suffix="%" /><Metric label="3. Precio normal" value={clp(normalPrice)} dark /></div><label className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4"><span><b className="block">Cálculo automático</b><small className="text-[#BFB8AC]">Recalcular al cambiar el costo.</small></span><input type="checkbox" checked={autoMarkup} onChange={(e) => setAutoMarkup(e.target.checked)} className="h-6 w-6" /></label>{!autoMarkup ? <div className="mt-4"><Field label="Precio normal manual"><input className={input} inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} /></Field></div> : null}<div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Envío"><input type="number" className={input} value={form.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} /></Field><Field label="IVA %"><input type="number" className={input} value={form.tax_percentage} onChange={(e) => set('tax_percentage', e.target.value)} /></Field><Field label="Entrega días"><input type="number" className={input} value={form.delivery_days} onChange={(e) => set('delivery_days', e.target.value)} /></Field></div></>}
          {step === 4 && <><Title icon={BadgePercent} step="Paso 4" title="Precio antes y precio ahora" text="El descuento se aplica sobre el precio normal; nunca modifica el costo proveedor." /><div className="grid gap-4 md:grid-cols-3"><Metric label="Precio antes" value={clp(normalPrice)} /><Price label="Descuento" value={form.discount_percentage} onChange={(value) => set('discount_percentage', value)} suffix="%" /><Metric label="Precio ahora" value={clp(currentPrice)} dark /></div><p className="mt-4 rounded-2xl bg-[#F2DFBB] p-4 text-sm">Ahorro visible: <b>{clp(normalPrice - currentPrice)}</b>. En la tienda aparecerá el precio anterior tachado y el actual destacado.</p><label className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4"><span><b>Producto destacado</b><small className="block text-[#BFB8AC]">Puede aparecer en la vitrina principal.</small></span><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="h-6 w-6" /></label></>}
          {step === 5 && <><Title icon={WandSparkles} step="Paso 5" title="Análisis privado con IA" text="Genera rango mínimo, medio, máximo, título, descripción y señales estimadas de demanda." /><button type="button" onClick={() => void analyze()} disabled={busy === 'ai'} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#08090A] px-6 text-sm font-black text-white">{busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#FFB000]" />}{busy === 'ai' ? 'Analizando…' : 'Analizar producto'}</button>{analysis ? <div className="mt-5 grid gap-4"><div className="grid gap-3 sm:grid-cols-4"><Metric label="Inicial" value={clp(analysis.priceLow)} /><Metric label="Medio" value={clp(analysis.priceMid)} /><Metric label="Máximo" value={clp(analysis.priceHigh)} /><Metric label="Recomendado" value={clp(analysis.recommendedPrice)} dark /></div><div className="grid gap-3 sm:grid-cols-2"><Metric label="Demanda estimada" value={`${analysis.estimatedDemand}%`} /><Metric label="Compra estimada" value={`${analysis.estimatedPurchasePopularity}%`} /></div><div className="rounded-2xl bg-white p-5"><h3 className="text-xl font-black">{analysis.title}</h3><p className="mt-2 text-sm leading-6 text-[#BFB8AC]">{analysis.longDescription}</p><p className="mt-3 text-xs font-bold text-[#F5871F]">{analysis.tags.join(' · ')}</p></div><button type="button" onClick={applyAnalysis} className="rounded-full bg-[#F5871F] px-6 py-4 text-sm font-black">Aplicar propuesta</button></div> : null}</>}
          {step === 6 && <><Title icon={Check} step="Paso 6" title="Revisión final" text="Comprueba precio normal, promoción, margen y visibilidad antes de publicar." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Normal" value={clp(normalPrice)} /><Metric label="Promoción" value={clp(currentPrice)} dark /><Metric label="Total referencia" value={clp(total)} /><Metric label="Margen bruto" value={margin == null ? 'Pendiente' : `${margin}%`} /></div><label className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4"><span><b>Visible en tienda</b><small className="block text-[#BFB8AC]">Publicar al guardar.</small></span><input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} className="h-6 w-6" /></label></>}
          <div className="mt-8 flex justify-between border-t border-black/8 pt-5"><button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="rounded-full bg-white px-5 py-3 text-sm font-black disabled:opacity-30">Anterior</button>{step < 6 ? <button type="button" onClick={() => setStep(Math.min(6, step + 1))} className="inline-flex items-center gap-2 rounded-full bg-[#08090A] px-6 py-3 text-sm font-black text-white">Continuar <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={busy === 'save'} className="inline-flex items-center gap-2 rounded-full bg-[#F5871F] px-7 py-3 text-sm font-black">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy === 'save' ? 'Guardando…' : 'Guardar y publicar'}</button>}</div>
        </main>
        <aside className="xl:sticky xl:top-24 xl:h-fit"><div className="overflow-hidden rounded-[2rem] bg-[#08090A] text-[#FFF9EE] shadow-2xl"><div className="aspect-[4/3] bg-[#2B2C34]">{cover ? <img src={cover} alt={form.name || 'Producto'} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-14 w-14 text-white/15" /></div>}</div><div className="p-5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Vista previa</p><h2 className="mt-3 text-2xl font-black leading-tight">{form.name || 'Nombre del producto'}</h2><p className="mt-2 text-sm leading-6 text-white/55">{form.tagline || form.description || 'Completa la información para ver la ficha.'}</p><div className="mt-5"><p className="text-3xl font-black text-[#F2DFBB]">{clp(currentPrice || normalPrice)}</p>{discount > 0 ? <p className="text-xs text-white/35 line-through">Antes {clp(normalPrice)}</p> : null}<p className="mt-2 text-xs text-white/45">{gallery.length} fotos · {margin == null ? 'margen pendiente' : `${margin}% margen`}</p></div></div></div></aside>
      </form>
    </div>
  </div>;
}

function Title({ icon: Icon, step, title, text }: { icon: typeof Star; step: string; title: string; text: string }) { return <div className="mb-7 flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F5871F]">{step}</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#70645C]">{text}</p></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.15em] text-[#F5871F]">{label}</span><div className="mt-2">{children}</div></label>; }
function Price({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) { return <label className="rounded-[1.5rem] bg-white p-5"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">{label}</span><div className="mt-3 flex items-center gap-2"><span className="text-xl font-black">{suffix ? '' : '$'}</span><input type="number" min="0" className="min-w-0 flex-1 bg-transparent text-2xl font-black outline-none" value={value} onChange={(e) => onChange(e.target.value)} /><b>{suffix}</b></div></label>; }
function Metric({ label, value, dark }: { label: string; value: string; dark?: boolean }) { return <div className={`rounded-[1.5rem] p-5 ${dark ? 'bg-[#08090A] text-white' : 'bg-white'}`}><p className="text-[9px] font-black uppercase tracking-[.14em] opacity-55">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>; }
function Small({ children, onClick, disabled, danger }: { children: React.ReactElement<{ className?: string }>; onClick: () => void; disabled?: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className={`grid h-9 place-items-center rounded-xl disabled:opacity-25 ${danger ? 'bg-red-100 text-red-700' : 'bg-[#EEE5DC]'}`}>{children}</button>; }