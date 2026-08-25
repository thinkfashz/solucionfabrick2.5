'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Eye,
  Image as ImageIcon,
  Loader2,
  Package,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  WandSparkles,
  X,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

export type ProductStudioRecord = {
  id: string;
  name: string;
  description?: string | null;
  tagline?: string | null;
  price: number | string;
  stock?: number | null;
  delivery_days?: number | null;
  image_url?: string | null;
  featured?: boolean;
  activo?: boolean;
  category_id?: string | null;
  created_at?: string | null;
  source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
  supplier_price?: number | string | null;
  supplier_currency?: string | null;
  shipping_fee?: number | string | null;
  specifications?: Record<string, unknown> | null;
  discount_percentage?: number | string | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  scan_format?: string | null;
};

type GalleryImage = { url: string; public_id?: string; source?: string };
type Section = 'ficha' | 'precio' | 'imagenes' | 'seo';

type CommerceAnalysis = {
  title: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  tags: string[];
  rating: number;
  estimatedDemand: number;
  estimatedPurchasePopularity: number;
  priceLow: number;
  priceMid: number;
  priceHigh: number;
  recommendedPrice: number;
  marginNote: string;
  buyerProfile: string;
  positioning: string;
  evidenceNote: string;
};

type MarketingOption = {
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  niche: string;
  targetAudience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  commercialKeywords: string[];
  hashtags: string[];
  seoTitle: string;
  seoDescription: string;
  slug: string;
  imageAltTexts: string[];
  imageCaptions: string[];
  adPrimaryText: string;
  adHeadline: string;
  adDescription: string;
  callToAction: string;
  visualPrompts: string[];
  searchPotential: number;
  salesPotential: number;
  keywordRationale: string;
};

type FormState = {
  name: string;
  tagline: string;
  description: string;
  category_id: string;
  price: string;
  supplier_price: string;
  supplier_currency: string;
  shipping_fee: string;
  tax_percentage: string;
  discount_percentage: string;
  stock: string;
  delivery_days: string;
  image_url: string;
  activo: boolean;
  featured: boolean;
  sku: string;
  ean: string;
  source: string;
  source_url: string;
  source_id: string;
};

type SeoState = {
  title: string;
  description: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string;
};

const inputClass = 'min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[#111214] outline-none transition focus:border-[#d18b16] focus:ring-2 focus:ring-[#d18b16]/10';

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(numberValue(value)));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function uniqueImages(images: GalleryImage[]) {
  const map = new Map<string, GalleryImage>();
  for (const image of images) {
    const url = image.url.trim();
    if (url) map.set(url, { ...image, url });
  }
  return Array.from(map.values());
}

function productGallery(product?: ProductStudioRecord) {
  if (!product) return [] as GalleryImage[];
  const specs = record(product.specifications);
  const result: GalleryImage[] = [];
  if (product.image_url) result.push({ url: product.image_url, source: 'cover' });
  const assets = Array.isArray(specs.gallery_assets) ? specs.gallery_assets : [];
  for (const item of assets) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = String(row.url || row.secure_url || '').trim();
    if (url) result.push({ url, public_id: String(row.public_id || '') || undefined, source: String(row.source || 'stored') });
  }
  const urls = Array.isArray(specs.gallery_images) ? specs.gallery_images : [];
  for (const url of urls) if (typeof url === 'string' && url.trim()) result.push({ url, source: 'stored' });
  return uniqueImages(result);
}

function initialForm(product?: ProductStudioRecord): FormState {
  const specs = record(product?.specifications);
  return {
    name: product?.name || '',
    tagline: product?.tagline || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    price: product?.price != null ? String(product.price) : '',
    supplier_price: product?.supplier_price != null ? String(product.supplier_price) : '',
    supplier_currency: product?.supplier_currency || 'CLP',
    shipping_fee: product?.shipping_fee != null ? String(product.shipping_fee) : '',
    tax_percentage: String(specs.tax_percentage ?? 19),
    discount_percentage: product?.discount_percentage != null ? String(product.discount_percentage) : String(specs.discount_percentage ?? 0),
    stock: product?.stock != null ? String(product.stock) : '',
    delivery_days: product?.delivery_days != null ? String(product.delivery_days) : '',
    image_url: product?.image_url || '',
    activo: product?.activo !== false,
    featured: Boolean(product?.featured),
    sku: product?.sku || '',
    ean: product?.ean || '',
    source: product?.source || '',
    source_url: product?.source_url || '',
    source_id: product?.source_id || '',
  };
}

