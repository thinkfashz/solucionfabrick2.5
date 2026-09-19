'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Globe2,
  ImagePlus,
  Loader2,
  Search,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

export type ProductPublicFeature = { label: string; value: string };

type MarketSource = 'mercadolibre' | 'serper' | 'serpapi';
type MarketRef = {
  source: MarketSource;
  sourceId: string | null;
  title: string;
  price: number | null;
  currency: string | null;
  url: string;
  image: string | null;
  position: number;
  raw?: Record<string, unknown>;
};
type Snapshot = {
  query: string;
  normalizedQuery: string;
  refs: MarketRef[];
  stats: { count: number; min: number | null; median: number | null; avg: number | null; max: number | null; currency: string | null };
};
type ResearchFeature = ProductPublicFeature & { confidence: number; sourceIndexes: number[] };
type ResearchResult = {
  summary: string;
  tagline: string;
  description: string;
  features: ResearchFeature[];
  warnings: string[];
  searchTerms: string[];
  referenceImages: Array<{ url: string; sourceIndex: number; source: string }>;
  priceReference: { count: number; min: number | null; median: number | null; avg: number | null; max: number | null; currency: string | null };
  provider: 'ollama' | 'openrouter' | 'local';
  model: string | null;
};
type ResearchReference = {
  index: number;
  source: string;
  sourceId: string;
  title: string;
  price: number | null;
  currency: string;
  url: string;
  snippet: string;
  attributes: Array<{ label: string; value: string }>;
  pictures: string[];
};

const SOURCE_LABEL: Record<MarketSource, string> = {
  mercadolibre: 'Mercado Libre',
  serper: 'Google · Serper',
  serpapi: 'Google · SerpAPI',
};
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function money(value: number | null, currency = 'CLP') {
  if (!value) return 'Sin precio';
  try { return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return CLP.format(value); }
}

function refKey(ref: MarketRef) {
  return `${ref.source}:${ref.sourceId || ref.url}`;
}

