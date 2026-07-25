'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  PackageSearch,
  Search,
  Sparkles,
  Star,
  Upload,
  WandSparkles,
} from 'lucide-react';

type GalleryAsset = { url: string; public_id?: string; source?: string };
type Product = {
  id: string;
  name: string;
  description?: string;
  tagline?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  category_id?: string;
  specifications?: Record<string, unknown> | null;
};

type Option = {
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

type AiResult = { options: Option[]; imageObservations?: string[]; warnings?: string[]; source?: string };

function productGallery(product: Product | null) {
  if (!product) return [] as GalleryAsset[];
  const specs = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications) ? product.specifications : {};
  const assets = Array.isArray(specs.gallery_assets) ? specs.gallery_assets : [];
  const urls = Array.isArray(specs.gallery_images) ? specs.gallery_images : [];
  const result: GalleryAsset[] = [];
  if (product.image_url) result.push({ url: product.image_url, source: 'cover' });
  assets.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const url = String(row.url || row.secure_url || '').trim();
    if (url) result.push({ url, public_id: String(row.public_id || '').trim() || undefined, source: String(row.source || 'cloudinary') });
  });
  urls.forEach((item) => { const url = String(item || '').trim(); if (url) result.push({ url, source: 'legacy' }); });
  return result.filter((asset, index, all) => all.findIndex((candidate) => candidate.url === asset.url) === index);
}