function initialSeo(product?: ProductStudioRecord): SeoState {
  const specs = record(product?.specifications);
  const seo = record(specs.seo);
  return {
    title: String(seo.title || ''),
    description: String(seo.description || ''),
    slug: String(seo.slug || ''),
    primaryKeyword: String(seo.primary_keyword || ''),
    secondaryKeywords: Array.isArray(seo.secondary_keywords) ? seo.secondary_keywords.map(String).join(', ') : '',
  };
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function folderName(value: string) {
  return slugify(value) || 'general';
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative inline-flex h-7 w-12 rounded-full transition ${checked ? 'bg-[#111214]' : 'bg-black/15'}`}>
      <span className={`mt-0.5 h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function ProductStudioEditor({
  mode,
  product,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  product?: ProductStudioRecord;
  onClose: () => void;
  onSaved: (product: ProductStudioRecord) => void;
}) {
  const { categories } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<Section>('ficha');
  const [form, setForm] = useState<FormState>(() => initialForm(product));
  const [seo, setSeo] = useState<SeoState>(() => initialSeo(product));
  const [gallery, setGallery] = useState<GalleryImage[]>(() => productGallery(product));
  const [removedAssets, setRemovedAssets] = useState<string[]>([]);
  const [markup, setMarkup] = useState(() => numberValue(record(product?.specifications).default_markup_percentage) || 30);
  const [autoMarkup, setAutoMarkup] = useState(() => mode === 'create' || Boolean(record(product?.specifications).auto_markup_enabled));
  const [commerce, setCommerce] = useState<CommerceAnalysis | null>(() => (record(product?.specifications).commerce_ai as CommerceAnalysis | undefined) || null);
  const [marketingOptions, setMarketingOptions] = useState<MarketingOption[]>([]);
  const [imageObservations, setImageObservations] = useState<string[]>([]);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState<'save' | 'upload' | 'ai' | ''>('');
  const [notice, setNotice] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    setForm(initialForm(product));
    setSeo(initialSeo(product));
    setGallery(productGallery(product));
    setRemovedAssets([]);
    setMarkup(numberValue(record(product?.specifications).default_markup_percentage) || 30);
    setAutoMarkup(mode === 'create' || Boolean(record(product?.specifications).auto_markup_enabled));
    setCommerce((record(product?.specifications).commerce_ai as CommerceAnalysis | undefined) || null);
    setMarketingOptions([]);
    setImageObservations([]);
    setAiWarnings([]);
    setSection('ficha');
    setNotice(null);
  }, [mode, product?.id]);

  useEffect(() => {
    if (!form.category_id && categories[0]?.id) setForm((current) => ({ ...current, category_id: categories[0].id }));
  }, [categories, form.category_id]);

  const categoryName = categories.find((item) => item.id === form.category_id)?.name || 'General';
  const cost = numberValue(form.supplier_price);
  const manualPrice = numberValue(form.price);
  const basePrice = autoMarkup && cost > 0 ? Math.round(cost * (1 + markup / 100)) : manualPrice;
  const discount = Math.min(95, Math.max(0, numberValue(form.discount_percentage)));
  const salePrice = Math.round(basePrice * (1 - discount / 100));
  const shipping = numberValue(form.shipping_fee);
  const tax = Math.round((salePrice + shipping) * Math.max(0, numberValue(form.tax_percentage)) / 100);
  const checkoutReference = salePrice + shipping + tax;
  const margin = basePrice > 0 && cost > 0 ? Math.round(((basePrice - cost) / basePrice) * 100) : null;
  const cover = form.image_url || gallery[0]?.url || '';

  const completeness = useMemo(() => {
    const checks = [
      Boolean(form.name.trim()),
      Boolean(form.description.trim()),
      basePrice > 0,
      Boolean(form.category_id),
      Boolean(cover),
      form.stock !== '',
      Boolean(seo.title.trim()),
      Boolean(seo.description.trim()),
      Boolean(seo.primaryKeyword.trim()),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form.name, form.description, form.category_id, form.stock, basePrice, cover, seo.title, seo.description, seo.primaryKeyword]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setBusy('upload');
    setNotice(null);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of files.slice(0, 12)) {
        const body = new FormData();
        body.append('file', file);
        body.append('folder', `fabrick/productos/${folderName(categoryName)}`);
        const response = await fetch('/api/admin/cloudinary', { method: 'POST', body });
        const json = await response.json().catch(() => ({})) as { url?: string; asset?: { url?: string; public_id?: string }; error?: string };
        if (!response.ok) throw new Error(json.error || 'No se pudo subir una imagen.');
        const url = json.url || json.asset?.url || '';
        if (url) uploaded.push({ url, public_id: json.asset?.public_id, source: 'cloudinary' });
      }
      setGallery((current) => uniqueImages([...current, ...uploaded]));
      if (!form.image_url && uploaded[0]?.url) setField('image_url', uploaded[0].url);
      setNotice({ type: 'ok', text: `${uploaded.length} imagen${uploaded.length === 1 ? '' : 'es'} añadida${uploaded.length === 1 ? '' : 's'}.` });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Error subiendo imágenes.' });
    } finally {
      setBusy('');
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    setGallery((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[destination]] = [copy[destination], copy[index]];
      return copy;
    });
  }

  function removeImage(image: GalleryImage) {
    if (image.public_id) setRemovedAssets((current) => Array.from(new Set([...current, image.public_id!]))) ;
    setGallery((current) => {
      const next = current.filter((item) => item.url !== image.url);
      if (form.image_url === image.url) setField('image_url', next[0]?.url || '');
      return next;
    });
  }

  async function runAiSuite() {
    if (!form.name.trim()) {
      setNotice({ type: 'error', text: 'Escribe el nombre del producto antes de analizarlo.' });
      setSection('ficha');
      return;
    }
    setBusy('ai');
    setNotice({ type: 'info', text: 'La IA está revisando propuesta comercial, imágenes, SEO y precio.' });
    try {
      const imageUrls = uniqueImages([{ url: form.image_url }, ...gallery].filter((item) => Boolean(item.url))).map((item) => item.url).slice(0, 8);
      const productPayload = {
        id: product?.id,
        name: form.name,
        description: form.description,
        tagline: form.tagline,
        category: categoryName,
        price: basePrice,
        cost,
        stock: form.stock,
        specifications: product?.specifications || {},
      };
      const [commerceResponse, marketingResponse] = await Promise.all([
        fetch('/api/admin/products/ai-commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: productPayload }) }),
        fetch('/api/admin/products/ai-marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: productPayload, imageUrls, goal: 'mejorar ficha, posicionamiento, SEO y conversión', location: 'Chile' }) }),
      ]);
      const commerceJson = await commerceResponse.json().catch(() => ({})) as { analysis?: CommerceAnalysis; error?: string; warning?: string };
      const marketingJson = await marketingResponse.json().catch(() => ({})) as { options?: MarketingOption[]; imageObservations?: string[]; warnings?: string[]; error?: string };
      if (!commerceResponse.ok && !marketingResponse.ok) throw new Error(commerceJson.error || marketingJson.error || 'La IA no pudo analizar este producto.');
      if (commerceJson.analysis) setCommerce(commerceJson.analysis);
      setMarketingOptions(Array.isArray(marketingJson.options) ? marketingJson.options.slice(0, 2) : []);
      setImageObservations(Array.isArray(marketingJson.imageObservations) ? marketingJson.imageObservations : []);
      setAiWarnings([
        ...(commerceJson.warning ? [commerceJson.warning] : []),
        ...(Array.isArray(marketingJson.warnings) ? marketingJson.warnings : []),
      ]);
      setSection('seo');
      setNotice({ type: 'ok', text: 'Análisis listo. Nada se aplica automáticamente: tú eliges qué recomendación usar.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Error analizando el producto.' });
    } finally {
      setBusy('');
    }
  }

  function applyCommerceCopy() {
    if (!commerce) return;
    setForm((current) => ({ ...current, name: commerce.title, tagline: commerce.shortDescription, description: commerce.longDescription }));
    setNotice({ type: 'ok', text: 'Texto comercial aplicado. El precio no cambió.' });
  }

  function applyCommercePrice() {
    if (!commerce) return;
    setAutoMarkup(false);
    setField('price', String(commerce.recommendedPrice));
    setNotice({ type: 'ok', text: `Precio sugerido aplicado: ${money(commerce.recommendedPrice)}.` });
  }

  function applyMarketing(option: MarketingOption) {
    setForm((current) => ({ ...current, name: option.name, tagline: option.tagline, description: option.longDescription }));
    setSeo({
      title: option.seoTitle,
      description: option.seoDescription,
      slug: option.slug,
      primaryKeyword: option.primaryKeyword,
      secondaryKeywords: option.secondaryKeywords.join(', '),
    });
    setNotice({ type: 'ok', text: 'Propuesta SEO y comercial aplicada. Revisa antes de guardar.' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || basePrice <= 0) {
      setNotice({ type: 'error', text: 'Completa el nombre y un precio válido.' });
      return;
    }
    if (mode === 'edit' && !product?.id) {
      setNotice({ type: 'error', text: 'No se pudo resolver el producto a editar.' });
      return;
    }
    setBusy('save');
    setNotice(null);
    try {
      const cleanGallery = uniqueImages([{ url: form.image_url, source: 'cover' }, ...gallery].filter((item) => Boolean(item.url)));
      const previousSpecs = record(product?.specifications);
      const seoPayload = {
        title: seo.title.trim(),
        description: seo.description.trim(),
        slug: seo.slug.trim() || slugify(form.name),
        primary_keyword: seo.primaryKeyword.trim(),
        secondary_keywords: seo.secondaryKeywords.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 16),
      };
      const specifications = {
        ...previousSpecs,
        gallery_images: cleanGallery.map((image) => image.url),
        gallery_assets: cleanGallery,
        tax_percentage: Math.max(0, numberValue(form.tax_percentage)),
        discount_percentage: discount,
        default_markup_percentage: markup,
        auto_markup_enabled: autoMarkup,
        seo: seoPayload,
        ...(commerce ? { commerce_ai: commerce } : {}),
        ...(marketingOptions.length ? { marketing_ai: { options: marketingOptions, image_observations: imageObservations, warnings: aiWarnings, analyzed_at: new Date().toISOString() } } : {}),
      };
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        tagline: form.tagline.trim() || null,
        price: basePrice,
        discount_percentage: discount,
        supplier_price: cost || null,
        supplier_currency: form.supplier_currency || 'CLP',
        shipping_fee: shipping || null,
        category_id: form.category_id || null,
        stock: form.stock === '' ? null : Number(form.stock),
        delivery_days: form.delivery_days === '' ? null : Number(form.delivery_days),
        image_url: form.image_url || cleanGallery[0]?.url || null,
        activo: form.activo,
        featured: form.featured,
        sku: form.sku.trim() || null,
        ean: form.ean.trim() || null,
        source: form.source.trim() || null,
        source_url: form.source_url.trim() || null,
        source_id: form.source_id.trim() || null,
        specifications,
      };
      const endpoint = mode === 'create' ? '/api/admin/products' : `/api/admin/products?id=${encodeURIComponent(product!.id)}`;
      const response = await fetch(endpoint, { method: mode === 'create' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => ({})) as { product?: ProductStudioRecord; error?: string };
      if (!response.ok || !json.product) throw new Error(json.error || 'No se pudo guardar el producto.');
      for (const publicId of removedAssets) {
        void fetch(`/api/admin/cloudinary?public_id=${encodeURIComponent(publicId)}`, { method: 'DELETE' });
      }
      setNotice({ type: 'ok', text: 'Producto guardado correctamente.' });
      onSaved(json.product);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar el producto.' });
    } finally {
      setBusy('');
    }
  }

  const sections: Array<{ id: Section; label: string; icon: typeof Package }> = [
    { id: 'ficha', label: 'Ficha', icon: Package },
    { id: 'precio', label: 'Precio e inventario', icon: BadgePercent },
    { id: 'imagenes', label: 'Imágenes', icon: ImageIcon },
    { id: 'seo', label: 'SEO + IA', icon: Sparkles },
  ];

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col bg-[#f4efe4] text-[#111214]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#fffaf0]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-black/60 hover:text-black" aria-label="Cerrar editor"><X className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="rounded-full bg-[#111214] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#f5c75d]">Product Studio</span><span className="text-[10px] font-bold text-black/35">{mode === 'create' ? 'Nuevo producto' : `ID ${product?.id || ''}`}</span></div>
            <h2 className="mt-1 truncate text-lg font-black tracking-[-.035em] sm:text-xl">{form.name || 'Producto sin nombre'}</h2>
          </div>
          <button type="button" onClick={() => void runAiSuite()} disabled={busy !== ''} className="hidden items-center gap-2 rounded-xl border border-[#d18b16]/25 bg-[#fff3cf] px-3.5 py-2.5 text-xs font-black text-[#83590f] transition hover:bg-[#ffe9a7] disabled:opacity-50 sm:inline-flex">{busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}Analizar con IA</button>
          <button type="submit" disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-xl bg-[#111214] px-4 py-2.5 text-xs font-black text-white shadow-lg disabled:opacity-50">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy === 'save' ? 'Guardando' : 'Guardar'}</button>
        </div>
      </header>

      <div className="border-b border-black/8 bg-[#fffaf0] px-3 py-2 sm:px-6">
        <nav className="flex gap-1 overflow-x-auto">
          {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-black transition ${section === id ? 'bg-[#111214] text-white' : 'text-black/45 hover:bg-black/[0.04] hover:text-black'}`}><Icon className={`h-4 w-4 ${section === id ? 'text-[#f5c75d]' : ''}`} />{label}</button>)}
          <button type="button" onClick={() => void runAiSuite()} disabled={busy !== ''} className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#fff0bd] px-3.5 text-xs font-black text-[#80550d] sm:hidden">{busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}IA</button>
        </nav>
      </div>

      {notice ? <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 text-sm sm:mx-6 ${notice.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' : notice.type === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{notice.type === 'error' ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : null}{notice.text}</div> : null}

      <div className="grid flex-1 gap-5 p-4 sm:p-6 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="min-w-0">
          {section === 'ficha' ? (
            <div className="space-y-4">
              <Panel title="Información principal" description="Lo esencial para reconocer, vender y encontrar el producto.">
                <Field label="Nombre del producto" required><input className={inputClass} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Ej. Aire acondicionado inverter 12.000 BTU" /></Field>
                <div className="mt-4"><Field label="Frase comercial"><input className={inputClass} value={form.tagline} onChange={(event) => setField('tagline', event.target.value)} placeholder="Una frase breve y útil" /></Field></div>
                <div className="mt-4"><Field label="Descripción"><textarea className={`${inputClass} min-h-36 py-3`} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Describe qué es, para quién sirve y qué debe saber el comprador." /></Field></div>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Categoría"><select className={inputClass} value={form.category_id} onChange={(event) => setField('category_id', event.target.value)}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Stock"><input type="number" min="0" className={inputClass} value={form.stock} onChange={(event) => setField('stock', event.target.value)} /></Field></div>
                <div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="SKU"><input className={inputClass} value={form.sku} onChange={(event) => setField('sku', event.target.value)} placeholder="Código interno" /></Field><Field label="EAN"><input className={inputClass} value={form.ean} onChange={(event) => setField('ean', event.target.value)} placeholder="Código de barras" /></Field><Field label="Entrega estimada"><div className="relative"><input type="number" min="0" className={`${inputClass} pr-14`} value={form.delivery_days} onChange={(event) => setField('delivery_days', event.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-black/35">días</span></div></Field></div>
              </Panel>

              <Panel title="Estado y origen" description="Controla visibilidad sin mezclarla con la edición del contenido.">
                <div className="grid gap-3 sm:grid-cols-2"><ToggleCard title="Producto activo" text="Visible y disponible en el catálogo." checked={form.activo} onChange={(value) => setField('activo', value)} /><ToggleCard title="Destacado" text="Puede aparecer en posiciones prioritarias." checked={form.featured} onChange={(value) => setField('featured', value)} /></div>
                <details className="mt-4 rounded-xl border border-black/8 bg-black/[0.025] p-4"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.12em] text-black/55">Datos de proveedor / importación</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Proveedor"><input className={inputClass} value={form.source} onChange={(event) => setField('source', event.target.value)} /></Field><Field label="URL de origen"><input className={inputClass} value={form.source_url} onChange={(event) => setField('source_url', event.target.value)} /></Field></div></details>
              </Panel>
            </div>
          ) : null}

          {section === 'precio' ? (
            <div className="space-y-4">
              <Panel title="Precio y margen" description="El costo, precio, descuento e impuestos se entienden en una sola vista.">
                <div className="grid gap-4 md:grid-cols-2"><Field label="Costo proveedor"><MoneyInput value={form.supplier_price} onChange={(value) => setField('supplier_price', value)} /></Field><Field label="Moneda proveedor"><select className={inputClass} value={form.supplier_currency} onChange={(event) => setField('supplier_currency', event.target.value)}><option value="CLP">CLP</option><option value="USD">USD</option><option value="EUR">EUR</option></select></Field></div>
                <div className="mt-4 rounded-xl border border-black/8 bg-[#f7efdc] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black">Calcular precio desde costo</p><p className="mt-1 text-xs text-black/45">Útil para mantener un margen base sin recalcular manualmente.</p></div><Toggle checked={autoMarkup} onChange={setAutoMarkup} label="Precio automático" /></div>{autoMarkup ? <div className="mt-4 max-w-xs"><Field label="Aumento sobre costo"><div className="relative"><input type="number" min="0" max="500" className={`${inputClass} pr-10`} value={markup} onChange={(event) => setMarkup(Math.max(0, Number(event.target.value) || 0))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-black/35">%</span></div></Field></div> : null}</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Precio normal" required><MoneyInput value={autoMarkup && cost > 0 ? String(basePrice) : form.price} disabled={autoMarkup && cost > 0} onChange={(value) => setField('price', value)} /></Field><Field label="Descuento"><PercentInput value={form.discount_percentage} onChange={(value) => setField('discount_percentage', value)} /></Field></div>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Envío"><MoneyInput value={form.shipping_fee} onChange={(value) => setField('shipping_fee', value)} /></Field><Field label="Impuesto referencial"><PercentInput value={form.tax_percentage} onChange={(value) => setField('tax_percentage', value)} /></Field></div>
              </Panel>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MiniMetric label="Precio venta" value={money(salePrice)} /><MiniMetric label="Margen bruto" value={margin == null ? 'Sin costo' : `${margin}%`} /><MiniMetric label="Envío" value={shipping ? money(shipping) : 'Sin cargo'} /><MiniMetric label="Total ref." value={money(checkoutReference)} dark /></div>
            </div>
          ) : null}

          {section === 'imagenes' ? (
            <div className="space-y-4">
              <Panel title="Portada y galería" description="Sube, ordena y elige la portada sin salir del editor.">
                <button type="button" disabled={busy !== ''} onClick={() => fileRef.current?.click()} className="flex min-h-28 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[#bb872c]/35 bg-[#fff6db] text-sm font-black text-[#7c5615] transition hover:bg-[#ffefbd] disabled:opacity-50">{busy === 'upload' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}{busy === 'upload' ? 'Subiendo imágenes…' : 'Subir imágenes del producto'}</button>
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) void uploadFiles(files); event.target.value = ''; }} />
                {gallery.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((image, index) => <article key={image.url} className={`overflow-hidden rounded-xl border bg-white ${form.image_url === image.url ? 'border-[#d18b16] ring-2 ring-[#d18b16]/15' : 'border-black/8'}`}><div className="relative aspect-[4/3] bg-[#f3eee4] p-2"><img src={image.url} alt="" className="h-full w-full rounded-lg object-contain" />{form.image_url === image.url ? <span className="absolute left-2 top-2 rounded-full bg-[#111214] px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#f5c75d]">Portada</span> : null}</div><div className="grid grid-cols-4 gap-1.5 p-2"><button type="button" onClick={() => setField('image_url', image.url)} className="col-span-2 rounded-lg bg-black/[0.05] px-2 py-2 text-[10px] font-black hover:bg-[#fff0bd]">Usar portada</button><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} className="grid place-items-center rounded-lg bg-black/[0.05] disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={index === gallery.length - 1} onClick={() => moveImage(index, 1)} className="grid place-items-center rounded-lg bg-black/[0.05] disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => removeImage(image)} className="col-span-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-2 py-2 text-[10px] font-black text-red-700"><Trash2 className="h-3.5 w-3.5" />Quitar</button></div></article>)}</div> : <div className="mt-4 rounded-xl bg-black/[0.025] p-8 text-center text-sm text-black/40"><ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-30" />Todavía no hay imágenes.</div>}
              </Panel>
            </div>
          ) : null}

          {section === 'seo' ? (
            <div className="space-y-4">
              <Panel title="Análisis inteligente" description="Una sola acción revisa posicionamiento comercial, precio, imágenes, SEO y copy. Nada se aplica sin tu aprobación.">
                <div className="flex flex-col gap-3 rounded-xl bg-[#111214] p-4 text-white sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#f5c75d]" /><p className="text-sm font-black">Fabrick Commerce AI</p></div><p className="mt-1 max-w-xl text-xs leading-5 text-white/50">Usa los datos del producto y hasta 8 imágenes para generar recomendaciones editables.</p></div><button type="button" onClick={() => void runAiSuite()} disabled={busy !== ''} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f5c75d] px-4 text-xs font-black text-black disabled:opacity-50">{busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{busy === 'ai' ? 'Analizando…' : 'Analizar producto'}</button></div>

                {commerce ? <div className="mt-4 rounded-xl border border-black/8 bg-[#f7efdc] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#966917]">Diagnóstico comercial</p><h3 className="mt-1 text-lg font-black">Demanda {commerce.estimatedDemand}/100 · Compra {commerce.estimatedPurchasePopularity}/100</h3></div><span className="rounded-xl bg-white px-3 py-2 text-sm font-black">Precio IA {money(commerce.recommendedPrice)}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><MiniMetric label="Banda baja" value={money(commerce.priceLow)} /><MiniMetric label="Banda media" value={money(commerce.priceMid)} /><MiniMetric label="Banda alta" value={money(commerce.priceHigh)} /></div><p className="mt-3 text-xs leading-5 text-black/55">{commerce.positioning}</p><p className="mt-2 text-[11px] leading-5 text-black/40">{commerce.evidenceNote}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={applyCommerceCopy} className="rounded-lg bg-white px-3 py-2 text-xs font-black">Aplicar copy</button><button type="button" onClick={applyCommercePrice} className="rounded-lg bg-[#111214] px-3 py-2 text-xs font-black text-[#f5c75d]">Aplicar precio sugerido</button></div></div> : null}

                {marketingOptions.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{marketingOptions.map((option, index) => <article key={`${option.slug}-${index}`} className="rounded-xl border border-black/8 bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em]">Propuesta {index + 1}</span><div className="flex gap-1"><Score value={option.searchPotential} label="SEO" /><Score value={option.salesPotential} label="Venta" /></div></div><h3 className="mt-3 text-base font-black">{option.name}</h3><p className="mt-1 text-xs leading-5 text-black/45">{option.tagline}</p><div className="mt-3 flex flex-wrap gap-1.5">{[option.primaryKeyword, ...option.secondaryKeywords.slice(0, 3)].filter(Boolean).map((keyword) => <span key={keyword} className="rounded-full bg-[#fff0bd] px-2 py-1 text-[9px] font-bold text-[#76500e]">{keyword}</span>)}</div><button type="button" onClick={() => applyMarketing(option)} className="mt-4 w-full rounded-lg bg-[#111214] px-3 py-2.5 text-xs font-black text-white">Aplicar propuesta</button></article>)}</div> : null}

                {imageObservations.length ? <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-sky-800">Lectura visual</p><ul className="mt-2 space-y-1 text-xs leading-5 text-sky-900/70">{imageObservations.slice(0, 5).map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
                {aiWarnings.length ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">Notas del análisis</p><ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900/65">{aiWarnings.slice(0, 5).map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
              </Panel>

              <Panel title="SEO editable" description="La IA puede completarlo, pero el control final siempre queda en el panel.">
                <Field label="Título SEO"><input className={inputClass} maxLength={68} value={seo.title} onChange={(event) => setSeo((current) => ({ ...current, title: event.target.value }))} placeholder={form.name ? `${form.name} | Soluciones Fabrick` : 'Título para buscadores'} /></Field>
                <div className="mt-4"><Field label="Meta descripción"><textarea className={`${inputClass} min-h-24 py-3`} maxLength={165} value={seo.description} onChange={(event) => setSeo((current) => ({ ...current, description: event.target.value }))} /></Field></div>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Slug"><input className={inputClass} value={seo.slug} onChange={(event) => setSeo((current) => ({ ...current, slug: slugify(event.target.value) }))} placeholder={slugify(form.name)} /></Field><Field label="Palabra clave principal"><input className={inputClass} value={seo.primaryKeyword} onChange={(event) => setSeo((current) => ({ ...current, primaryKeyword: event.target.value }))} /></Field></div>
                <div className="mt-4"><Field label="Palabras secundarias"><input className={inputClass} value={seo.secondaryKeywords} onChange={(event) => setSeo((current) => ({ ...current, secondaryKeywords: event.target.value }))} placeholder="separadas por coma" /></Field></div>
              </Panel>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4 2xl:sticky 2xl:top-[118px] 2xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-black/7 px-4 py-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/35">Vista previa</p><p className="mt-0.5 text-xs font-black">Como ficha de catálogo</p></div><Eye className="h-4 w-4 text-black/30" /></div>
            <div className="aspect-[4/3] bg-[#f1ece2] p-4">{cover ? <img src={cover} alt={form.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-black/15"><Package className="h-12 w-12" /></div>}</div>
            <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{form.name || 'Nombre del producto'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9b6b19]">{categoryName}</p></div>{form.featured ? <Star className="h-4 w-4 fill-[#f5c75d] text-[#b67c15]" /> : null}</div><p className="mt-3 line-clamp-3 text-xs leading-5 text-black/45">{form.tagline || form.description || 'Añade una descripción para mejorar la ficha.'}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xl font-black">{money(salePrice)}</p>{discount > 0 ? <p className="text-[10px] text-black/35 line-through">{money(basePrice)}</p> : null}</div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${form.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-black/8 text-black/45'}`}>{form.activo ? 'Activo' : 'Oculto'}</span></div></div>
          </div>

          <div className="rounded-2xl bg-[#111214] p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">Salud de ficha</p><p className="mt-1 text-2xl font-black">{completeness}%</p></div><div className="grid h-12 w-12 place-items-center rounded-xl bg-white/8 text-[#f5c75d]"><Sparkles className="h-5 w-5" /></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#f5c75d] transition-all" style={{ width: `${completeness}%` }} /></div><p className="mt-3 text-xs leading-5 text-white/45">Completa contenido, imagen y SEO antes de publicar para tener una ficha más consistente.</p></div>

          <div className="grid grid-cols-2 gap-2"><MiniMetric label="Stock" value={form.stock || '0'} /><MiniMetric label="Margen" value={margin == null ? '—' : `${margin}%`} /><MiniMetric label="Fotos" value={String(gallery.length)} /><MiniMetric label="SEO" value={seo.primaryKeyword ? 'Listo' : 'Pendiente'} /></div>
        </aside>
      </div>

      <footer className="sticky bottom-0 z-20 mt-auto border-t border-black/8 bg-[#fffaf0]/95 px-4 py-3 backdrop-blur-xl sm:px-6"><div className="flex items-center justify-between gap-3"><p className="hidden text-xs text-black/40 sm:block">{mode === 'create' ? 'Se creará un nuevo producto.' : 'Los cambios se guardan sobre esta ficha.'}</p><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black text-black/55">Cancelar</button><button type="submit" disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-xl bg-[#111214] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{mode === 'create' ? 'Crear producto' : 'Guardar cambios'}</button></div></div></footer>
    </form>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-black/8 bg-[#fffaf0] p-4 shadow-sm sm:p-5"><div className="mb-4"><h3 className="text-base font-black tracking-[-.025em]">{title}</h3><p className="mt-1 text-xs leading-5 text-black/42">{description}</p></div>{children}</section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.13em] text-black/45">{label}{required ? <span className="ml-1 text-[#c27d0c]">*</span> : null}</span>{children}</label>;
}

function ToggleCard({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-black/8 bg-white p-4"><div><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs leading-5 text-black/40">{text}</p></div><Toggle checked={checked} onChange={onChange} label={title} /></div>;
}

function MoneyInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-black/35">$</span><input type="number" min="0" disabled={disabled} className={`${inputClass} pl-8 disabled:bg-black/[0.035] disabled:text-black/45`} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function PercentInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="relative"><input type="number" min="0" max="95" className={`${inputClass} pr-9`} value={value} onChange={(event) => onChange(event.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-black/35">%</span></div>;
}

function MiniMetric({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return <div className={`rounded-xl border p-3 ${dark ? 'border-black bg-[#111214] text-white' : 'border-black/8 bg-white text-[#111214]'}`}><p className={`text-[9px] font-black uppercase tracking-[.13em] ${dark ? 'text-white/35' : 'text-black/35'}`}>{label}</p><p className="mt-1 truncate text-sm font-black">{value}</p></div>;
}

function Score({ value, label }: { value: number; label: string }) {
  return <span className="rounded-lg bg-[#f5efe3] px-2 py-1 text-[9px] font-black text-black/55">{label} {value}</span>;
}
