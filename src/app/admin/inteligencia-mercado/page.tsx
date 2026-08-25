'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  History,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';

type Tab = 'radar' | 'tendencias' | 'historico';
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
};

type MarketStats = {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  currency: string | null;
  bySource: Record<MarketSource, { count: number; avg: number | null }>;
};

type MarketSnapshot = {
  query: string;
  normalizedQuery: string;
  site: string;
  sources: MarketSource[];
  refs: MarketRef[];
  stats: MarketStats;
};

type MarketDelta = {
  previousAvg: number | null;
  currentAvg: number | null;
  deltaPct: number | null;
  trend: 'up' | 'down' | 'flat' | 'unknown';
  previousAt: string | null;
};

type HistoryRow = {
  id: string;
  query: string;
  stats: MarketStats;
  refs_count: number;
  created_at: string;
};

type TrendRow = { keyword: string; url?: string };

type ExistingProduct = {
  id: string;
  name: string;
  source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
};

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

type PriceGuide = {
  cost: number;
  marketReference: number;
  targetPrice: number;
  suggestedPrice: number;
  grossProfit: number;
  grossMargin: number;
  reserveAmount: number;
  netProfit: number;
  netMargin: number;
  spreadToMarket: number | null;
  opportunityScore: number;
};

const SOURCE_LABEL: Record<MarketSource, string> = {
  mercadolibre: 'Mercado Libre',
  serper: 'Google · Serper',
  serpapi: 'Google · SerpAPI',
};

const SOURCE_BADGE: Record<MarketSource, string> = {
  mercadolibre: 'bg-[#fff0a6] text-[#6f5200]',
  serper: 'bg-emerald-100 text-emerald-800',
  serpapi: 'bg-rose-100 text-rose-800',
};

const PRESETS = ['panel SIP', 'taladro percutor', 'piso flotante', 'tornillos autoperforantes', 'pintura exterior', 'aire acondicionado inverter'];

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  const parsed = numberValue(value);
  if (!parsed) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(parsed));
}

function refKey(ref: MarketRef) {
  return `${ref.source}:${ref.sourceId || ref.url}`;
}