function Stars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round((value || 60) / 20)));
  return <span className="inline-flex gap-0.5" title="Estimación editorial de IA, no volumen real de búsquedas ni conversión garantizada">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < stars ? 'fill-[#B6906C] text-[#B6906C]' : 'text-[#171820]/15'}`} />)}</span>;
}

function money(value?: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function ProductPromotionStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [uploaded, setUploaded] = useState<GalleryAsset[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [rewriteProduct, setRewriteProduct] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/admin/products', { cache: 'no-store' });
        const json = await response.json() as { products?: Product[]; error?: string };
        if (!response.ok) throw new Error(json.error || 'No se pudieron cargar los productos.');
        setProducts(json.products || []);
        setSelectedId(json.products?.[0]?.id || '');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los productos.');
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const selectedProduct = products.find((product) => product.id === selectedId) || null;
  const existingGallery = useMemo(() => productGallery(selectedProduct), [selectedProduct]);
  const allImages = useMemo(() => [...existingGallery, ...uploaded].filter((asset, index, all) => all.findIndex((candidate) => candidate.url === asset.url) === index), [existingGallery, uploaded]);
  const option = result?.options?.[selectedOption] || null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => !normalized || `${product.name} ${product.description || ''} ${product.category_id || ''}`.toLowerCase().includes(normalized));
  }, [products, query]);

  useEffect(() => {
    setUploaded([]);
    setResult(null);
    setCoverUrl(productGallery(selectedProduct)[0]?.url || '');
  }, [selectedId]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || !selectedProduct) return;
    setUploading(true);
    setMessage('Subiendo imágenes adicionales a Cloudinary…');
    setProgress(5);
    const next: GalleryAsset[] = [];
    try {
      const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 10);
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const data = new FormData();
        data.append('file', selectedFiles[index]);
        data.append('folder', `fabrick/productos/promocion/${selectedProduct.id}`);
        const response = await fetch('/api/admin/cloudinary', { method: 'POST', body: data });
        const json = await response.json() as { asset?: GalleryAsset; url?: string; error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo subir ${selectedFiles[index].name}.`);
        const asset = json.asset || (json.url ? { url: json.url, source: 'cloudinary' } : null);
        if (asset?.url) next.push(asset);
        setProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
      }
      setUploaded((current) => [...current, ...next].filter((asset, index, all) => all.findIndex((candidate) => candidate.url === asset.url) === index));
      setCoverUrl((current) => current || next[0]?.url || '');
      setMessage(`${next.length} imágenes añadidas. Ahora puedes analizarlas con la IA antes de guardar la ficha.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron subir las imágenes.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function analyze() {
    if (!selectedProduct) return setMessage('Selecciona un producto.');
    setAnalyzing(true);
    setResult(null);
    setProgress(10);
    setMessage('La IA está leyendo el producto, el nicho y las imágenes…');
    const timer = window.setInterval(() => setProgress((current) => current >= 92 ? current : current + Math.max(1, Math.round((94 - current) / 7))), 450);
    try {
      const response = await fetch('/api/admin/products/ai-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            tagline: selectedProduct.tagline,
            category: selectedProduct.category_id,
            price: selectedProduct.price,
            stock: selectedProduct.stock,
            specifications: selectedProduct.specifications,
          },
          imageUrls: allImages.map((asset) => asset.url).slice(0, 8),
          goal: 'Promocionar el producto, mejorar su ficha de ecommerce y organizar su SEO según el nicho',
          location: 'Chile',
        }),
      });
      const json = await response.json() as AiResult & { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo analizar el producto.');
      setResult(json);
      setSelectedOption(0);
      setProgress(100);
      setMessage(json.warnings?.[0] || 'La IA generó dos alternativas. Revisa la ficha, el SEO y el anuncio antes de guardar.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo analizar el producto.');
    } finally {
      window.clearInterval(timer);
      setAnalyzing(false);
      window.setTimeout(() => setProgress(0), 600);
    }
  }

  function patchOption(patch: Partial<Option>) {
    if (!result) return;
    setResult({ ...result, options: result.options.map((item, index) => index === selectedOption ? { ...item, ...patch } : item) });
  }

  async function save() {
    if (!selectedProduct || !option) return;
    setSaving(true);
    setMessage('Guardando imágenes, SEO, ficha y copy comercial…');
    try {
      const response = await fetch('/api/admin/products/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, rewrite: option, galleryAssets: uploaded, coverUrl: coverUrl || allImages[0]?.url, rewriteProduct }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo actualizar el producto.');
      setMessage('Producto actualizado. La tienda conserva la galería y ahora tiene contenido comercial y SEO organizado por nicho.');
      setProducts((current) => current.map((product) => product.id === selectedProduct.id ? {
        ...product,
        name: rewriteProduct ? option.name : product.name,
        tagline: rewriteProduct ? option.tagline : product.tagline,
        description: rewriteProduct ? option.longDescription : product.description,
        image_url: coverUrl || product.image_url,
      } : product));
      setUploaded([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la propuesta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-[#171820] px-4 pt-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[2.4rem] bg-[radial-gradient(circle_at_90%_0%,rgba(204,177,150,.2),transparent_28rem),linear-gradient(145deg,#242630,#171820)] p-5 shadow-2xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#B6906C]/18 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#E5CFBA]"><PackageSearch className="h-3.5 w-3.5" /> Promocionar producto del catálogo</span>
            <h2 className="mt-4 text-3xl font-black tracking-[-.05em] sm:text-5xl">Elige un producto, amplía sus imágenes y reescribe su venta.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">La IA separa ficha de tienda, estructura SEO y anuncio. Puedes conservar el nombre actual o aplicar una reescritura completa después de revisar dos opciones.</p>

            <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3"><Search className="h-4 w-4 text-[#CCB196]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {loadingProducts ? <div className="grid h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#CCB196]" /></div> : filtered.map((product) => (
                <button key={product.id} type="button" onClick={() => setSelectedId(product.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === product.id ? 'bg-[#B6906C] text-[#171820]' : 'bg-white/6 text-white hover:bg-white/10'}`}>
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Images className="m-4 h-6 w-6 opacity-40" />}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm">{product.name}</b><span className="mt-1 block text-[10px] opacity-60">{money(product.price)} · stock {product.stock ?? 0}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] sm:p-6">
            {selectedProduct ? <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#895E3D]">Producto seleccionado</p><h3 className="mt-2 text-2xl font-black">{selectedProduct.name}</h3><p className="mt-2 text-xs text-[#756B63]">{existingGallery.length} imágenes actuales · {uploaded.length} nuevas</p></div><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171820] px-5 text-xs font-black text-white"><ImagePlus className="h-4 w-4 text-[#CCB196]" /> Añadir imágenes</button><input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => void uploadFiles(event.target.files)} /></div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {allImages.slice(0, 8).map((asset, index) => <button key={asset.url} type="button" onClick={() => setCoverUrl(asset.url)} className={`relative aspect-square overflow-hidden rounded-2xl bg-[#E6D4C3] ${coverUrl === asset.url ? 'ring-4 ring-[#B6906C]' : ''}`}><img src={asset.url} alt={`Vista ${index + 1}`} className="h-full w-full object-cover" />{coverUrl === asset.url ? <span className="absolute left-2 top-2 rounded-full bg-[#171820] px-2 py-1 text-[8px] font-black text-white">Portada</span> : null}</button>)}
                {!allImages.length ? <button type="button" onClick={() => inputRef.current?.click()} className="col-span-2 grid min-h-40 place-items-center rounded-2xl bg-[#E6D4C3] text-[#895E3D] sm:col-span-4"><span><Upload className="mx-auto h-6 w-6" /><b className="mt-2 block text-xs">Subir imágenes del producto</b></span></button> : null}
              </div>

              {(uploading || analyzing) && progress > 0 ? <div className="mt-4"><div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]"><span>{uploading ? 'Subiendo imágenes' : 'Analizando producto'}</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E6D4C3]"><span className="block h-full rounded-full bg-[#B6906C] transition-all" style={{ width: `${progress}%` }} /></div></div> : null}

              <button type="button" onClick={() => void analyze()} disabled={analyzing || uploading} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#B6906C] px-5 text-sm font-black text-[#171820] disabled:opacity-45">{analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}{analyzing ? 'Analizando nicho e imágenes…' : 'Generar 2 reescrituras con IA'}</button>
            </> : <div className="grid min-h-96 place-items-center text-center"><div><Sparkles className="mx-auto h-10 w-10 text-[#895E3D]" /><p className="mt-4 font-black">Selecciona un producto para comenzar</p></div></div>}
          </div>
        </div>

        {message ? <p className="mt-5 rounded-2xl bg-white/7 px-4 py-3 text-xs leading-6 text-white/65">{message}</p> : null}

        {result && option ? <div className="mt-6 grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
          <div className="space-y-3">{result.options.map((item, index) => <button key={`${item.slug}-${index}`} type="button" onClick={() => setSelectedOption(index)} className={`w-full rounded-[1.6rem] p-5 text-left ${selectedOption === index ? 'bg-[#B6906C] text-[#171820]' : 'bg-white/7 text-white'}`}><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] opacity-60">Opción {index + 1}</p><h3 className="mt-2 text-lg font-black">{item.name}</h3></div><div className="text-right"><Stars value={item.salesPotential} /><p className="mt-1 text-[8px] opacity-55">Venta estimada {item.salesPotential}%</p></div></div><p className="mt-3 text-xs leading-6 opacity-70">{item.shortDescription}</p></button>)}</div>

          <article className="rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] sm:p-7">
            <div className="grid gap-5 lg:grid-cols-2">
              <div><label className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Nombre del producto</label><input value={option.name} onChange={(event) => patchOption({ name: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold outline-none" /></div>
              <div><label className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Frase comercial</label><input value={option.tagline} onChange={(event) => patchOption({ tagline: event.target.value })} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold outline-none" /></div>
            </div>
            <label className="mt-5 block text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Descripción larga para la tienda</label><textarea value={option.longDescription} onChange={(event) => patchOption({ longDescription: event.target.value })} rows={6} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm leading-7 outline-none" />

            <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">SEO del producto</p><h4 className="mt-2 font-black">{option.seoTitle}</h4><p className="mt-2 text-xs leading-6 text-[#756B63]">{option.seoDescription}</p><div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-full bg-[#171820] px-3 py-1 text-[8px] font-black text-white">{option.primaryKeyword}</span>{option.secondaryKeywords.slice(0, 6).map((keyword) => <span key={keyword} className="rounded-full bg-[#E6D4C3] px-3 py-1 text-[8px] font-black">{keyword}</span>)}</div><div className="mt-4 flex items-center justify-between"><span className="text-[9px] font-bold text-[#756B63]">Potencial de búsqueda estimado</span><span className="flex items-center gap-2"><Stars value={option.searchPotential} /><b className="text-xs">{option.searchPotential}%</b></span></div></div>
              <div className="rounded-2xl bg-[#171820] p-4 text-white"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#CCB196]">Anuncio sugerido</p><h4 className="mt-2 text-lg font-black">{option.adHeadline}</h4><p className="mt-3 text-xs leading-6 text-white/65">{option.adPrimaryText}</p><p className="mt-3 text-[10px] text-[#CCB196]">{option.adDescription}</p><span className="mt-4 inline-flex rounded-full bg-[#B6906C] px-4 py-2 text-[9px] font-black text-[#171820]">{option.callToAction}</span></div></div>

            <div className="mt-5 rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Ideas para crear más imágenes</p><div className="mt-3 grid gap-2">{option.visualPrompts.map((prompt) => <p key={prompt} className="rounded-xl bg-[#F8F0E9] px-3 py-2 text-xs leading-5 text-[#5E5148]">{prompt}</p>)}</div></div>

            <label className="mt-5 flex items-center gap-3 text-xs font-bold text-[#5E5148]"><input type="checkbox" checked={rewriteProduct} onChange={(event) => setRewriteProduct(event.target.checked)} className="h-4 w-4 accent-[#B6906C]" /> Reescribir también nombre, frase y descripción pública del producto</label>
            <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-white disabled:opacity-45">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 text-[#CCB196]" />}{saving ? 'Guardando producto…' : 'Aplicar opción y guardar producto'}</button>
          </article>
        </div> : null}
      </div>
    </section>
  );
}