export default function ProductResearchPanel({
  product,
  provider,
  model,
  guide,
  initialQuery,
  onApplyContent,
  onUseReference,
  onAddReferenceImage,
  onRememberResearch,
}: {
  product: { name: string; description: string; tagline: string; category: string; price: number };
  provider: 'ollama' | 'openrouter';
  model: string;
  guide: string;
  initialQuery?: string;
  onApplyContent: (value: { tagline: string; description: string; features: ProductPublicFeature[] }) => void;
  onUseReference: (ref: { source: string; sourceId: string | null; url: string; price: number | null; currency: string | null }) => void;
  onAddReferenceImage: (url: string, source: string) => void;
  onRememberResearch: (memory: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState(initialQuery || product.name);
  const [sources, setSources] = useState<Record<MarketSource, boolean>>({ mercadolibre: true, serper: true, serpapi: false });
  const [limit, setLimit] = useState(12);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [references, setReferences] = useState<ResearchReference[]>([]);
  const [notice, setNotice] = useState('');

  const selectedRefs = useMemo(() => snapshot?.refs.filter((ref) => selected.includes(refKey(ref))) || [], [selected, snapshot]);

  async function searchOnline(nextQuery = query) {
    const cleaned = nextQuery.trim();
    if (!cleaned) {
      setNotice('Escribe qué quieres buscar.');
      return;
    }
    const enabled = (Object.entries(sources) as Array<[MarketSource, boolean]>).filter(([, active]) => active).map(([source]) => source);
    if (!enabled.length) {
      setNotice('Activa al menos una fuente.');
      return;
    }

    setSearching(true);
    setNotice('');
    setResult(null);
    setReferences([]);
    try {
      const response = await fetch('/api/admin/market-intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: cleaned, sources: enabled, site: 'MLC', persist: false, useCache: true, limitPerSource: limit }),
      });
      const json = await response.json().catch(() => ({})) as { snapshot?: Snapshot; error?: string };
      if (!response.ok || !json.snapshot) throw new Error(json.error || 'No se pudo investigar el producto.');
      setQuery(cleaned);
      setSnapshot(json.snapshot);
      setSelected([]);
      setNotice(`${json.snapshot.refs.length} referencias encontradas. Selecciona las que correspondan realmente a tu producto.`);
      onRememberResearch({ query: cleaned, stats: json.snapshot.stats, searched_at: new Date().toISOString() });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo buscar.');
    } finally {
      setSearching(false);
    }
  }

  async function analyzeSelected() {
    if (!selectedRefs.length) {
      setNotice('Selecciona al menos una referencia que realmente corresponda al producto.');
      return;
    }
    setAnalyzing(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/products/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, refs: selectedRefs, provider, model: model || undefined, guide }),
      });
      const json = await response.json().catch(() => ({})) as { result?: ResearchResult; references?: ResearchReference[]; error?: string };
      if (!response.ok || !json.result) throw new Error(json.error || 'No se pudo analizar las referencias.');
      setResult(json.result);
      setReferences(json.references || []);
      setNotice(`Análisis listo con ${json.result.provider === 'local' ? 'datos estructurados locales' : json.result.provider === 'ollama' ? 'Ollama' : 'OpenRouter'}. Revisa cada dato antes de aplicarlo.`);
      onRememberResearch({
        query,
        selected_refs: selectedRefs.map((ref) => ({ source: ref.source, source_id: ref.sourceId, title: ref.title, price: ref.price, currency: ref.currency, url: ref.url, image: ref.image })),
        price_reference: json.result.priceReference,
        summary: json.result.summary,
        analyzed_at: new Date().toISOString(),
        provider: json.result.provider,
        model: json.result.model,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo analizar.');
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleSelected(ref: MarketRef) {
    const key = refKey(ref);
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key].slice(-8));
  }

  const stats = snapshot?.stats;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#111214] text-[#f5c75d]"><Globe2 className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Investigación online</h3><p className="mt-1 text-xs leading-5 text-black/45">Busca referencias reales, contrasta precios y selecciona únicamente las publicaciones que correspondan al mismo producto o variante.</p></div></div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row">
          <label className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchOnline(); } }} placeholder="Ej. Midea Xtreme Save 12000 BTU ficha técnica" className="min-h-12 w-full rounded-xl border border-black/10 bg-[#fbf8f1] pl-10 pr-3 text-sm font-bold outline-none focus:border-[#d18b16]" /></label>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="min-h-12 rounded-xl border border-black/10 bg-white px-3 text-xs font-black"><option value={8}>8 por fuente</option><option value={12}>12 por fuente</option><option value={20}>20 por fuente</option></select>
          <button type="button" onClick={() => void searchOnline()} disabled={searching} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#111214] px-5 text-xs font-black text-white disabled:opacity-50">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-[#f5c75d]" />}Buscar en línea</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(SOURCE_LABEL) as MarketSource[]).map((source) => <button key={source} type="button" onClick={() => setSources((current) => ({ ...current, [source]: !current[source] }))} className={`rounded-full border px-3 py-2 text-[10px] font-black ${sources[source] ? 'border-[#111214] bg-[#111214] text-white' : 'border-black/10 bg-white text-black/40'}`}>{sources[source] ? <Check className="mr-1 inline h-3 w-3" /> : null}{SOURCE_LABEL[source]}</button>)}
        </div>

        {notice ? <p className="mt-3 rounded-xl bg-[#fff4d5] px-3 py-2 text-[11px] leading-5 text-[#745014]">{notice}</p> : null}
      </section>

      {stats ? <section><div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Precio referencial</p><p className="mt-1 text-[10px] text-black/40">Rango observado en las fuentes activas; úsalo como contexto, no como costo automático.</p></div></div><div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{[
        ['Referencias', String(snapshot?.refs.length || 0)],
        ['Mínimo', money(stats.min, stats.currency || 'CLP')],
        ['Mediana', money(stats.median, stats.currency || 'CLP')],
        ['Promedio', money(stats.avg, stats.currency || 'CLP')],
        ['Máximo', money(stats.max, stats.currency || 'CLP')],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-black/8 bg-white p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">{label}</p><p className="mt-1 truncate text-sm font-black">{value}</p></div>)}</div></section> : null}

      {snapshot?.refs.length ? <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-black">Referencias encontradas</h3><p className="mt-1 text-[10px] text-black/40">Seleccionadas {selectedRefs.length}/8 · usa solo referencias compatibles.</p></div><button type="button" onClick={() => setSelected(selectedRefs.length === snapshot.refs.length ? [] : snapshot.refs.slice(0, 8).map(refKey))} className="rounded-xl bg-white px-3 py-2 text-[10px] font-black shadow-sm">{selectedRefs.length ? 'Limpiar selección' : 'Seleccionar primeras'}</button></div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          {snapshot.refs.map((ref) => {
            const active = selected.includes(refKey(ref));
            return <article key={refKey(ref)} className={`overflow-hidden rounded-2xl border bg-white ${active ? 'border-[#d18b16] ring-2 ring-[#d18b16]/15' : 'border-black/8'}`}>
              <button type="button" onClick={() => toggleSelected(ref)} className="relative block aspect-[4/3] w-full bg-[#f3eee5] text-left">{ref.image ? <img src={ref.image} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-[10px] text-black/25">Sin imagen</div>}<span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full ${active ? 'bg-[#d18b16] text-white' : 'bg-white/90 text-black/20'}`}>{active ? <Check className="h-4 w-4" /> : null}</span></button>
              <div className="p-3"><p className="line-clamp-2 min-h-9 text-[11px] font-black leading-4">{ref.title}</p><p className="mt-2 text-base font-black">{money(ref.price, ref.currency || 'CLP')}</p><p className="mt-1 truncate text-[8px] font-black uppercase tracking-[.1em] text-[#9b6a12]">{SOURCE_LABEL[ref.source]}</p><div className="mt-3 grid grid-cols-2 gap-1.5"><button type="button" onClick={() => onUseReference({ source: SOURCE_LABEL[ref.source], sourceId: ref.sourceId, url: ref.url, price: ref.price, currency: ref.currency })} className="min-h-9 rounded-lg bg-[#f5efe5] px-2 text-[9px] font-black">Usar datos</button><button type="button" disabled={!ref.image} onClick={() => ref.image && onAddReferenceImage(ref.image, ref.source)} className="min-h-9 rounded-lg bg-[#fff0bd] px-2 text-[9px] font-black text-[#76500c] disabled:opacity-35"><ImagePlus className="mr-1 inline h-3 w-3" />Imagen ref.</button></div>{ref.url ? <a href={ref.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-black/35">Abrir fuente <ExternalLink className="h-3 w-3" /></a> : null}</div>
            </article>;
          })}
        </div>

        <button type="button" onClick={() => void analyzeSelected()} disabled={analyzing || selectedRefs.length === 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111214] px-5 text-xs font-black text-white disabled:opacity-40">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-[#f5c75d]" />}{analyzing ? 'Contrastando referencias…' : `Analizar ${selectedRefs.length || ''} referencias con ${provider === 'ollama' ? 'Ollama' : 'IA'}`}</button>
      </section> : null}

      {result ? <section className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
        <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-violet-700" /><div><h3 className="text-sm font-black">Ficha contrastada</h3><p className="mt-1 text-xs leading-5 text-violet-950/60">{result.summary}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.1em] text-violet-700">{result.provider}{result.model ? ` · ${result.model}` : ''}</p></div></div>

        {result.features.length ? <div className="grid gap-2 sm:grid-cols-2">{result.features.map((feature, index) => <div key={`${feature.label}-${index}`} className="rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-black text-black/45">{feature.label}</p><span className={`rounded-full px-2 py-1 text-[8px] font-black ${feature.confidence >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{feature.confidence}%</span></div><p className="mt-1 text-xs font-black">{feature.value}</p><p className="mt-1 text-[8px] text-black/30">Fuentes {feature.sourceIndexes.length ? feature.sourceIndexes.join(', ') : 'sin índice'}</p></div>)}</div> : null}

        <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => onApplyContent({ tagline: result.tagline, description: result.description, features: result.features.map(({ label, value }) => ({ label, value })) })} className="min-h-11 rounded-xl bg-violet-700 px-4 text-[10px] font-black text-white">Aplicar descripción + características</button><button type="button" onClick={() => { for (const image of result.referenceImages.slice(0, 8)) onAddReferenceImage(image.url, image.source); }} disabled={!result.referenceImages.length} className="min-h-11 rounded-xl border border-violet-200 bg-white px-4 text-[10px] font-black text-violet-800 disabled:opacity-40">Añadir imágenes de referencia ({result.referenceImages.length})</button></div>

        {result.referenceImages.length ? <div><p className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-violet-700">Imágenes encontradas</p><div className="grid grid-cols-4 gap-2">{result.referenceImages.slice(0, 12).map((image, index) => <button key={image.url + index} type="button" onClick={() => onAddReferenceImage(image.url, image.source)} className="relative aspect-square overflow-hidden rounded-xl border border-violet-100 bg-white"><img src={image.url} alt="" className="h-full w-full object-contain" /><span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[7px] font-black text-white">+ ref</span></button>)}</div></div> : null}

        {result.warnings.length ? <div className="rounded-xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">{result.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div> : null}
        {result.searchTerms.length ? <div className="flex flex-wrap gap-2">{result.searchTerms.map((term) => <button type="button" key={term} onClick={() => { setQuery(term); void searchOnline(term); }} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[9px] font-black text-violet-800">{term}</button>)}</div> : null}
      </section> : null}

      {references.length ? <details className="rounded-2xl border border-black/8 bg-white p-4"><summary className="cursor-pointer text-xs font-black">Ver evidencia técnica extraída</summary><div className="mt-3 space-y-3">{references.map((reference) => <div key={reference.index} className="rounded-xl bg-[#f7f3eb] p-3"><p className="text-[9px] font-black uppercase text-[#9b6a12]">Fuente {reference.index} · {reference.source}</p><p className="mt-1 text-xs font-black">{reference.title}</p>{reference.attributes.length ? <div className="mt-2 grid gap-1 sm:grid-cols-2">{reference.attributes.slice(0, 18).map((attribute) => <p key={attribute.label + attribute.value} className="text-[9px] text-black/55"><b>{attribute.label}:</b> {attribute.value}</p>)}</div> : <p className="mt-2 text-[9px] text-black/35">Sin atributos estructurados adicionales.</p>}</div>)}</div></details> : null}
    </div>
  );
}