function productLookupKey(source: string | null | undefined, sourceId: string | null | undefined, sourceUrl: string | null | undefined) {
  if (sourceUrl) return `url:${sourceUrl}`;
  if (source && sourceId) return `source:${source}:${sourceId}`;
  return '';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function calculateGuide(costInput: number, stats: MarketStats | null | undefined, markupPct: number, reservePct: number): PriceGuide {
  const cost = Math.max(0, Math.round(costInput));
  const marketReference = Math.max(0, Math.round(numberValue(stats?.median) || numberValue(stats?.avg) || cost));
  const targetPrice = Math.round(cost * (1 + Math.max(0, markupPct) / 100));
  let suggestedPrice = targetPrice;

  if (marketReference > cost && cost > 0) {
    const marketCeiling = Math.round(marketReference * 0.98);
    const minimumHealthy = Math.round(cost * 1.08);
    suggestedPrice = Math.max(minimumHealthy, Math.min(targetPrice, marketCeiling));
  }
  if (suggestedPrice <= 0) suggestedPrice = marketReference;

  const grossProfit = Math.max(0, suggestedPrice - cost);
  const grossMargin = suggestedPrice > 0 ? (grossProfit / suggestedPrice) * 100 : 0;
  const reserveAmount = Math.round(suggestedPrice * Math.max(0, reservePct) / 100);
  const netProfit = suggestedPrice - cost - reserveAmount;
  const netMargin = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;
  const spreadToMarket = marketReference > 0 ? ((marketReference - cost) / marketReference) * 100 : null;
  const opportunityScore = clamp(Math.round(45 + (spreadToMarket || 0) * 0.8 + Math.max(0, netMargin) * 0.45), 20, 95);

  return { cost, marketReference, targetPrice, suggestedPrice, grossProfit, grossMargin, reserveAmount, netProfit, netMargin, spreadToMarket, opportunityScore };
}

function Metric({ label, value, note, icon: Icon, dark = false }: { label: string; value: string; note: string; icon: typeof Package; dark?: boolean }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${dark ? 'border-black bg-[#111214] text-white' : 'border-black/7 bg-[#fffaf0] text-[#111214]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[9px] font-black uppercase tracking-[.16em] ${dark ? 'text-white/35' : 'text-black/35'}`}>{label}</span>
        <Icon className={`h-4 w-4 ${dark ? 'text-[#f5c75d]' : 'text-black/30'}`} />
      </div>
      <p className="mt-3 truncate text-2xl font-black tracking-[-.045em]">{value}</p>
      <p className={`mt-1 text-[11px] ${dark ? 'text-white/40' : 'text-black/40'}`}>{note}</p>
    </article>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="text-xs text-black/35">Guarda más snapshots para ver la evolución.</p>;
  const width = 320;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / range) * height}`).join(' ');
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full overflow-visible"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-[#d28b12]" /></svg>;
}

export default function InteligenciaMercadoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('radar');
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<Record<MarketSource, boolean>>({ mercadolibre: true, serper: true, serpapi: false });
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [delta, setDelta] = useState<MarketDelta | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [costOverrides, setCostOverrides] = useState<Record<string, string>>({});
  const [markupPct, setMarkupPct] = useState(30);
  const [reservePct, setReservePct] = useState(12);
  const [analysisByKey, setAnalysisByKey] = useState<Record<string, CommerceAnalysis>>({});
  const [analyzingKeys, setAnalyzingKeys] = useState<string[]>([]);
  const [exportingKeys, setExportingKeys] = useState<string[]>([]);
  const [exportedByKey, setExportedByKey] = useState<Record<string, string>>({});
  const [existingProducts, setExistingProducts] = useState<ExistingProduct[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const existingMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of existingProducts) {
      const byUrl = product.source_url ? productLookupKey('', '', product.source_url) : '';
      const bySource = productLookupKey(product.source, product.source_id, '');
      if (byUrl) map.set(byUrl, product.id);
      if (bySource) map.set(bySource, product.id);
    }
    return map;
  }, [existingProducts]);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: ExistingProduct[] };
      if (response.ok && Array.isArray(json.products)) setExistingProducts(json.products);
    } catch {
      // El radar funciona incluso si el catálogo no pudo cargarse temporalmente.
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const runSearch = useCallback(async (term = query, options: { persist?: boolean; useCache?: boolean } = {}) => {
    const clean = term.trim();
    if (!clean) {
      setError('Escribe un producto, palabra clave o SKU para analizar el mercado.');
      return;
    }
    const enabled = (Object.entries(sources) as Array<[MarketSource, boolean]>).filter(([, active]) => active).map(([source]) => source);
    if (!enabled.length) {
      setError('Activa al menos una fuente de búsqueda.');
      return;
    }
    setSearching(true);
    setError('');
    setNotice('');
    setQuery(clean);
    try {
      const response = await fetch('/api/admin/market-intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: clean, sources: enabled, persist: options.persist === true, useCache: options.useCache !== false, limitPerSource: 20 }),
      });
      const json = await response.json().catch(() => ({})) as { ok?: boolean; snapshot?: MarketSnapshot; delta?: MarketDelta; snapshotId?: string | null; error?: string };
      if (!response.ok || !json.ok || !json.snapshot) throw new Error(json.error || 'No se pudo completar la búsqueda.');
      setSnapshot(json.snapshot);
      setDelta(json.delta || null);
      setSelected([]);
      setCostOverrides({});
      setAnalysisByKey({});
      if (options.persist && json.snapshotId) setNotice('Snapshot guardado. Ya forma parte del histórico de precios.');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'No se pudo consultar el mercado.');
    } finally {
      setSearching(false);
    }
  }, [query, sources]);

  const loadTrends = useCallback(async (force = false) => {
    setTrendsLoading(true);
    try {
      const response = await fetch(`/api/admin/market-intel/trends?site=MLC${force ? '&force=1' : ''}`);
      const json = await response.json().catch(() => ({})) as { ok?: boolean; trends?: TrendRow[] };
      if (response.ok && json.ok && Array.isArray(json.trends)) setTrends(json.trends);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (term = historyQuery || query) => {
    const clean = term.trim();
    if (!clean) return;
    setHistoryLoading(true);
    setHistoryQuery(clean);
    try {
      const response = await fetch(`/api/admin/market-intel/history?q=${encodeURIComponent(clean)}&limit=30`);
      const json = await response.json().catch(() => ({})) as { ok?: boolean; snapshots?: HistoryRow[] };
      if (response.ok && json.ok && Array.isArray(json.snapshots)) setHistoryRows(json.snapshots);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyQuery, query]);

  useEffect(() => { if (tab === 'tendencias' && !trends.length) void loadTrends(); }, [tab, trends.length, loadTrends]);

  function costFor(ref: MarketRef) {
    const override = costOverrides[refKey(ref)];
    return override === undefined ? Math.max(0, numberValue(ref.price)) : Math.max(0, numberValue(override));
  }

  function guideFor(ref: MarketRef) {
    return calculateGuide(costFor(ref), snapshot?.stats, markupPct, reservePct);
  }

  function existingProductId(ref: MarketRef) {
    return existingMap.get(productLookupKey('', '', ref.url)) || existingMap.get(productLookupKey(ref.source, ref.sourceId, '')) || exportedByKey[refKey(ref)] || '';
  }

  async function getAiAnalysis(ref: MarketRef) {
    const key = refKey(ref);
    if (analysisByKey[key]) return analysisByKey[key];
    setAnalyzingKeys((current) => Array.from(new Set([...current, key])));
    try {
      const guide = guideFor(ref);
      const response = await fetch('/api/admin/products/ai-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: ref.title,
            description: `Referente encontrado para “${snapshot?.query || query}”.`,
            category: snapshot?.query || query,
            price: guide.suggestedPrice,
            cost: guide.cost,
            stock: 0,
            specifications: {
              market_min: snapshot?.stats.min,
              market_avg: snapshot?.stats.avg,
              market_median: snapshot?.stats.median,
              market_max: snapshot?.stats.max,
            },
          },
        }),
      });
      const json = await response.json().catch(() => ({})) as { analysis?: CommerceAnalysis; error?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'No se pudo analizar el candidato.');
      setAnalysisByKey((current) => ({ ...current, [key]: json.analysis! }));
      return json.analysis;
    } finally {
      setAnalyzingKeys((current) => current.filter((item) => item !== key));
    }
  }

  async function exportCandidate(ref: MarketRef, options: { analyze?: boolean; open?: boolean; silent?: boolean } = {}) {
    const key = refKey(ref);
    const already = existingProductId(ref);
    if (already) {
      if (options.open) router.push(`/admin/productos?studio=${encodeURIComponent(already)}`);
      return { ok: true, id: already, existing: true };
    }
    if (!ref.price || ref.price <= 0) return { ok: false, id: '', existing: false };

    setExportingKeys((current) => Array.from(new Set([...current, key])));
    try {
      const guide = guideFor(ref);
      let commerce = analysisByKey[key];
      if (options.analyze && !commerce) commerce = await getAiAnalysis(ref);
      const suggested = commerce?.recommendedPrice && commerce.recommendedPrice > guide.cost ? commerce.recommendedPrice : guide.suggestedPrice;
      const finalGuide = calculateGuide(guide.cost, snapshot?.stats, ((suggested / Math.max(guide.cost, 1)) - 1) * 100, reservePct);
      finalGuide.suggestedPrice = suggested;
      finalGuide.grossProfit = Math.max(0, suggested - guide.cost);
      finalGuide.grossMargin = suggested > 0 ? (finalGuide.grossProfit / suggested) * 100 : 0;
      finalGuide.reserveAmount = Math.round(suggested * reservePct / 100);
      finalGuide.netProfit = suggested - guide.cost - finalGuide.reserveAmount;
      finalGuide.netMargin = suggested > 0 ? (finalGuide.netProfit / suggested) * 100 : 0;

      const marketIntel = {
        query: snapshot?.query || query,
        normalized_query: snapshot?.normalizedQuery || '',
        source: ref.source,
        source_label: SOURCE_LABEL[ref.source],
        source_position: ref.position,
        captured_at: new Date().toISOString(),
        market_min: snapshot?.stats.min ?? null,
        market_avg: snapshot?.stats.avg ?? null,
        market_median: snapshot?.stats.median ?? null,
        market_max: snapshot?.stats.max ?? null,
        reference_cost: guide.cost,
        target_markup_percentage: markupPct,
        operating_reserve_percentage: reservePct,
        suggested_sale_price: suggested,
        gross_profit_reference: finalGuide.grossProfit,
        gross_margin_percentage: Math.round(finalGuide.grossMargin * 10) / 10,
        estimated_net_profit_after_reserve: finalGuide.netProfit,
        estimated_net_margin_percentage: Math.round(finalGuide.netMargin * 10) / 10,
        opportunity_score: finalGuide.opportunityScore,
        market_delta_percentage: delta?.deltaPct ?? null,
        disclaimer: 'El precio del referente se usa como costo de referencia para comparar. No equivale necesariamente al costo mayorista real. La utilidad estimada no incluye todos los costos tributarios, logísticos, comisiones, devoluciones ni publicidad salvo la reserva indicada.',
      };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: commerce?.title || ref.title,
          description: commerce?.longDescription || `Candidato capturado desde Inteligencia de Mercado para “${snapshot?.query || query}”. Revisa especificaciones, proveedor, disponibilidad y condiciones antes de publicarlo.`,
          tagline: commerce?.shortDescription || 'Candidato de mercado · revisar antes de publicar',
          price: suggested,
          supplier_price: guide.cost || null,
          supplier_currency: ref.currency || 'CLP',
          shipping_fee: null,
          stock: 0,
          image_url: ref.image || null,
          activo: false,
          featured: false,
          source: SOURCE_LABEL[ref.source],
          source_url: ref.url,
          source_id: ref.sourceId,
          specifications: {
            market_intel: marketIntel,
            default_markup_percentage: markupPct,
            auto_markup_enabled: false,
            ...(ref.image ? { gallery_images: [ref.image], gallery_assets: [{ url: ref.image, source: ref.source }] } : {}),
            ...(commerce ? { commerce_ai: commerce } : {}),
          },
        }),
      });
      const json = await response.json().catch(() => ({})) as { product?: ExistingProduct; error?: string };
      if (!response.ok || !json.product?.id) throw new Error(json.error || 'No se pudo guardar el candidato en Productos.');
      const id = String(json.product.id);
      setExportedByKey((current) => ({ ...current, [key]: id }));
      setExistingProducts((current) => [...current, json.product!]);
      if (!options.silent) setNotice(`“${ref.title}” quedó guardado como borrador oculto en Productos.`);
      if (options.open) router.push(`/admin/productos?studio=${encodeURIComponent(id)}`);
      return { ok: true, id, existing: false };
    } catch (exportError) {
      if (!options.silent) setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el producto.');
      return { ok: false, id: '', existing: false };
    } finally {
      setExportingKeys((current) => current.filter((item) => item !== key));
    }
  }

  async function exportMany(mode: 'selected' | 'all') {
    if (!snapshot) return;
    const source = mode === 'selected' ? snapshot.refs.filter((ref) => selected.includes(refKey(ref))) : snapshot.refs;
    const candidates = source.filter((ref) => ref.price && ref.price > 0 && !existingProductId(ref)).slice(0, 30);
    if (!candidates.length) {
      setNotice('No hay candidatos nuevos con precio para exportar.');
      return;
    }
    setError('');
    setNotice(`Guardando ${candidates.length} candidato${candidates.length === 1 ? '' : 's'} como borrador…`);
    let created = 0;
    for (let index = 0; index < candidates.length; index += 4) {
      const batch = candidates.slice(index, index + 4);
      const results = await Promise.all(batch.map((ref) => exportCandidate(ref, { silent: true })));
      created += results.filter((result) => result.ok && !result.existing).length;
    }
    setSelected([]);
    setNotice(`${created} producto${created === 1 ? '' : 's'} guardado${created === 1 ? '' : 's'} como borrador oculto. Puedes terminar precio, IA, imágenes y SEO en Productos.`);
  }

  async function analyzeSelected() {
    if (!snapshot) return;
    const refs = snapshot.refs.filter((ref) => selected.includes(refKey(ref))).filter((ref) => ref.price && ref.price > 0).slice(0, 6);
    if (!refs.length) {
      setNotice('Selecciona hasta 6 productos con precio para analizarlos con IA.');
      return;
    }
    setNotice(`Analizando ${refs.length} candidato${refs.length === 1 ? '' : 's'} con Commerce AI…`);
    const results = await Promise.allSettled(refs.map((ref) => getAiAnalysis(ref)));
    const ok = results.filter((result) => result.status === 'fulfilled').length;
    setNotice(`${ok} análisis listo${ok === 1 ? '' : 's'}. Revisa cada tarjeta antes de exportar.`);
  }

  const validRefs = useMemo(() => snapshot?.refs.filter((ref) => ref.price && ref.price > 0) || [], [snapshot]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const opportunityAverage = useMemo(() => {
    if (!validRefs.length) return 0;
    return Math.round(validRefs.reduce((sum, ref) => sum + guideFor(ref).opportunityScore, 0) / validRefs.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRefs, markupPct, reservePct, costOverrides, snapshot?.stats]);

  const historyValues = useMemo(() => historyRows.map((row) => numberValue(row.stats.avg)).filter((value) => value > 0).reverse(), [historyRows]);

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="overflow-hidden rounded-[1.9rem] border border-black/7 bg-[#fffaf0] shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Inteligencia de mercado</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-800"><CheckCircle2 className="h-3 w-3" />Conectado a Productos</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.065em] sm:text-5xl">Descubre oportunidades y conviértelas en productos.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/45">Busca referentes, compara el mercado, define tu costo real, simula markup y reserva operativa, analiza con IA y guarda el candidato directamente en Product Studio sin publicarlo automáticamente.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => router.push('/admin/productos')} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white"><Package className="h-4 w-4 text-[#f5c75d]" />Abrir Productos<ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => void exportMany('all')} disabled={!snapshot || exportingKeys.length > 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f] disabled:opacity-45"><Save className="h-4 w-4" />Guardar todos</button>
            <button type="button" onClick={() => { setTab('historico'); void loadHistory(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-xs font-black text-black/55"><History className="h-4 w-4" />Histórico</button>
          </div>
        </div>
        <div className="border-t border-black/7 bg-[#efe6d6] p-2 sm:px-5">
          <nav className="flex gap-1 overflow-x-auto">
            {([
              ['radar', 'Radar y candidatos', Search],
              ['tendencias', 'Tendencias', TrendingUp],
              ['historico', 'Histórico de precios', History],
            ] as Array<[Tab, string, typeof Search]>).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${tab === id ? 'bg-[#111214] text-white' : 'text-black/45 hover:bg-white/60 hover:text-black'}`}><Icon className={`h-4 w-4 ${tab === id ? 'text-[#f5c75d]' : ''}`} />{label}</button>)}
          </nav>
        </div>
      </section>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

      {tab === 'radar' ? (
        <>
          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5">
              <label className="text-[9px] font-black uppercase tracking-[.18em] text-black/35">Producto, keyword o SKU</label>
              <div className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} placeholder="Ej. taladro percutor profesional" className="min-h-12 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#d18b16]" /></div><button type="button" onClick={() => void runSearch()} disabled={searching} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#111214] px-5 text-xs font-black text-white disabled:opacity-50">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-[#f5c75d]" />}Buscar</button></div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{PRESETS.map((preset) => <button key={preset} type="button" onClick={() => { setQuery(preset); void runSearch(preset); }} className="shrink-0 rounded-full border border-black/8 bg-[#f4ecdd] px-3 py-1.5 text-[11px] font-bold text-black/48 hover:text-black">{preset}</button>)}</div>
              <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-[9px] font-black uppercase tracking-[.16em] text-black/30">Fuentes</span>{(Object.keys(sources) as MarketSource[]).map((source) => <label key={source} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black ${sources[source] ? 'border-[#d18b16]/25 bg-[#fff0bd] text-[#77520f]' : 'border-black/8 bg-white text-black/35'}`}><input type="checkbox" className="sr-only" checked={sources[source]} onChange={(event) => setSources((current) => ({ ...current, [source]: event.target.checked }))} /><span className={`h-2 w-2 rounded-full ${sources[source] ? 'bg-[#d18b16]' : 'bg-black/15'}`} />{SOURCE_LABEL[source]}</label>)}</div>
            </div>

            <div className="rounded-2xl border border-black/7 bg-[#111214] p-4 text-white shadow-sm sm:p-5">
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#f5c75d]" /><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/40">Guía de rentabilidad</p></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><label><span className="text-[10px] font-bold text-white/45">Markup objetivo</span><div className="mt-1 flex min-h-11 items-center rounded-xl bg-white/8 px-3"><input type="number" min="0" max="300" value={markupPct} onChange={(event) => setMarkupPct(clamp(numberValue(event.target.value), 0, 300))} className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none" /><Percent className="h-4 w-4 text-[#f5c75d]" /></div></label><label><span className="text-[10px] font-bold text-white/45">Reserva costos</span><div className="mt-1 flex min-h-11 items-center rounded-xl bg-white/8 px-3"><input type="number" min="0" max="80" value={reservePct} onChange={(event) => setReservePct(clamp(numberValue(event.target.value), 0, 80))} className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none" /><Percent className="h-4 w-4 text-[#f5c75d]" /></div></label></div>
              <p className="mt-3 text-[11px] leading-5 text-white/35">La reserva es una aproximación para comisiones, logística, publicidad, devoluciones u otros costos. Puedes ajustarla según tu operación.</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric label="Referentes" value={String(snapshot?.refs.length || 0)} note="Resultados visibles" icon={Boxes} />
            <Metric label="Precio mediano" value={money(snapshot?.stats.median)} note="Referencia de mercado" icon={BarChart3} />
            <Metric label="Precio promedio" value={money(snapshot?.stats.avg)} note="Todas las fuentes" icon={DollarSign} />
            <Metric label="Oportunidad" value={snapshot ? `${opportunityAverage}/95` : '—'} note="Estimación relativa" icon={Target} />
            <Metric label="En selección" value={String(selected.length)} note="Listos para analizar/exportar" icon={Check} dark />
          </section>

          {snapshot ? (
            <>
              <section className="rounded-2xl border border-black/7 bg-[#efe6d6] p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="text-sm font-black">{snapshot.query}</p><p className="mt-1 text-[11px] text-black/40">Mín. {money(snapshot.stats.min)} · Mediana {money(snapshot.stats.median)} · Máx. {money(snapshot.stats.max)}{delta?.deltaPct != null ? ` · Variación ${delta.deltaPct > 0 ? '+' : ''}${delta.deltaPct.toFixed(1)}%` : ''}</p></div>
                  <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelected(selected.length === validRefs.length ? [] : validRefs.map(refKey))} className="rounded-xl border border-black/8 bg-white px-3 py-2 text-xs font-black">{selected.length === validRefs.length && validRefs.length ? 'Quitar selección' : 'Seleccionar todos'}</button><button type="button" onClick={() => void analyzeSelected()} disabled={!selected.length || analyzingKeys.length > 0} className="inline-flex items-center gap-2 rounded-xl bg-[#fff0bd] px-3 py-2 text-xs font-black text-[#76500f] disabled:opacity-45"><Sparkles className="h-4 w-4" />Analizar selección IA</button><button type="button" onClick={() => void exportMany('selected')} disabled={!selected.length || exportingKeys.length > 0} className="inline-flex items-center gap-2 rounded-xl bg-[#111214] px-3 py-2 text-xs font-black text-white disabled:opacity-45"><Save className="h-4 w-4 text-[#f5c75d]" />Guardar selección</button><button type="button" onClick={() => void runSearch(query, { persist: true, useCache: false })} disabled={searching} className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3 py-2 text-xs font-black"><RefreshCw className="h-4 w-4" />Guardar snapshot</button></div>
                </div>
              </section>

              <section className="grid gap-3 xl:grid-cols-2">
                {snapshot.refs.slice(0, 40).map((ref) => {
                  const key = refKey(ref);
                  const guide = guideFor(ref);
                  const analysis = analysisByKey[key];
                  const analyzing = analyzingKeys.includes(key);
                  const exporting = exportingKeys.includes(key);
                  const productId = existingProductId(ref);
                  const selectedNow = selectedSet.has(key);
                  return (
                    <article key={key} className={`overflow-hidden rounded-2xl border bg-[#fffaf0] shadow-sm transition ${selectedNow ? 'border-[#d18b16]/55 ring-2 ring-[#d18b16]/10' : 'border-black/7'}`}>
                      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4">
                        <button type="button" onClick={() => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} className="relative h-28 overflow-hidden rounded-xl bg-[#f1e8d8] text-black/20 sm:h-32" aria-label={selectedNow ? 'Quitar de selección' : 'Seleccionar candidato'}>{ref.image ? <img src={ref.image} alt={ref.title} className="h-full w-full object-contain p-1" /> : <Package className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2" />}<span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg shadow ${selectedNow ? 'bg-[#111214] text-[#f5c75d]' : 'bg-white/90 text-black/25'}`}>{selectedNow ? <Check className="h-4 w-4" /> : null}</span></button>
                        <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${SOURCE_BADGE[ref.source]}`}>{SOURCE_LABEL[ref.source]}</span><h3 className="mt-2 line-clamp-2 text-sm font-black leading-5">{ref.title}</h3></div><a href={ref.url} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/8 bg-white text-black/40 hover:text-black"><ExternalLink className="h-4 w-4" /></a></div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[#f1e8d8] p-2.5"><span className="block text-[9px] font-black uppercase tracking-[.12em] text-black/30">Precio referente</span><b className="mt-1 block text-sm">{ref.price ? money(ref.price) : 'Sin precio'}</b></div><div className="rounded-xl bg-[#111214] p-2.5 text-white"><span className="block text-[9px] font-black uppercase tracking-[.12em] text-white/35">Venta sugerida</span><b className="mt-1 block text-sm text-[#f5c75d]">{guide.suggestedPrice ? money(guide.suggestedPrice) : '—'}</b></div></div>
                        </div>
                      </div>

                      <div className="border-t border-black/7 bg-[#f8f1e5] p-3 sm:p-4">
                        <div className="grid gap-2 sm:grid-cols-4"><label className="sm:col-span-1"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Costo base</span><div className="mt-1 flex min-h-10 items-center rounded-xl border border-black/8 bg-white px-3"><span className="mr-1 text-xs text-black/30">$</span><input inputMode="numeric" value={costOverrides[key] ?? String(ref.price || '')} onChange={(event) => setCostOverrides((current) => ({ ...current, [key]: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" /></div></label><div className="rounded-xl bg-white p-2.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Ganancia bruta</span><b className="mt-1 block text-sm">{money(guide.grossProfit)}</b><small className="text-[10px] text-black/35">{guide.grossMargin.toFixed(1)}% margen</small></div><div className={`rounded-xl p-2.5 ${guide.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}><span className="text-[9px] font-black uppercase tracking-[.12em] opacity-50">Utilidad estimada</span><b className="mt-1 block text-sm">{money(guide.netProfit)}</b><small className="text-[10px] opacity-55">{guide.netMargin.toFixed(1)}% tras reserva</small></div><div className="rounded-xl bg-[#fff0bd] p-2.5 text-[#6e4d10]"><span className="text-[9px] font-black uppercase tracking-[.12em] opacity-55">Score oportunidad</span><b className="mt-1 block text-sm">{guide.opportunityScore}/95</b><small className="text-[10px] opacity-55">Guía comparativa</small></div></div>

                        {analysis ? <div className="mt-3 rounded-xl border border-[#d18b16]/20 bg-[#fff7dc] p-3"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#b7750c]" /><b className="text-xs">Commerce AI</b><span className="ml-auto rounded-full bg-white px-2 py-1 text-[9px] font-black">Demanda {analysis.estimatedDemand}/95</span></div><p className="mt-2 text-xs leading-5 text-black/55">{analysis.positioning}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-white px-2.5 py-1">IA: {money(analysis.recommendedPrice)}</span><span className="rounded-full bg-white px-2.5 py-1">Popularidad {analysis.estimatedPurchasePopularity}/95</span></div></div> : null}

                        <div className="mt-3 flex flex-wrap gap-2">{productId ? <button type="button" onClick={() => router.push(`/admin/productos?studio=${encodeURIComponent(productId)}`)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white"><CheckCircle2 className="h-4 w-4" />Abrir en Productos</button> : <><button type="button" onClick={() => void getAiAnalysis(ref)} disabled={!ref.price || analyzing || exporting} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f] disabled:opacity-45">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analizar IA</button><button type="button" onClick={() => void exportCandidate(ref, { analyze: true, open: true })} disabled={!ref.price || exporting || analyzing} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#111214] px-3 text-xs font-black text-white disabled:opacity-45">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 text-[#f5c75d]" />}Analizar + exportar</button></>}</div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" /><b>Referencia, no utilidad garantizada:</b> el precio encontrado en un marketplace puede ser precio minorista y no tu costo mayorista real. Cambia “Costo base” por tu costo real antes de decidir. La reserva operativa ayuda a simular costos adicionales, pero no reemplaza un cálculo tributario/contable completo.</div>
            </>
          ) : <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] p-6 text-center"><div><Search className="mx-auto h-8 w-8 text-black/15" /><p className="mt-3 text-sm font-black">Busca un producto para comenzar</p><p className="mt-1 max-w-md text-xs leading-5 text-black/35">El radar comparará precios y preparará candidatos que luego puedes abrir directamente en Product Studio.</p></div></div>}
        </>
      ) : null}

      {tab === 'tendencias' ? (
        <section className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">Mercado Libre Chile</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Tendencias para investigar</h2><p className="mt-1 text-xs text-black/40">Usa una tendencia como punto de partida y vuelve al radar para compararla.</p></div><button type="button" onClick={() => void loadTrends(true)} disabled={trendsLoading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-xs font-black">{trendsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Actualizar</button></div>
          {trendsLoading && !trends.length ? <div className="grid min-h-56 place-items-center text-sm text-black/35"><Loader2 className="h-5 w-5 animate-spin" /></div> : <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{trends.slice(0, 30).map((trend, index) => <button key={`${trend.keyword}-${index}`} type="button" onClick={() => { setTab('radar'); setQuery(trend.keyword); void runSearch(trend.keyword); }} className="flex items-center gap-3 rounded-xl border border-black/7 bg-[#f7efdf] p-3 text-left transition hover:border-[#d18b16]/35 hover:bg-[#fff4cf]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#111214] text-xs font-black text-[#f5c75d]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-black">{trend.keyword}</span><ArrowRight className="h-4 w-4 text-black/25" /></button>)}</div>}
        </section>
      ) : null}

      {tab === 'historico' ? (
        <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm"><p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">Consulta histórica</p><h2 className="mt-1 text-xl font-black">Evolución del precio</h2><p className="mt-2 text-xs leading-5 text-black/40">Los puntos aparecen cuando guardas snapshots desde el radar.</p><div className="mt-4 flex gap-2"><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder={query || 'panel SIP'} className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/8 bg-white px-3 text-sm font-semibold outline-none" /><button type="button" onClick={() => void loadHistory()} disabled={historyLoading} className="grid h-11 w-11 place-items-center rounded-xl bg-[#111214] text-[#f5c75d]">{historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button></div><button type="button" onClick={() => { setTab('radar'); if (historyQuery) { setQuery(historyQuery); void runSearch(historyQuery); } }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f]"><RefreshCw className="h-4 w-4" />Volver a consultar ahora</button></div>
          <div className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">{historyQuery || query || 'Sin consulta'}</p><h3 className="mt-1 text-xl font-black">Promedio observado</h3></div><History className="h-5 w-5 text-black/20" /></div><div className="mt-5 rounded-xl bg-[#f7efdf] p-4"><Sparkline values={historyValues} /></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="border-b border-black/8 text-[9px] font-black uppercase tracking-[.14em] text-black/30"><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Resultados</th><th className="px-3 py-3">Mínimo</th><th className="px-3 py-3">Promedio</th><th className="px-3 py-3">Mediana</th><th className="px-3 py-3">Máximo</th></tr></thead><tbody>{historyRows.map((row) => <tr key={row.id} className="border-b border-black/5"><td className="px-3 py-3 text-black/45">{new Date(row.created_at).toLocaleString('es-CL')}</td><td className="px-3 py-3 font-black">{row.refs_count}</td><td className="px-3 py-3">{money(row.stats.min)}</td><td className="px-3 py-3 font-black">{money(row.stats.avg)}</td><td className="px-3 py-3">{money(row.stats.median)}</td><td className="px-3 py-3">{money(row.stats.max)}</td></tr>)}</tbody></table>{!historyLoading && historyRows.length === 0 ? <p className="py-10 text-center text-xs text-black/35">Busca una consulta que tenga snapshots guardados.</p> : null}</div></div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-black/7 bg-[#111214] p-4 text-white shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#f5c75d]" /><b className="text-sm">Flujo conectado</b></div><p className="mt-1 text-xs leading-5 text-white/40">Inteligencia de Mercado descubre y calcula. Product Studio revisa IA, imágenes, precio, inventario, SEO y publicación final.</p></div><button type="button" onClick={() => router.push('/admin/productos')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#f5c75d] px-4 text-xs font-black text-[#111214]">Ir a Productos<ArrowRight className="h-4 w-4" /></button></div></section>
    </AdminPage>
  );
}
