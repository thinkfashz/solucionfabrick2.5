'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, ExternalLink, Globe2, ImagePlus, Loader2, RefreshCw, Search, Sparkles, WandSparkles, X } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  image_url?: string | null;
  sku?: string | null;
};

type Mode = 'generate' | 'improve';
type ReferenceImage = {
  key: string;
  url: string;
  title: string;
  price: number | null;
  currency: string | null;
  source: string;
  link: string;
};

export default function ProductAiImageDock() {
  const pathname = usePathname();
  const visible = pathname === '/admin/productos';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<Mode>('generate');
  const [instructions, setInstructions] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [result, setResult] = useState<{ url: string; candidates: Array<{ url: string }>; model?: string; cost_usd?: number | null } | null>(null);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [applyingUrl, setApplyingUrl] = useState('');

  const selected = useMemo(() => products.find((product) => product.id === selectedId) || null, [products, selectedId]);

  async function loadProducts() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: Product[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el catálogo.');
      const rows = Array.isArray(json.products) ? json.products : [];
      setProducts(rows);
      const fromEditor = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('studio') || '' : '';
      const preferred = fromEditor !== 'new' && rows.some((item) => item.id === fromEditor) ? fromEditor : selectedId || rows[0]?.id || '';
      setSelectedId(preferred);
      const product = rows.find((item) => item.id === preferred);
      setMode(product?.image_url ? 'improve' : 'generate');
      if (!referenceQuery) setReferenceQuery(product?.name || '');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && visible) void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible]);

  useEffect(() => {
    if (!selected) return;
    if (!selected.image_url && mode === 'improve') setMode('generate');
    setResult(null);
    setMessage(null);
    setReferenceImages([]);
    setSelectedReferences([]);
    setReferenceQuery(selected.name);
  }, [selectedId]);

  if (!visible) return null;

  async function searchReferenceImages() {
    const query = referenceQuery.trim() || selected?.name || '';
    if (!query) return;
    setReferenceBusy(true);
    setMessage({ type: 'info', text: 'Buscando referencias visuales online…' });
    try {
      const response = await fetch('/api/admin/market-intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, sources: ['mercadolibre', 'serper', 'serpapi'], site: 'MLC', persist: false, useCache: true, limitPerSource: 12 }),
      });
      const json = await response.json().catch(() => ({})) as {
        snapshot?: { refs?: Array<{ source?: string; sourceId?: string | null; title?: string; price?: number | null; currency?: string | null; url?: string; image?: string | null }> };
        error?: string;
      };
      if (!response.ok || !json.snapshot) throw new Error(json.error || 'No se pudieron buscar referencias.');
      const refs = (json.snapshot.refs || []).filter((ref) => typeof ref.image === 'string' && /^https:\/\//i.test(ref.image));
      const next = refs.map((ref, index) => ({
        key: `${ref.source || 'web'}:${ref.sourceId || ref.url || index}`,
        url: String(ref.image),
        title: String(ref.title || 'Referencia visual'),
        price: typeof ref.price === 'number' ? ref.price : null,
        currency: ref.currency || null,
        source: String(ref.source || 'web'),
        link: String(ref.url || ''),
      })).slice(0, 18);
      setReferenceImages(next);
      setSelectedReferences([]);
      setMessage({ type: 'ok', text: `${next.length} imágenes de referencia encontradas. Selecciona hasta 3 que correspondan realmente al producto.` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudieron buscar referencias.' });
    } finally {
      setReferenceBusy(false);
    }
  }

  function toggleReference(url: string) {
    setSelectedReferences((current) => current.includes(url) ? current.filter((item) => item !== url) : [...current, url].slice(-3));
  }

  async function run() {
    if (!selectedId) {
      setMessage({ type: 'error', text: 'Selecciona un producto guardado.' });
      return;
    }
    if (mode === 'improve' && !selected?.image_url) {
      setMessage({ type: 'error', text: 'Este producto no tiene imagen; usa “Generar nueva”.' });
      return;
    }
    setGenerating(true);
    setResult(null);
    setMessage({ type: 'info', text: mode === 'improve' ? 'Generando 2 mejoras para comparar…' : 'Generando 2 alternativas para comparar…' });
    try {
      const response = await fetch('/api/admin/products/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedId, mode, instructions, candidateCount: 2, applyFirst: false, referenceUrls: selectedReferences }),
      });
      const json = await response.json().catch(() => ({})) as { url?: string; candidates?: Array<{ url?: string }>; model?: string; cost_usd?: number | null; error?: string };
      const candidates = (json.candidates || []).map((item) => ({ url: String(item.url || '') })).filter((item) => item.url);
      if (!response.ok || !json.url || !candidates.length) throw new Error(json.error || 'No se pudieron generar alternativas.');
      setResult({ url: json.url, candidates, model: json.model, cost_usd: json.cost_usd });
      setMessage({ type: 'ok', text: candidates.length > 1 ? 'Alternativas listas. Compara las dos y elige cuál usar como portada.' : 'Alternativa lista. Elige si quieres usarla como portada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo generar la imagen.' });
    } finally {
      setGenerating(false);
    }
  }

  async function applyCandidate(url: string) {
    if (!selectedId || !url || applyingUrl) return;
    setApplyingUrl(url);
    setMessage({ type: 'info', text: 'Aplicando la portada elegida…' });
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo aplicar la portada.');
      setProducts((current) => current.map((product) => product.id === selectedId ? { ...product, image_url: url } : product));
      setMessage({ type: 'ok', text: 'Portada actualizada. Las dos alternativas quedan guardadas en la galería.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo aplicar la portada.' });
    } finally {
      setApplyingUrl('');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[180] inline-flex min-h-12 items-center gap-2 rounded-full border border-[#F6C64A]/45 bg-[#111214] px-4 text-xs font-black text-[#F6C64A] shadow-[0_18px_55px_rgba(0,0,0,.32)] transition hover:-translate-y-0.5 hover:border-[#F6C64A] sm:bottom-6 sm:right-6"
        aria-label="Abrir generador de imágenes de productos con IA"
      >
        <WandSparkles className="h-4 w-4" /> Imagen IA
      </button>

      {open ? (
        <div className="fixed inset-0 z-[220] overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:p-6">
          <section className="mx-auto mt-8 w-full max-w-2xl overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#111214] text-white shadow-2xl sm:mt-16">
            <header className="flex items-start gap-4 border-b border-white/8 p-5 sm:p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F6C64A] text-[#111214]"><Sparkles className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Product Studio · Imagen IA</p>
                <h2 className="mt-1 text-xl font-black tracking-[-.035em]">Generar o mejorar portada</h2>
                <p className="mt-2 text-xs leading-5 text-white/52">Genera dos alternativas, las guarda en Cloudinary y te deja compararlas lado a lado. La portada solo cambia cuando tú eliges una.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Producto</span>
                <div className="flex gap-2">
                  <select value={selectedId} onChange={(event) => { const id = event.target.value; setSelectedId(id); const next = products.find((item) => item.id === id); setMode(next?.image_url ? 'improve' : 'generate'); }} disabled={loading || generating} className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0A0C0E] px-3 text-sm font-bold text-white outline-none focus:border-[#F6C64A]/60">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => void loadProducts()} disabled={loading || generating} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-[#F6C64A]" aria-label="Actualizar productos">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
                </div>
              </label>

              {selected ? (
                <div className="grid gap-4 rounded-2xl border border-white/8 bg-white/[.035] p-4 sm:grid-cols-[128px_1fr]">
                  <div className="aspect-square overflow-hidden rounded-xl bg-black/35">
                    {selected.image_url ? <img src={selected.image_url} alt={selected.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-white/25"><ImagePlus className="h-8 w-8" /></div>}
                  </div>
                  <div className="min-w-0"><p className="text-sm font-black">{selected.name}</p><p className="mt-1 text-[11px] text-white/45">{selected.image_url ? 'Tiene portada · puedes mejorarla o generar una alternativa.' : 'Sin portada · puedes generar la primera imagen.'}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode('generate')} disabled={generating} className={`min-h-11 rounded-xl px-3 text-[11px] font-black ${mode === 'generate' ? 'bg-[#F6C64A] text-[#111214]' : 'border border-white/10 text-white/65'}`}>Generar nueva</button><button type="button" onClick={() => setMode('improve')} disabled={!selected.image_url || generating} className={`min-h-11 rounded-xl px-3 text-[11px] font-black disabled:opacity-30 ${mode === 'improve' ? 'bg-[#F6C64A] text-[#111214]' : 'border border-white/10 text-white/65'}`}>Mejorar actual</button></div></div>
                </div>
              ) : null}

              <section className="rounded-2xl border border-white/8 bg-white/[.03] p-4">
                <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/8 text-[#F6C64A]"><Globe2 className="h-4 w-4" /></span><div><p className="text-xs font-black">Referencias visuales online</p><p className="mt-1 text-[10px] leading-4 text-white/40">Busca imágenes del mismo producto o variante y elige hasta 3. Sirven como contexto para la IA; no se publican automáticamente.</p></div></div>
                <div className="mt-3 flex gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" /><input value={referenceQuery} onChange={(event) => setReferenceQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchReferenceImages(); } }} placeholder="Buscar producto exacto…" className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0A0C0E] pl-9 pr-3 text-xs font-bold text-white outline-none placeholder:text-white/20 focus:border-[#F6C64A]/60" /></label><button type="button" onClick={() => void searchReferenceImages()} disabled={referenceBusy || generating} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-[#111214] disabled:opacity-40">{referenceBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button></div>

                {referenceImages.length ? <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{referenceImages.map((reference) => {
                  const active = selectedReferences.includes(reference.url);
                  return <article key={reference.key} className={`overflow-hidden rounded-xl border ${active ? 'border-[#F6C64A] bg-[#F6C64A]/10' : 'border-white/10 bg-black/20'}`}><button type="button" onClick={() => toggleReference(reference.url)} className="relative block aspect-square w-full bg-black/30"><img src={reference.url} alt="" className="h-full w-full object-contain" /><span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full ${active ? 'bg-[#F6C64A] text-black' : 'bg-black/70 text-white/25'}`}>{active ? <Check className="h-4 w-4" /> : null}</span></button><div className="p-2.5"><p className="line-clamp-2 min-h-8 text-[9px] font-black leading-4 text-white/75">{reference.title}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="text-[8px] font-bold uppercase text-[#F6C64A]/70">{reference.source}</span>{reference.link ? <a href={reference.link} target="_blank" rel="noreferrer" className="text-white/30"><ExternalLink className="h-3 w-3" /></a> : null}</div></div></article>;
                })}</div> : null}
                {selectedReferences.length ? <p className="mt-3 text-[10px] font-black text-[#F6C64A]">{selectedReferences.length}/3 referencias seleccionadas</p> : null}
              </section>

              <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Indicaciones opcionales</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value.slice(0, 700))} disabled={generating} rows={4} placeholder={mode === 'improve' ? 'Ej. fondo blanco, iluminación más limpia, mantener exactamente el producto…' : 'Ej. vista frontal, fondo blanco, iluminación de catálogo…'} className="rounded-xl border border-white/10 bg-[#0A0C0E] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#F6C64A]/60" /><span className="text-right text-[9px] text-white/25">{instructions.length}/700</span></label>

              {result?.candidates.length ? (
                <section className="rounded-2xl border border-[#F6C64A]/20 bg-[#F6C64A]/[.04] p-3">
                  <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Elige la mejor</p><p className="mt-1 text-[10px] leading-4 text-white/40">Las dos opciones quedan en la galería. Solo una será la portada pública.</p></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {result.candidates.map((candidate, index) => {
                      const active = selected?.image_url === candidate.url;
                      return <article key={candidate.url} className={`overflow-hidden rounded-xl border ${active ? 'border-[#F6C64A] bg-[#F6C64A]/10' : 'border-white/10 bg-black/25'}`}>
                        <div className="relative aspect-square"><img src={candidate.url} alt={`Alternativa ${index + 1} para ${selected?.name || 'producto'}`} className="h-full w-full object-contain" /><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black">Opción {index + 1}</span></div>
                        <button type="button" onClick={() => void applyCandidate(candidate.url)} disabled={Boolean(applyingUrl) || active} className={`flex min-h-11 w-full items-center justify-center gap-1.5 px-2 text-[10px] font-black disabled:opacity-60 ${active ? 'bg-[#F6C64A] text-[#111214]' : 'bg-white/[.06] text-white'}`}>{applyingUrl === candidate.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5" /> : null}{active ? 'Portada actual' : applyingUrl === candidate.url ? 'Aplicando…' : 'Usar esta portada'}</button>
                      </article>;
                    })}
                  </div>
                </section>
              ) : null}

              {message ? <div className={`rounded-xl border px-4 py-3 text-xs leading-5 ${message.type === 'error' ? 'border-red-400/25 bg-red-500/10 text-red-200' : message.type === 'ok' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-[#F6C64A]/25 bg-[#F6C64A]/[.07] text-[#F5E6A6]'}`}>{message.text}</div> : null}
              {result?.model ? <p className="text-[10px] leading-5 text-white/35">Modelo: {result.model}{typeof result.cost_usd === 'number' ? ` · costo reportado US$${result.cost_usd.toFixed(4)}` : ''}</p> : null}

              <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-[10px] leading-5 text-white/38">Cada ejecución solicita hasta 2 imágenes y puede usar hasta 3 referencias visuales elegidas por ti. Ninguna se publica como portada sin tu selección.</p><button type="button" onClick={() => void run()} disabled={generating || loading || !selectedId} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F6C64A] px-5 text-xs font-black text-[#111214] shadow-[0_15px_40px_rgba(246,198,74,.16)] disabled:opacity-45">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{generating ? 'Generando 2 opciones…' : mode === 'improve' ? 'Crear 2 mejoras' : 'Crear 2 alternativas'}</button></div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
