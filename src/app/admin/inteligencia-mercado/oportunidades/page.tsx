'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';

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
};

type MarketSnapshot = {
  query: string;
  normalizedQuery: string;
  refs: MarketRef[];
  stats: MarketStats;
};

type MarketOpportunity = {
  id: string;
  status: 'saved' | 'exported' | 'dismissed';
  query: string;
  normalizedQuery: string;
  source: string;
  sourceLabel: string;
  sourceId: string | null;
  sourceUrl: string;
  sourcePosition: number | null;
  title: string;
  imageUrl: string | null;
  currency: string;
  referencePrice: number;
  cost: number;
  marketMin: number | null;
  marketAvg: number | null;
  marketMedian: number | null;
  marketMax: number | null;
  markupPct: number;
  reservePct: number;
  suggestedPrice: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  opportunityScore: number;
  commerceAi: Record<string, unknown> | null;
  productId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Guide = {
  cost: number;
  sale: number;
  grossProfit: number;
  grossMargin: number;
  reserve: number;
  netProfit: number;
  netMargin: number;
  score: number;
};

const SOURCE_LABEL: Record<MarketSource, string> = {
  mercadolibre: 'Mercado Libre',
  serper: 'Google · Serper',
  serpapi: 'Google · SerpAPI',
};

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(numberValue(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function refKey(ref: MarketRef) {
  return `${ref.source}:${ref.sourceId || ref.url}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function calculateGuide(costInput: number, saleInput: number, reservePct: number, marketReference: number): Guide {
  const cost = Math.max(0, Math.round(costInput));
  const sale = Math.max(0, Math.round(saleInput));
  const grossProfit = sale - cost;
  const grossMargin = sale > 0 ? (grossProfit / sale) * 100 : 0;
  const reserve = Math.round(sale * clamp(reservePct, 0, 80) / 100);
  const netProfit = sale - cost - reserve;
  const netMargin = sale > 0 ? (netProfit / sale) * 100 : 0;
  const spread = marketReference > 0 ? ((marketReference - cost) / marketReference) * 100 : 0;
  const score = clamp(Math.round(45 + spread * 0.65 + clamp(netMargin, -50, 60) * 0.65), 5, 95);
  return { cost, sale, grossProfit, grossMargin, reserve, netProfit, netMargin, score };
}

function Metric({ label, value, note, icon: Icon, dark = false }: { label: string; value: string; note: string; icon: typeof Package; dark?: boolean }) {
  return <article className={`rounded-2xl border p-4 shadow-sm ${dark ? 'border-black bg-[#111214] text-white' : 'border-black/7 bg-[#fffaf0] text-[#111214]'}`}><div className="flex items-center justify-between"><span className={`text-[9px] font-black uppercase tracking-[.16em] ${dark ? 'text-white/35' : 'text-black/35'}`}>{label}</span><Icon className={`h-4 w-4 ${dark ? 'text-[#f5c75d]' : 'text-black/30'}`} /></div><p className="mt-3 truncate text-2xl font-black tracking-[-.04em]">{value}</p><p className={`mt-1 text-[11px] ${dark ? 'text-white/40' : 'text-black/40'}`}>{note}</p></article>;
}

export default function MarketOpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [searching, setSearching] = useState(false);
  const [markupPct, setMarkupPct] = useState(30);
  const [reservePct, setReservePct] = useState(12);
  const [searchCosts, setSearchCosts] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { cost: string; price: string }>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadOpportunities = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/market-intel/candidates?limit=300', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { opportunities?: MarketOpportunity[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar la bandeja.');
      const rows = Array.isArray(json.opportunities) ? json.opportunities : [];
      setOpportunities(rows);
      setDrafts((current) => {
        const next = { ...current };
        for (const row of rows) if (!next[row.id]) next[row.id] = { cost: String(row.cost || ''), price: String(row.suggestedPrice || '') };
        return next;
      });
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la bandeja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOpportunities(); }, [loadOpportunities]);

  async function runSearch() {
    const clean = query.trim();
    if (!clean) {
      setError('Escribe un producto o palabra clave.');
      return;
    }
    setSearching(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/market-intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: clean, sources: ['mercadolibre', 'serper'], persist: true, useCache: true, limitPerSource: 20 }),
      });
      const json = await response.json().catch(() => ({})) as { ok?: boolean; snapshot?: MarketSnapshot; error?: string };
      if (!response.ok || !json.ok || !json.snapshot) throw new Error(json.error || 'No se pudo buscar el mercado.');
      setSnapshot(json.snapshot);
      setSearchCosts({});
      setNotice(`Consulta guardada en histórico: ${json.snapshot.refs.length} referencias encontradas.`);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'No se pudo buscar el mercado.');
    } finally {
      setSearching(false);
    }
  }

  function guideForRef(ref: MarketRef) {
    const cost = Math.max(0, numberValue(searchCosts[refKey(ref)] ?? ref.price));
    const marketReference = Math.max(0, numberValue(snapshot?.stats.median) || numberValue(snapshot?.stats.avg) || numberValue(ref.price));
    const target = Math.round(cost * (1 + markupPct / 100));
    let sale = target;
    if (marketReference > 0 && cost > 0) {
      sale = cost >= marketReference ? marketReference : Math.max(cost, Math.min(target, Math.round(marketReference * 0.98)));
    }
    if (sale <= 0) sale = marketReference;
    return calculateGuide(cost, sale, reservePct, marketReference);
  }

  async function saveRef(ref: MarketRef, silent = false) {
    if (!snapshot || !ref.price || ref.price <= 0) return false;
    const key = refKey(ref);
    setBusyKeys((current) => Array.from(new Set([...current, key])));
    try {
      const guide = guideForRef(ref);
      const response = await fetch('/api/admin/market-intel/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: snapshot.query,
          normalizedQuery: snapshot.normalizedQuery,
          source: ref.source,
          sourceLabel: SOURCE_LABEL[ref.source],
          sourceId: ref.sourceId,
          sourceUrl: ref.url,
          sourcePosition: ref.position,
          title: ref.title,
          imageUrl: ref.image,
          currency: ref.currency || 'CLP',
          referencePrice: ref.price,
          cost: guide.cost,
          marketMin: snapshot.stats.min,
          marketAvg: snapshot.stats.avg,
          marketMedian: snapshot.stats.median,
          marketMax: snapshot.stats.max,
          markupPct,
          reservePct,
          suggestedPrice: guide.sale,
        }),
      });
      const json = await response.json().catch(() => ({})) as { opportunity?: MarketOpportunity; error?: string; reused?: boolean };
      if (!response.ok || !json.opportunity) throw new Error(json.error || 'No se pudo guardar el candidato.');
      setOpportunities((current) => {
        const next = current.filter((item) => item.id !== json.opportunity!.id);
        return [json.opportunity!, ...next].sort((a, b) => b.opportunityScore - a.opportunityScore);
      });
      setDrafts((current) => ({ ...current, [json.opportunity!.id]: { cost: String(json.opportunity!.cost), price: String(json.opportunity!.suggestedPrice) } }));
      if (!silent) setNotice(json.reused ? 'Oportunidad actualizada en la bandeja.' : 'Oportunidad guardada en la bandeja.');
      return true;
    } catch (saveError) {
      if (!silent) setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el candidato.');
      return false;
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== key));
    }
  }

  async function saveAll() {
    if (!snapshot) return;
    const refs = snapshot.refs.filter((ref) => ref.price && ref.price > 0).slice(0, 30);
    if (!refs.length) return;
    setNotice(`Guardando ${refs.length} referencias en la bandeja…`);
    let saved = 0;
    for (let index = 0; index < refs.length; index += 5) {
      const batch = refs.slice(index, index + 5);
      const results = await Promise.all(batch.map((ref) => saveRef(ref, true)));
      saved += results.filter(Boolean).length;
    }
    setNotice(`${saved} referencia${saved === 1 ? '' : 's'} guardada${saved === 1 ? '' : 's'} para comparar y decidir después.`);
  }

  async function patchOpportunity(id: string, patch: Record<string, unknown>, silent = false) {
    setBusyKeys((current) => Array.from(new Set([...current, id])));
    try {
      const response = await fetch('/api/admin/market-intel/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await response.json().catch(() => ({})) as { opportunity?: MarketOpportunity; error?: string };
      if (!response.ok || !json.opportunity) throw new Error(json.error || 'No se pudo actualizar la oportunidad.');
      setOpportunities((current) => current.map((item) => item.id === id ? json.opportunity! : item).sort((a, b) => b.opportunityScore - a.opportunityScore));
      setDrafts((current) => ({ ...current, [id]: { cost: String(json.opportunity!.cost), price: String(json.opportunity!.suggestedPrice) } }));
      if (!silent) setNotice('Rentabilidad actualizada.');
      return json.opportunity;
    } catch (patchError) {
      if (!silent) setError(patchError instanceof Error ? patchError.message : 'No se pudo actualizar la oportunidad.');
      return null;
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== id));
    }
  }

  async function updateNumbers(opportunity: MarketOpportunity) {
    const draft = drafts[opportunity.id] || { cost: String(opportunity.cost), price: String(opportunity.suggestedPrice) };
    await patchOpportunity(opportunity.id, { cost: numberValue(draft.cost), suggestedPrice: numberValue(draft.price) });
  }

  async function analyzeOpportunity(opportunity: MarketOpportunity) {
    setBusyKeys((current) => Array.from(new Set([...current, `ai:${opportunity.id}`])));
    setError('');
    try {
      const response = await fetch('/api/admin/products/ai-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: opportunity.title,
            description: `Oportunidad de mercado guardada para “${opportunity.query}”.`,
            category: opportunity.query,
            price: opportunity.suggestedPrice,
            cost: opportunity.cost,
            stock: 0,
            specifications: {
              market_min: opportunity.marketMin,
              market_avg: opportunity.marketAvg,
              market_median: opportunity.marketMedian,
              market_max: opportunity.marketMax,
            },
          },
        }),
      });
      const json = await response.json().catch(() => ({})) as { analysis?: Record<string, unknown>; error?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'La IA no pudo analizar esta oportunidad.');
      await patchOpportunity(opportunity.id, { commerceAi: json.analysis }, true);
      setNotice('Commerce AI terminó el análisis. El precio no cambió automáticamente.');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'No se pudo analizar la oportunidad.');
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== `ai:${opportunity.id}`));
    }
  }

  async function applyAiPrice(opportunity: MarketOpportunity) {
    const ai = record(opportunity.commerceAi);
    const recommended = numberValue(ai.recommendedPrice);
    if (recommended <= 0) return;
    await patchOpportunity(opportunity.id, { suggestedPrice: recommended });
  }

  async function exportOpportunity(opportunity: MarketOpportunity, options: { open?: boolean; silent?: boolean } = {}) {
    if (opportunity.productId) {
      if (options.open) router.push(`/admin/productos?studio=${encodeURIComponent(opportunity.productId)}`);
      return true;
    }
    setBusyKeys((current) => Array.from(new Set([...current, `export:${opportunity.id}`])));
    try {
      const ai = record(opportunity.commerceAi);
      const marketIntel = {
        query: opportunity.query,
        normalized_query: opportunity.normalizedQuery,
        source: opportunity.source,
        source_label: opportunity.sourceLabel,
        source_position: opportunity.sourcePosition,
        captured_at: opportunity.createdAt,
        market_min: opportunity.marketMin,
        market_avg: opportunity.marketAvg,
        market_median: opportunity.marketMedian,
        market_max: opportunity.marketMax,
        reference_cost: opportunity.cost,
        target_markup_percentage: opportunity.markupPct,
        operating_reserve_percentage: opportunity.reservePct,
        suggested_sale_price: opportunity.suggestedPrice,
        gross_profit_reference: opportunity.grossProfit,
        gross_margin_percentage: opportunity.grossMargin,
        estimated_net_profit_after_reserve: opportunity.netProfit,
        estimated_net_margin_percentage: opportunity.netMargin,
        opportunity_score: opportunity.opportunityScore,
        current_cost: opportunity.cost,
        current_sale_price: opportunity.suggestedPrice,
        current_estimated_net_profit: opportunity.netProfit,
        current_estimated_net_margin_percentage: opportunity.netMargin,
        last_reviewed_at: new Date().toISOString(),
        disclaimer: 'Referencia comercial basada en precios observados. Revisa costo mayorista real, comisiones, logística, impuestos, publicidad y devoluciones antes de publicar.',
      };
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(ai.title || opportunity.title),
          description: String(ai.longDescription || `Candidato exportado desde la bandeja de Inteligencia de Mercado para “${opportunity.query}”. Revisa proveedor, stock y condiciones antes de publicar.`),
          tagline: String(ai.shortDescription || 'Oportunidad de mercado · revisar antes de publicar'),
          price: opportunity.suggestedPrice,
          supplier_price: opportunity.cost || null,
          supplier_currency: opportunity.currency || 'CLP',
          shipping_fee: null,
          stock: 0,
          image_url: opportunity.imageUrl || null,
          activo: false,
          featured: false,
          source: opportunity.sourceLabel,
          source_url: opportunity.sourceUrl,
          source_id: opportunity.sourceId,
          specifications: {
            market_intel: marketIntel,
            default_markup_percentage: opportunity.markupPct,
            auto_markup_enabled: false,
            ...(opportunity.imageUrl ? { gallery_images: [opportunity.imageUrl], gallery_assets: [{ url: opportunity.imageUrl, source: opportunity.source }] } : {}),
            ...(opportunity.commerceAi ? { commerce_ai: opportunity.commerceAi } : {}),
          },
        }),
      });
      const json = await response.json().catch(() => ({})) as { product?: { id?: string }; error?: string };
      if (!response.ok || !json.product?.id) throw new Error(json.error || 'No se pudo crear el borrador en Productos.');
      const productId = String(json.product.id);
      await patchOpportunity(opportunity.id, { status: 'exported', productId }, true);
      if (!options.silent) setNotice('Producto guardado como borrador oculto en Product Studio.');
      if (options.open) router.push(`/admin/productos?studio=${encodeURIComponent(productId)}`);
      return true;
    } catch (exportError) {
      if (!options.silent) setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el producto.');
      return false;
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== `export:${opportunity.id}`));
    }
  }

  async function exportSelected() {
    const rows = opportunities.filter((item) => selected.includes(item.id) && item.status === 'saved' && !item.productId);
    if (!rows.length) return;
    setNotice(`Exportando ${rows.length} oportunidad${rows.length === 1 ? '' : 'es'} como borrador…`);
    let exported = 0;
    for (let index = 0; index < rows.length; index += 3) {
      const batch = rows.slice(index, index + 3);
      const results = await Promise.all(batch.map((row) => exportOpportunity(row, { silent: true })));
      exported += results.filter(Boolean).length;
    }
    setSelected([]);
    setNotice(`${exported} producto${exported === 1 ? '' : 's'} enviado${exported === 1 ? '' : 's'} a Product Studio.`);
  }

  async function dismissOpportunity(id: string) {
    setBusyKeys((current) => Array.from(new Set([...current, id])));
    try {
      const response = await fetch(`/api/admin/market-intel/candidates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo descartar.');
      setOpportunities((current) => current.filter((item) => item.id !== id));
      setSelected((current) => current.filter((item) => item !== id));
      setNotice('Oportunidad retirada de la bandeja. El historial queda registrado.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo descartar.');
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== id));
    }
  }

  const saved = useMemo(() => opportunities.filter((item) => item.status === 'saved'), [opportunities]);
  const exported = useMemo(() => opportunities.filter((item) => item.status === 'exported'), [opportunities]);
  const profitable = useMemo(() => saved.filter((item) => item.netProfit > 0), [saved]);
  const avgMargin = useMemo(() => profitable.length ? profitable.reduce((sum, item) => sum + item.netMargin, 0) / profitable.length : 0, [profitable]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="overflow-hidden rounded-[1.9rem] border border-black/7 bg-[#fffaf0] shadow-sm">
        <div className="grid gap-5 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Bandeja persistente</span><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-800">Historial de decisiones</span></div><h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-5xl">Guarda oportunidades antes de convertirlas en inventario.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-black/45">Puedes acumular productos de distintas búsquedas, corregir el costo real, comparar margen, pedir un análisis de IA y exportar solo los que realmente te convengan.</p></div>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => router.push('/admin/productos')} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white"><Package className="h-4 w-4 text-[#f5c75d]" />Abrir Product Studio<ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void loadOpportunities()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-xs font-black"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button><button type="button" onClick={() => void exportSelected()} disabled={!selected.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f] disabled:opacity-45"><Save className="h-4 w-4" />Exportar selección</button></div>
        </div>
      </section>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric label="En bandeja" value={String(saved.length)} note="Pendientes de decisión" icon={Target} />
        <Metric label="Rentables" value={String(profitable.length)} note="Utilidad estimada positiva" icon={TrendingUp} />
        <Metric label="Margen neto medio" value={`${avgMargin.toFixed(1)}%`} note="Solo oportunidades positivas" icon={Percent} />
        <Metric label="Exportados" value={String(exported.length)} note="Borradores en Productos" icon={Package} />
        <Metric label="Seleccionados" value={String(selected.length)} note="Listos para exportar" icon={Check} dark />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#b87811]" /><p className="text-[9px] font-black uppercase tracking-[.18em] text-black/35">Buscar y añadir</p></div>
          <div className="mt-3 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} placeholder="Ej. nivel láser 360, atornillador, aire inverter" className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold outline-none focus:border-[#d18b16]" /><button type="button" onClick={() => void runSearch()} disabled={searching} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#111214] px-5 text-xs font-black text-white disabled:opacity-50">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-[#f5c75d]" />}Buscar</button></div>
          {snapshot ? <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-black/40"><span><b className="text-black">{snapshot.refs.length}</b> referencias</span><span>Mediana <b className="text-black">{money(snapshot.stats.median)}</b></span><button type="button" onClick={() => void saveAll()} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#fff0bd] px-3 py-2 font-black text-[#76500f]"><Save className="h-3.5 w-3.5" />Guardar todos con precio</button></div> : null}
        </div>
        <div className="rounded-2xl border border-black/7 bg-[#111214] p-4 text-white shadow-sm sm:p-5"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#f5c75d]" /><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/40">Guía para nuevos candidatos</p></div><div className="mt-4 grid grid-cols-2 gap-3"><label><span className="text-[10px] font-bold text-white/45">Markup</span><div className="mt-1 flex min-h-11 items-center rounded-xl bg-white/8 px-3"><input type="number" min="0" max="300" value={markupPct} onChange={(event) => setMarkupPct(clamp(numberValue(event.target.value), 0, 300))} className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none" /><Percent className="h-4 w-4 text-[#f5c75d]" /></div></label><label><span className="text-[10px] font-bold text-white/45">Reserva</span><div className="mt-1 flex min-h-11 items-center rounded-xl bg-white/8 px-3"><input type="number" min="0" max="80" value={reservePct} onChange={(event) => setReservePct(clamp(numberValue(event.target.value), 0, 80))} className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none" /><Percent className="h-4 w-4 text-[#f5c75d]" /></div></label></div><p className="mt-3 text-[11px] leading-5 text-white/35">La reserva simula costos operativos. El costo real del proveedor sigue siendo el dato más importante para decidir.</p></div>
      </section>

      {snapshot ? <section className="space-y-3"><div className="flex items-center justify-between px-1"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Resultado actual</p><h2 className="mt-1 text-xl font-black">{snapshot.query}</h2></div><span className="text-xs font-bold text-black/35">Edita costo antes de guardar</span></div><div className="grid gap-3 xl:grid-cols-2">{snapshot.refs.filter((ref) => ref.price && ref.price > 0).slice(0, 20).map((ref) => {
        const key = refKey(ref);
        const guide = guideForRef(ref);
        const busy = busyKeys.includes(key);
        return <article key={key} className="overflow-hidden rounded-2xl border border-black/7 bg-[#fffaf0] shadow-sm"><div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4"><div className="h-28 overflow-hidden rounded-xl bg-[#f1e8d8] sm:h-32">{ref.image ? <img src={ref.image} alt={ref.title} className="h-full w-full object-contain p-1" /> : <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-black/15" /></div>}</div><div className="min-w-0"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><span className="rounded-full bg-[#f4e9cf] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#78520f]">{SOURCE_LABEL[ref.source]}</span><h3 className="mt-2 line-clamp-2 text-sm font-black leading-5">{ref.title}</h3></div><a href={ref.url} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/8 bg-white text-black/35"><ExternalLink className="h-4 w-4" /></a></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f1e8d8] p-2.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Referente</span><b className="mt-1 block text-sm">{money(ref.price)}</b></div><div className="rounded-xl bg-[#111214] p-2.5 text-white"><span className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">Venta guía</span><b className="mt-1 block text-sm text-[#f5c75d]">{money(guide.sale)}</b></div></div></div></div><div className="border-t border-black/7 bg-[#f8f1e5] p-3 sm:p-4"><div className="grid gap-2 sm:grid-cols-4"><label><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Costo real</span><div className="mt-1 flex min-h-10 items-center rounded-xl border border-black/8 bg-white px-3"><span className="mr-1 text-xs text-black/30">$</span><input inputMode="numeric" value={searchCosts[key] ?? String(ref.price || '')} onChange={(event) => setSearchCosts((current) => ({ ...current, [key]: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" /></div></label><div className="rounded-xl bg-white p-2.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Ganancia bruta</span><b className={`mt-1 block text-sm ${guide.grossProfit < 0 ? 'text-red-700' : ''}`}>{money(guide.grossProfit)}</b><small className="text-[10px] text-black/35">{guide.grossMargin.toFixed(1)}%</small></div><div className={`rounded-xl p-2.5 ${guide.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}><span className="text-[9px] font-black uppercase tracking-[.12em] opacity-50">Utilidad estimada</span><b className="mt-1 block text-sm">{money(guide.netProfit)}</b><small className="text-[10px] opacity-55">{guide.netMargin.toFixed(1)}%</small></div><div className="rounded-xl bg-[#fff0bd] p-2.5 text-[#6f4e10]"><span className="text-[9px] font-black uppercase tracking-[.12em] opacity-55">Score</span><b className="mt-1 block text-sm">{guide.score}/95</b><small className="text-[10px] opacity-55">Comparativo</small></div></div><button type="button" onClick={() => void saveRef(ref)} disabled={busy} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#111214] px-3 text-xs font-black text-white disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#f5c75d]" />}Guardar en bandeja</button></div></article>;
      })}</div></section> : null}

      <section className="space-y-3"><div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Bandeja guardada</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Oportunidades para decidir</h2><p className="mt-1 text-xs text-black/40">Se conservan entre búsquedas y sesiones. Puedes cambiar costo y precio antes de exportar.</p></div>{selected.length ? <button type="button" onClick={() => void exportSelected()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white"><Package className="h-4 w-4 text-[#f5c75d]" />Exportar {selected.length}</button> : null}</div>

        {loading ? <div className="grid min-h-52 place-items-center rounded-2xl border border-black/7 bg-[#fffaf0]"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div> : saved.length === 0 ? <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] p-6 text-center"><div><Target className="mx-auto h-8 w-8 text-black/15" /><p className="mt-3 text-sm font-black">Todavía no hay oportunidades guardadas.</p><p className="mt-1 text-xs text-black/35">Haz una búsqueda arriba y guarda los productos que quieras comparar.</p></div></div> : <div className="grid gap-3 xl:grid-cols-2">{saved.map((opportunity) => {
          const draft = drafts[opportunity.id] || { cost: String(opportunity.cost), price: String(opportunity.suggestedPrice) };
          const preview = calculateGuide(numberValue(draft.cost), numberValue(draft.price), opportunity.reservePct, numberValue(opportunity.marketMedian) || opportunity.suggestedPrice);
          const ai = record(opportunity.commerceAi);
          const aiPrice = numberValue(ai.recommendedPrice);
          const selectedNow = selectedSet.has(opportunity.id);
          const updating = busyKeys.includes(opportunity.id);
          const analyzing = busyKeys.includes(`ai:${opportunity.id}`);
          const exportingNow = busyKeys.includes(`export:${opportunity.id}`);
          return <article key={opportunity.id} className={`overflow-hidden rounded-2xl border bg-[#fffaf0] shadow-sm transition ${selectedNow ? 'border-[#d18b16]/55 ring-2 ring-[#d18b16]/10' : 'border-black/7'}`}><div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4"><button type="button" onClick={() => setSelected((current) => current.includes(opportunity.id) ? current.filter((id) => id !== opportunity.id) : [...current, opportunity.id])} className="relative h-28 overflow-hidden rounded-xl bg-[#f1e8d8] sm:h-32">{opportunity.imageUrl ? <img src={opportunity.imageUrl} alt={opportunity.title} className="h-full w-full object-contain p-1" /> : <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-black/15" /></div>}<span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg shadow ${selectedNow ? 'bg-[#111214] text-[#f5c75d]' : 'bg-white/90 text-black/20'}`}>{selectedNow ? <Check className="h-4 w-4" /> : null}</span></button><div className="min-w-0"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><span className="rounded-full bg-[#fff0bd] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#76500f]">{opportunity.sourceLabel}</span><h3 className="mt-2 line-clamp-2 text-sm font-black leading-5">{opportunity.title}</h3><p className="mt-1 truncate text-[10px] text-black/35">Búsqueda: {opportunity.query}</p></div><a href={opportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/8 bg-white text-black/35"><ExternalLink className="h-4 w-4" /></a></div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-[#f1e8d8] p-2"><span className="block text-[8px] font-black uppercase tracking-[.1em] text-black/30">Mediana</span><b className="mt-1 block truncate text-xs">{money(opportunity.marketMedian)}</b></div><div className="rounded-xl bg-white p-2"><span className="block text-[8px] font-black uppercase tracking-[.1em] text-black/30">Costo</span><b className="mt-1 block truncate text-xs">{money(opportunity.cost)}</b></div><div className="rounded-xl bg-[#111214] p-2 text-white"><span className="block text-[8px] font-black uppercase tracking-[.1em] text-white/35">Score</span><b className="mt-1 block text-xs text-[#f5c75d]">{opportunity.opportunityScore}/95</b></div></div></div></div><div className="border-t border-black/7 bg-[#f8f1e5] p-3 sm:p-4"><div className="grid gap-2 sm:grid-cols-2"><label><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Costo proveedor</span><div className="mt-1 flex min-h-10 items-center rounded-xl border border-black/8 bg-white px-3"><span className="mr-1 text-xs text-black/30">$</span><input inputMode="numeric" value={draft.cost} onChange={(event) => setDrafts((current) => ({ ...current, [opportunity.id]: { ...draft, cost: event.target.value } }))} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" /></div></label><label><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30">Precio de venta</span><div className="mt-1 flex min-h-10 items-center rounded-xl border border-black/8 bg-white px-3"><span className="mr-1 text-xs text-black/30">$</span><input inputMode="numeric" value={draft.price} onChange={(event) => setDrafts((current) => ({ ...current, [opportunity.id]: { ...draft, price: event.target.value } }))} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" /></div></label></div><div className="mt-2 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white p-2.5"><span className="text-[8px] font-black uppercase tracking-[.1em] text-black/30">Ganancia bruta</span><b className={`mt-1 block text-sm ${preview.grossProfit < 0 ? 'text-red-700' : ''}`}>{money(preview.grossProfit)}</b><small className="text-[9px] text-black/35">{preview.grossMargin.toFixed(1)}%</small></div><div className={`rounded-xl p-2.5 ${preview.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}><span className="text-[8px] font-black uppercase tracking-[.1em] opacity-50">Utilidad estimada</span><b className="mt-1 block text-sm">{money(preview.netProfit)}</b><small className="text-[9px] opacity-55">{preview.netMargin.toFixed(1)}%</small></div><div className="rounded-xl bg-[#fff0bd] p-2.5 text-[#6e4d10]"><span className="text-[8px] font-black uppercase tracking-[.1em] opacity-55">Reserva</span><b className="mt-1 block text-sm">{money(preview.reserve)}</b><small className="text-[9px] opacity-55">{opportunity.reservePct}%</small></div></div><button type="button" onClick={() => void updateNumbers(opportunity)} disabled={updating} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-black/8 bg-white px-3 text-[10px] font-black disabled:opacity-45">{updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Actualizar cálculo guardado</button>{opportunity.commerceAi ? <div className="mt-3 rounded-xl border border-[#d18b16]/20 bg-[#fff7dc] p-3"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#b7750c]" /><b className="text-xs">Commerce AI</b>{aiPrice > 0 ? <span className="ml-auto rounded-full bg-white px-2 py-1 text-[9px] font-black">{money(aiPrice)}</span> : null}</div><p className="mt-2 text-xs leading-5 text-black/55">{String(ai.positioning || ai.marginNote || 'Análisis comercial guardado.')}</p>{aiPrice > 0 ? <button type="button" onClick={() => void applyAiPrice(opportunity)} className="mt-2 rounded-lg bg-white px-3 py-2 text-[10px] font-black">Aplicar precio IA</button> : null}</div> : null}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => void analyzeOpportunity(opportunity)} disabled={analyzing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#fff0bd] px-3 text-xs font-black text-[#76500f] disabled:opacity-45">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analizar IA</button><button type="button" onClick={() => void exportOpportunity(opportunity, { open: true })} disabled={exportingNow} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#111214] px-3 text-xs font-black text-white disabled:opacity-45">{exportingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 text-[#f5c75d]" />}Exportar + abrir</button></div><button type="button" onClick={() => void dismissOpportunity(opportunity.id)} disabled={updating} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg text-[10px] font-black text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Descartar de la bandeja</button></div></article>;
        })}</div>}
      </section>

      {exported.length ? <section className="rounded-2xl border border-black/7 bg-[#efe6d6] p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Ya exportados</p><h3 className="mt-1 text-lg font-black">{exported.length} borrador{exported.length === 1 ? '' : 'es'} conectado{exported.length === 1 ? '' : 's'} a Productos</h3></div><button type="button" onClick={() => router.push('/admin/productos')} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white"><Package className="h-4 w-4 text-[#f5c75d]" />Ver catálogo</button></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{exported.slice(0, 12).map((item) => <button key={item.id} type="button" onClick={() => item.productId && router.push(`/admin/productos?studio=${encodeURIComponent(item.productId)}`)} className="min-w-[220px] max-w-[280px] rounded-xl border border-black/8 bg-white p-3 text-left"><p className="truncate text-xs font-black">{item.title}</p><p className="mt-1 text-[10px] text-black/35">{money(item.suggestedPrice)} · margen {item.netMargin.toFixed(1)}%</p></button>)}</div></section> : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" /><b>La utilidad es una guía:</b> usa el costo real que te entrega el proveedor. El sistema descuenta la reserva operacional configurada, pero no reemplaza el cálculo contable, tributario ni logístico definitivo.</div>
    </AdminPage>
  );
}
