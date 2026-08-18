'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Facebook,
  ImagePlus,
  Instagram,
  Laptop,
  Loader2,
  PackageSearch,
  Rocket,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Upload,
  WandSparkles,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description?: string;
  tagline?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  category_id?: string;
  supplier_price?: number;
  specifications?: Record<string, unknown> | null;
};

type ProductOption = {
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

type Account = {
  name: string;
  currency: string;
  balance: number;
  amountSpent: number;
  spendCap: number;
  remainingToCap: number | null;
  minDailyBudget: number;
  status: number;
  timezone?: string | null;
  note?: string;
};

type PreviewMode = 'feed-square' | 'feed-landscape' | 'story' | 'reel' | 'mobile' | 'desktop';
type Step = 1 | 2 | 3 | 4 | 5 | 6;

type PublishResult = { adId: string; adLink: string; campaignId: string; adSetId: string };

const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_MONTH = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const MODES: Array<{ id: PreviewMode; label: string }> = [
  { id: 'feed-square', label: 'Feed 1:1' },
  { id: 'feed-landscape', label: 'Feed 1.91:1' },
  { id: 'story', label: 'Stories 9:16' },
  { id: 'reel', label: 'Reels 9:16' },
  { id: 'mobile', label: 'Móvil' },
  { id: 'desktop', label: 'Escritorio' },
];

function money(value: number, currency = 'CLP') {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function gallery(product: Product | null) {
  if (!product) return [] as string[];
  const specs = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications) ? product.specifications : {};
  const result = [product.image_url || '', ...list(specs.gallery_images), ...list(specs.images)];
  if (Array.isArray(specs.gallery_assets)) {
    specs.gallery_assets.forEach((item) => {
      if (item && typeof item === 'object') result.push(String((item as Record<string, unknown>).url || ''));
    });
  }
  return Array.from(new Set(result.map((item) => item.trim()).filter(Boolean)));
}

function Stars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round((Number(value || 60)) / 20)));
  return <span className="inline-flex gap-0.5" title="Estimación editorial de IA, no volumen real ni conversión garantizada">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < stars ? 'fill-[#F5871F] text-[#F5871F]' : 'text-current opacity-20'}`} />)}</span>;
}

function Preview({ mode, image, option }: { mode: PreviewMode; image: string; option: ProductOption }) {
  const vertical = mode === 'story' || mode === 'reel';
  const landscape = mode === 'feed-landscape' || mode === 'desktop';
  const shell = vertical ? 'aspect-[9/16] max-w-[340px]' : landscape ? 'aspect-auto max-w-[760px]' : 'max-w-[430px]';
  const visual = vertical ? 'aspect-[9/16]' : landscape ? 'aspect-[1.91/1]' : 'aspect-square';
  return (
    <div className={`mx-auto w-full overflow-hidden rounded-[1.8rem] bg-white text-[#08090A] shadow-[0_24px_80px_rgba(0,0,0,.24)] ${shell}`}>
      <div className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#08090A] text-[#FFB000]"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-black">Soluciones Fabrick</p><p className="text-[10px] text-[#BFB8AC]">Patrocinado · Meta</p></div></div>
      {!vertical ? <p className="px-4 pb-4 text-sm leading-6 text-[#3F3935]">{option.adPrimaryText}</p> : null}
      <div className={`relative overflow-hidden bg-[#F2DFBB] ${visual}`}>{image ? <img src={image} alt={option.imageAltTexts?.[0] || option.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImagePlus className="h-12 w-12 text-[#F5871F]" /></div>}{vertical ? <><div className="absolute inset-0 bg-gradient-to-t from-[#08090A]/90 via-transparent to-[#08090A]/25" /><div className="absolute inset-x-5 bottom-6 text-white"><p className="text-sm leading-6">{option.adPrimaryText}</p><h3 className="mt-4 text-2xl font-black leading-tight">{option.adHeadline}</h3><button type="button" className="mt-5 w-full rounded-full bg-[#FFF9EE] px-5 py-3 text-xs font-black text-[#08090A]">{option.callToAction}</button></div></> : null}</div>
      {!vertical ? <><div className="flex items-center justify-between gap-4 bg-[#FFF9EE] p-4"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">solucionesfabrick.com</p><h3 className="mt-1 text-base font-black">{option.adHeadline}</h3><p className="mt-1 text-xs text-[#BFB8AC]">{option.adDescription}</p></div><button type="button" className="shrink-0 rounded-xl bg-[#08090A] px-4 py-3 text-[10px] font-black text-white">{option.callToAction}</button></div><div className="flex items-center justify-between px-4 py-3 text-[#BFB8AC]"><span className="text-[10px]"><Facebook className="mr-1 inline h-3.5 w-3.5" /> Me gusta · Comentar · Compartir</span><Instagram className="h-4 w-4" /></div></> : null}
    </div>
  );
}

export default function UnifiedMetaAdFunnel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('manual');
  const [manual, setManual] = useState({ name: '', description: '', category: '', price: '', cost: '' });
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [mode, setMode] = useState<PreviewMode>('feed-square');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [campaign, setCampaign] = useState({ objective: 'sales', location: 'chile', ageMin: '25', ageMax: '55', budget: '10000', start: TODAY, end: NEXT_MONTH, destinationUrl: '' });

  useEffect(() => {
    void Promise.all([
      fetch('/api/admin/products', { cache: 'no-store' }).then((response) => response.json()).then((json) => setProducts(json.products || [])).catch(() => setMessage('No se pudo cargar el catálogo.')),
      fetch('/api/meta/account', { cache: 'no-store' }).then((response) => response.json()).then((json) => { if (json.account) setAccount(json.account); }).catch(() => undefined),
    ]);
  }, []);

  const selectedProduct = products.find((item) => item.id === selectedId) || null;
  const productImages = useMemo(() => gallery(selectedProduct), [selectedProduct]);
  const filtered = useMemo(() => products.filter((product) => !query.trim() || `${product.name} ${product.description || ''} ${product.category_id || ''}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const option = options[selectedOption] || null;
  const activeName = selectedProduct?.name || manual.name;
  const activeDescription = selectedProduct?.description || manual.description;
  const activeCategory = selectedProduct?.category_id || manual.category;
  const activePrice = Number(selectedProduct?.price || manual.price || 0);
  const activeCost = Number(selectedProduct?.supplier_price || manual.cost || 0);
  const grossMargin = activePrice > 0 && activeCost > 0 ? ((activePrice - activeCost) / activePrice) * 100 : null;
  const availableForCampaign = account?.remainingToCap ?? null;

  useEffect(() => {
    const first = uploadedPreview || productImages[0] || '';
    setSelectedImage(first);
    if (selectedProduct) setCampaign((current) => ({ ...current, destinationUrl: `https://www.solucionesfabrick.com/producto/${selectedProduct.id}` }));
  }, [selectedId, uploadedPreview, productImages, selectedProduct]);

  function chooseFile(file?: File) {
    if (!file?.type.startsWith('image/')) return;
    if (uploadedPreview.startsWith('blob:')) URL.revokeObjectURL(uploadedPreview);
    setUploadedImage(file);
    const next = URL.createObjectURL(file);
    setUploadedPreview(next);
    setSelectedImage(next);
  }

  async function analyze() {
    if (!activeName.trim()) return setMessage('Selecciona un producto o escribe uno nuevo.');
    setLoading(true); setProgress(10); setMessage('Analizando producto, imágenes, nicho, palabras clave y posibilidad comercial…');
    const timer = window.setInterval(() => setProgress((value) => value >= 92 ? value : value + Math.max(1, Math.round((94 - value) / 7))), 420);
    try {
      const response = await fetch('/api/admin/products/ai-marketing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          product: { id: selectedProduct?.id, name: activeName, description: activeDescription, category: activeCategory, price: activePrice, stock: selectedProduct?.stock, specifications: selectedProduct?.specifications },
          imageUrls: productImages.slice(0, 8),
          goal: 'Crear una ficha SEO y un anuncio funcional para Meta siguiendo un embudo de venta',
          location: 'Chile',
        }),
      });
      const json = await response.json() as { options?: ProductOption[]; warnings?: string[]; error?: string };
      if (!response.ok || !json.options?.length) throw new Error(json.error || 'No se pudo generar el análisis.');
      setOptions(json.options); setSelectedOption(0); setProgress(100); setStep(3);
      setMessage(json.warnings?.[0] || 'Análisis listo. Elige una propuesta y continúa con la previsualización.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo analizar el producto.'); }
    finally { window.clearInterval(timer); setLoading(false); window.setTimeout(() => setProgress(0), 700); }
  }

  function patchOption(patch: Partial<ProductOption>) {
    setOptions((current) => current.map((item, index) => index === selectedOption ? { ...item, ...patch } : item));
  }

  async function publish() {
    if (!option || !selectedImage) return setMessage('Falta una propuesta o una imagen para publicar.');
    const budget = Number(campaign.budget || 0);
    if (!budget) return setMessage('Define el presupuesto diario.');
    setLoading(true); setProgress(10); setMessage('Preparando el creativo y enviándolo a Meta…');
    try {
      let uploadResponse: Response;
      if (uploadedImage) {
        const data = new FormData(); data.append('image', uploadedImage);
        uploadResponse = await fetch('/api/meta/upload', { method: 'POST', body: data });
      } else {
        uploadResponse = await fetch('/api/meta/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: selectedImage, fileName: `${option.slug || 'producto'}.jpg` }) });
      }
      const uploadJson = await uploadResponse.json() as { hash?: string; error?: string };
      if (!uploadResponse.ok || !uploadJson.hash) throw new Error(uploadJson.error || 'No se pudo subir la imagen a Meta.');
      setProgress(55); setMessage('Creando campaña, conjunto y anuncio…');
      const response = await fetch('/api/meta/ads/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          titulo: option.adHeadline.slice(0, 40), texto: option.adPrimaryText.slice(0, 125), urlDestino: campaign.destinationUrl || 'https://www.solucionesfabrick.com/tienda', presupuestoCLP: budget, fechaInicio: campaign.start, fechaFin: campaign.end, ubicacion: campaign.location, edadMin: Number(campaign.ageMin), edadMax: Number(campaign.ageMax), imageHash: uploadJson.hash,
        }),
      });
      const json = await response.json() as { data?: PublishResult; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || 'Meta no pudo crear el anuncio.');
      setPublishResult(json.data); setProgress(100); setStep(6); setMessage('Anuncio funcional publicado en Meta.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo publicar el anuncio.'); }
    finally { setLoading(false); window.setTimeout(() => setProgress(0), 700); }
  }

  const steps = ['Producto', 'Análisis', 'Propuesta', 'Formatos', 'Presupuesto', 'Resultado'];

  return (
    <main className="min-h-screen bg-[#08090A] px-4 py-8 text-[#FFF9EE] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2.5rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.22),transparent_30rem),linear-gradient(145deg,#1A1B1F,#08090A)] p-6 shadow-2xl sm:p-8">
          <Link href="/admin/publicidad" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#FFB000]"><ArrowLeft className="h-3.5 w-3.5" /> Volver a Publicidad</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-[#F2DFBB]"><Rocket className="h-3.5 w-3.5" /> Embudo de anuncios Meta</span><h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">Del producto al anuncio funcional, en un solo recorrido.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#CFC3BA]">Selecciona o escribe un producto, analiza su nicho, genera SEO y copy, revisa seis formatos, define inversión y publica únicamente cuando todo esté listo.</p></div>{account ? <div className="min-w-[290px] rounded-[1.8rem] bg-[#FFF9EE] p-5 text-[#08090A]"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Saldo informado por Meta</p><strong className="mt-2 block text-3xl font-black">{money(account.balance, account.currency)}</strong><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white p-3"><span className="block text-[8px] uppercase text-[#BFB8AC]">Gastado</span><b>{money(account.amountSpent, account.currency)}</b></div><div className="rounded-xl bg-white p-3"><span className="block text-[8px] uppercase text-[#BFB8AC]">Margen al límite</span><b>{availableForCampaign == null ? 'Sin límite' : money(availableForCampaign, account.currency)}</b></div></div><p className="mt-3 text-[9px] leading-5 text-[#BFB8AC]">{account.note}</p></div> : null}</div>
        </header>

        <nav className="mt-5 grid grid-cols-2 gap-2 rounded-[1.8rem] bg-white/6 p-2 sm:grid-cols-3 lg:grid-cols-6">{steps.map((label, index) => { const number = index + 1; const active = step === number; const done = step > number; return <button key={label} type="button" onClick={() => number <= Math.max(step, 3) && setStep(number as Step)} className={`rounded-2xl px-3 py-3 text-left transition ${active ? 'bg-[#F5871F] text-[#08090A]' : done ? 'bg-white/12 text-white' : 'text-white/35'}`}><span className="text-[8px] font-black uppercase tracking-[.15em]">Paso {number}</span><b className="mt-1 block text-xs">{label}</b></button>; })}</nav>

        {message ? <div className="mt-5 rounded-2xl bg-white/7 px-5 py-4 text-xs leading-6 text-white/65">{message}</div> : null}
        {loading && progress ? <div className="mt-4"><div className="flex justify-between text-[9px] font-black uppercase tracking-[.14em] text-[#FFB000]"><span>Procesando</span><span>{progress}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-[#F5871F] transition-all" style={{ width: `${progress}%` }} /></div></div> : null}

        {(step === 1 || step === 2) ? <section className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <aside className="rounded-[2rem] bg-white/6 p-5 sm:p-6"><div className="flex gap-2"><button type="button" onClick={() => setSelectedId('manual')} className={`flex-1 rounded-2xl px-4 py-3 text-xs font-black ${selectedId === 'manual' ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/7'}`}>Escribir producto</button><button type="button" onClick={() => setSelectedId(products[0]?.id || 'manual')} className={`flex-1 rounded-2xl px-4 py-3 text-xs font-black ${selectedId !== 'manual' ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/7'}`}>Elegir catálogo</button></div>{selectedId === 'manual' ? <div className="mt-5 grid gap-3"><input value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} placeholder="Nombre del producto" className="rounded-2xl bg-white/8 px-4 py-3 text-sm outline-none" /><textarea value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} rows={4} placeholder="Descripción actual o idea del producto" className="rounded-2xl bg-white/8 px-4 py-3 text-sm outline-none" /><input value={manual.category} onChange={(event) => setManual({ ...manual, category: event.target.value })} placeholder="Nicho o categoría" className="rounded-2xl bg-white/8 px-4 py-3 text-sm outline-none" /><div className="grid grid-cols-2 gap-3"><input value={manual.price} onChange={(event) => setManual({ ...manual, price: event.target.value })} placeholder="Precio" className="rounded-2xl bg-white/8 px-4 py-3 text-sm outline-none" /><input value={manual.cost} onChange={(event) => setManual({ ...manual, cost: event.target.value })} placeholder="Costo" className="rounded-2xl bg-white/8 px-4 py-3 text-sm outline-none" /></div></div> : <><label className="mt-5 flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3"><Search className="h-4 w-4 text-[#FFB000]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{filtered.map((product) => <button key={product.id} type="button" onClick={() => setSelectedId(product.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selectedId === product.id ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/6'}`}><span className="h-14 w-14 overflow-hidden rounded-xl bg-white/10">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{product.name}</b><span className="text-[10px] opacity-60">{money(product.price || 0)} · stock {product.stock ?? 0}</span></span><ChevronRight className="h-4 w-4" /></button>)}</div></>}</aside>
          <article className="rounded-[2rem] bg-[#FFF9EE] p-5 text-[#08090A] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Producto del embudo</p><h2 className="mt-2 text-2xl font-black">{activeName || 'Define el producto'}</h2><p className="mt-2 text-xs leading-6 text-[#BFB8AC]">{activeDescription || 'La IA usará esta información junto con las imágenes para construir el anuncio.'}</p></div><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-[#08090A] px-4 py-3 text-xs font-black text-white"><Upload className="h-4 w-4 text-[#FFB000]" /> Imagen</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[uploadedPreview, ...productImages].filter(Boolean).slice(0, 8).map((image) => <button key={image} type="button" onClick={() => setSelectedImage(image)} className={`aspect-square overflow-hidden rounded-2xl bg-[#F2DFBB] ${selectedImage === image ? 'ring-4 ring-[#F5871F]' : ''}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Precio</span><b className="mt-1 block">{money(activePrice)}</b></div><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Costo</span><b className="mt-1 block">{activeCost ? money(activeCost) : 'No informado'}</b></div><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Margen bruto</span><b className="mt-1 block">{grossMargin == null ? 'Sin datos' : `${grossMargin.toFixed(1)}%`}</b></div></div><button type="button" onClick={() => { setStep(2); void analyze(); }} disabled={loading} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F5871F] px-5 text-sm font-black disabled:opacity-45">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />} Analizar demanda, SEO y venta</button></article>
        </section> : null}

        {step === 3 && option ? <section className="mt-6 grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><div className="space-y-3">{options.map((item, index) => <button key={`${item.slug}-${index}`} type="button" onClick={() => setSelectedOption(index)} className={`w-full rounded-[1.7rem] p-5 text-left ${selectedOption === index ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/7'}`}><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.15em] opacity-60">Propuesta {index + 1}</p><h3 className="mt-2 text-lg font-black">{item.name}</h3></div><Stars value={item.salesPotential} /></div><p className="mt-3 text-xs leading-6 opacity-70">{item.shortDescription}</p></button>)}</div><article className="rounded-[2rem] bg-[#FFF9EE] p-6 text-[#08090A]"><div className="grid gap-4 lg:grid-cols-2"><div><label className="text-[9px] font-black uppercase text-[#F5871F]">Título llamativo</label><input value={option.adHeadline} onChange={(event) => patchOption({ adHeadline: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold outline-none" /></div><div><label className="text-[9px] font-black uppercase text-[#F5871F]">CTA</label><input value={option.callToAction} onChange={(event) => patchOption({ callToAction: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold outline-none" /></div></div><label className="mt-4 block text-[9px] font-black uppercase text-[#F5871F]">Texto principal</label><textarea value={option.adPrimaryText} onChange={(event) => patchOption({ adPrimaryText: event.target.value })} rows={5} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm leading-7 outline-none" /><div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase text-[#F5871F]">Demanda estimada IA</p><strong className="mt-2 block text-2xl">{option.searchPotential}%</strong><Stars value={option.searchPotential} /><p className="mt-2 text-[9px] leading-5 text-[#BFB8AC]">No es volumen real de Google.</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase text-[#F5871F]">Posibilidad de venta</p><strong className="mt-2 block text-2xl">{option.salesPotential}%</strong><Stars value={option.salesPotential} /><p className="mt-2 text-[9px] leading-5 text-[#BFB8AC]">Estimación editorial, no garantía.</p></div><div className="rounded-2xl bg-[#08090A] p-4 text-white"><p className="text-[9px] font-black uppercase text-[#FFB000]">Rentabilidad</p><strong className="mt-2 block text-2xl">{grossMargin == null ? 'Sin costo' : `${grossMargin.toFixed(1)}%`}</strong><p className="mt-2 text-[9px] leading-5 text-white/55">Margen bruto antes de anuncios, despacho e impuestos.</p></div></div><div className="mt-5 rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase text-[#F5871F]">SEO y palabras clave</p><h4 className="mt-2 font-black">{option.seoTitle}</h4><p className="mt-2 text-xs leading-6 text-[#BFB8AC]">{option.seoDescription}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#08090A] px-3 py-1.5 text-[9px] font-black text-white">{option.primaryKeyword}</span>{[...option.secondaryKeywords, ...option.longTailKeywords, ...option.commercialKeywords].slice(0, 10).map((keyword) => <span key={keyword} className="rounded-full bg-[#F2DFBB] px-3 py-1.5 text-[9px] font-black">{keyword}</span>)}</div></div><button type="button" onClick={() => setStep(4)} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-5 text-sm font-black text-white">Continuar a formatos <ChevronRight className="h-4 w-4 text-[#FFB000]" /></button></article></section> : null}

        {step === 4 && option ? <section className="mt-6 grid gap-6 xl:grid-cols-[270px_1fr]"><aside className="rounded-[2rem] bg-white/7 p-5"><h2 className="font-black">Ubicaciones y tamaños</h2><p className="mt-2 text-xs leading-6 text-white/45">Comprueba el mismo anuncio en seis presentaciones antes de invertir.</p><div className="mt-5 grid gap-2">{MODES.map((item) => <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-xs font-black ${mode === item.id ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/7'}`}>{item.label}{item.id.includes('mobile') || item.id.includes('story') || item.id.includes('reel') ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}</button>)}</div><button type="button" onClick={() => setStep(5)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFF9EE] px-4 text-xs font-black text-[#08090A]">Definir inversión <ChevronRight className="h-4 w-4" /></button></aside><div className="rounded-[2rem] bg-[#FFF9EE] p-5 text-[#08090A] sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Previsualización</p><h2 className="mt-1 text-2xl font-black">{MODES.find((item) => item.id === mode)?.label}</h2></div><Eye className="h-5 w-5 text-[#F5871F]" /></div><Preview mode={mode} image={selectedImage} option={option} /></div></section> : null}

        {step === 5 && option ? <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]"><article className="rounded-[2rem] bg-[#FFF9EE] p-6 text-[#08090A]"><h2 className="text-2xl font-black">Configuración final de Meta</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Presupuesto diario<input type="number" min="1000" value={campaign.budget} onChange={(event) => setCampaign({ ...campaign, budget: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label><label className="text-xs font-bold">Destino<input value={campaign.destinationUrl} onChange={(event) => setCampaign({ ...campaign, destinationUrl: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label><label className="text-xs font-bold">Fecha inicio<input type="date" value={campaign.start} onChange={(event) => setCampaign({ ...campaign, start: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label><label className="text-xs font-bold">Fecha término<input type="date" value={campaign.end} onChange={(event) => setCampaign({ ...campaign, end: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label><label className="text-xs font-bold">Edad mínima<input type="number" value={campaign.ageMin} onChange={(event) => setCampaign({ ...campaign, ageMin: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label><label className="text-xs font-bold">Edad máxima<input type="number" value={campaign.ageMax} onChange={(event) => setCampaign({ ...campaign, ageMax: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none" /></label></div><button type="button" onClick={() => void publish()} disabled={loading} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-5 text-sm font-black text-white disabled:opacity-45">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5 text-[#FFB000]" />} Ir a publicar como anuncio en Meta</button></article><aside className="rounded-[2rem] bg-white/7 p-6"><CircleDollarSign className="h-8 w-8 text-[#FFB000]" /><h2 className="mt-4 text-2xl font-black">Control de inversión</h2><div className="mt-5 space-y-3"><div className="rounded-2xl bg-white/7 p-4"><span className="text-[9px] uppercase text-white/45">Saldo informado</span><b className="mt-1 block text-xl">{account ? money(account.balance, account.currency) : 'No disponible'}</b></div><div className="rounded-2xl bg-white/7 p-4"><span className="text-[9px] uppercase text-white/45">Presupuesto diario</span><b className="mt-1 block text-xl">{money(Number(campaign.budget || 0), account?.currency || 'CLP')}</b></div><div className="rounded-2xl bg-white/7 p-4"><span className="text-[9px] uppercase text-white/45">Inversión estimada del período</span><b className="mt-1 block text-xl">{money(Number(campaign.budget || 0) * Math.max(1, Math.ceil((new Date(campaign.end).getTime() - new Date(campaign.start).getTime()) / 86400000)), account?.currency || 'CLP')}</b></div></div><p className="mt-4 text-[10px] leading-6 text-white/45">Meta puede informar balance como deuda, crédito o prepago. La publicación utiliza el método de pago y reglas reales configuradas en tu cuenta.</p></aside></section> : null}

        {step === 6 ? <section className="mt-6 rounded-[2.4rem] bg-[#FFF9EE] p-8 text-center text-[#08090A]"><Check className="mx-auto h-12 w-12 text-[#F5871F]" /><h2 className="mt-5 text-3xl font-black">Anuncio creado correctamente</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#BFB8AC]">El producto recorrió análisis, copy, SEO, formatos, inversión y publicación. Revisa Meta para confirmar entrega y estado.</p>{publishResult ? <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Campaña</span><b className="mt-1 block text-xs">{publishResult.campaignId}</b></div><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Conjunto</span><b className="mt-1 block text-xs">{publishResult.adSetId}</b></div><div className="rounded-2xl bg-white p-4"><span className="text-[8px] uppercase text-[#BFB8AC]">Anuncio</span><b className="mt-1 block text-xs">{publishResult.adId}</b></div></div> : null}<div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/admin/publicidad/anuncios" className="rounded-full bg-[#08090A] px-6 py-3 text-xs font-black text-white">Configurar anuncio</Link><Link href="/admin/publicidad" className="rounded-full bg-[#F5871F] px-6 py-3 text-xs font-black">Ver métricas</Link></div></section> : null}
      </div>
    </main>
  );
}
