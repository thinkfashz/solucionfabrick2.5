'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BadgePercent, BarChart3, Check, Loader2, PackageSearch, Save, Search, Sparkles, Star, WandSparkles } from 'lucide-react';

type Placement = 'best_seller' | 'featured' | 'promotion' | 'catalog';

type Product = {
  id: string;
  name: string;
  description?: string;
  tagline?: string;
  price: number | string;
  supplier_price?: number | string | null;
  stock?: number;
  image_url?: string;
  category_id?: string;
  featured?: boolean;
  rating?: number;
  discount_percentage?: number;
  specifications?: Record<string, unknown> | null;
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

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function specs(product: Product) {
  return product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications) ? product.specifications : {};
}

function merchandising(product: Product) {
  const value = specs(product).merchandising;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function placementOf(product: Product): Placement {
  const placement = String(merchandising(product).placement || 'catalog');
  return ['best_seller', 'featured', 'promotion', 'catalog'].includes(placement) ? placement as Placement : product.featured ? 'featured' : 'catalog';
}

function orderOf(product: Product) {
  const value = Number(merchandising(product).order || 999);
  return Number.isFinite(value) ? value : 999;
}

function scoreStars(value: number) {
  return Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < Math.round(value) ? 'fill-[#F5871F] text-[#F5871F]' : 'text-[#08090A]/15'}`} />);
}

const LABELS: Record<Placement, string> = {
  best_seller: 'Más vendidos',
  featured: 'Destacados',
  promotion: 'Promociones',
  catalog: 'Catálogo general',
};

export default function ProductMerchandisingStudio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CommerceAnalysis | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await response.json() as { products?: Product[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar los productos.');
      setProducts(json.products || []);
      setSelectedId((current) => current || json.products?.[0]?.id || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selected = products.find((product) => product.id === selectedId) || null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => !normalized || `${product.name} ${product.description || ''} ${product.category_id || ''}`.toLowerCase().includes(normalized));
  }, [products, query]);

  const grouped = useMemo(() => {
    const result = {} as Record<Placement, Product[]>;
    (Object.keys(LABELS) as Placement[]).forEach((placement) => {
      result[placement] = products.filter((product) => placementOf(product) === placement).sort((a, b) => orderOf(a) - orderOf(b));
    });
    return result;
  }, [products]);

  async function patchProduct(product: Product, patch: Record<string, unknown>) {
    const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(json.error || 'No se pudo guardar el producto.');
  }

  async function setPlacement(product: Product, placement: Placement) {
    setSaving(true);
    try {
      const nextOrder = grouped[placement].length + 1;
      const nextSpecs = { ...specs(product), merchandising: { ...merchandising(product), placement, order: nextOrder } };
      await patchProduct(product, { specifications: nextSpecs, featured: placement === 'featured', discount_percentage: placement === 'promotion' ? Math.max(5, Number(product.discount_percentage || 10)) : product.discount_percentage || 0 });
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, specifications: nextSpecs, featured: placement === 'featured', discount_percentage: placement === 'promotion' ? Math.max(5, Number(item.discount_percentage || 10)) : item.discount_percentage } : item));
      setMessage(`${product.name} ahora aparece en ${LABELS[placement]}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo mover el producto.');
    } finally { setSaving(false); }
  }

  async function move(product: Product, direction: -1 | 1) {
    const placement = placementOf(product);
    const list = grouped[placement];
    const index = list.findIndex((item) => item.id === product.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return;
    const other = list[swapIndex];
    setSaving(true);
    try {
      const productSpecs = { ...specs(product), merchandising: { ...merchandising(product), order: swapIndex + 1 } };
      const otherSpecs = { ...specs(other), merchandising: { ...merchandising(other), order: index + 1 } };
      await Promise.all([patchProduct(product, { specifications: productSpecs }), patchProduct(other, { specifications: otherSpecs })]);
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, specifications: productSpecs } : item.id === other.id ? { ...item, specifications: otherSpecs } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cambiar el orden.');
    } finally { setSaving(false); }
  }

  async function analyzeProduct() {
    if (!selected) return;
    setAnalyzing(true);
    setAnalysis(null);
    setMessage('La IA está analizando precio, clasificación, descripción y demanda estimada…');
    try {
      const response = await fetch('/api/admin/products/ai-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { name: selected.name, description: selected.description, category: selected.category_id, price: selected.price, cost: selected.supplier_price, stock: selected.stock, specifications: selected.specifications } }),
      });
      const json = await response.json() as { analysis?: CommerceAnalysis; warning?: string; error?: string };
      if (!response.ok || !json.analysis) throw new Error(json.error || 'No se pudo analizar el producto.');
      setAnalysis(json.analysis);
      setMessage(json.warning || 'Análisis privado listo. Revisa los rangos antes de aplicar cambios.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo analizar el producto.');
    } finally { setAnalyzing(false); }
  }

  async function applyAnalysis() {
    if (!selected || !analysis) return;
    setSaving(true);
    try {
      const nextSpecs = {
        ...specs(selected),
        commerce_ai: {
          generated_at: new Date().toISOString(),
          price_low: analysis.priceLow,
          price_mid: analysis.priceMid,
          price_high: analysis.priceHigh,
          recommended_price: analysis.recommendedPrice,
          estimated_demand: analysis.estimatedDemand,
          estimated_purchase_popularity: analysis.estimatedPurchasePopularity,
          buyer_profile: analysis.buyerProfile,
          positioning: analysis.positioning,
          evidence_note: analysis.evidenceNote,
          tags: analysis.tags,
        },
      };
      await patchProduct(selected, { name: analysis.title, description: analysis.longDescription, tagline: analysis.shortDescription, price: analysis.recommendedPrice, rating: analysis.rating, specifications: nextSpecs });
      setProducts((current) => current.map((product) => product.id === selected.id ? { ...product, name: analysis.title, description: analysis.longDescription, tagline: analysis.shortDescription, price: analysis.recommendedPrice, rating: analysis.rating, specifications: nextSpecs } : product));
      setMessage('Análisis aplicado. El rango completo permanece privado dentro del producto.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo aplicar el análisis.');
    } finally { setSaving(false); }
  }

  return (
    <section className="mb-8 rounded-[2.2rem] bg-[#08090A] p-5 text-[#FFF9EE] shadow-2xl sm:p-7">
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F5871F]/18 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F2DFBB]"><PackageSearch className="h-3.5 w-3.5" /> Editor comercial</span>
          <h2 className="mt-4 text-3xl font-black tracking-[-.05em] sm:text-5xl">Decide qué vende primero.</h2>
          <p className="mt-3 text-sm leading-7 text-white/55">Organiza la vitrina, mueve posiciones y analiza cada producto sin mezclar estimaciones privadas con reseñas o ventas reales.</p>
          <label className="mt-5 flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3"><Search className="h-4 w-4 text-[#FFB000]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" /></label>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {loading ? <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#FFB000]" /></div> : filtered.map((product) => (
              <button key={product.id} type="button" onClick={() => { setSelectedId(product.id); setAnalysis(null); }} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selectedId === product.id ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white/6 hover:bg-white/10'}`}>
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{product.name}</b><span className="mt-1 block text-[10px] opacity-60">{money(product.price)} · {LABELS[placementOf(product)]}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#FFF9EE] p-5 text-[#08090A] sm:p-6">
          {selected ? <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F5871F]">Producto seleccionado</p><h3 className="mt-2 text-2xl font-black">{selected.name}</h3><div className="mt-2 flex items-center gap-2">{scoreStars(selected.rating || 0)}<span className="text-xs text-[#BFB8AC]">{selected.rating || 0}/5</span></div></div><button type="button" onClick={() => void analyzeProduct()} disabled={analyzing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#08090A] px-5 text-xs font-black text-white disabled:opacity-45">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-[#FFB000]" />} Analizar con IA</button></div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">{(Object.keys(LABELS) as Placement[]).map((placement) => <button key={placement} type="button" onClick={() => void setPlacement(selected, placement)} className={`rounded-2xl px-3 py-3 text-[10px] font-black ${placementOf(selected) === placement ? 'bg-[#F5871F] text-[#08090A]' : 'bg-white text-[#BFB8AC]'}`}>{LABELS[placement]}</button>)}</div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">Posición en {LABELS[placementOf(selected)]}</p><p className="mt-1 text-sm font-bold">Lugar {grouped[placementOf(selected)].findIndex((item) => item.id === selected.id) + 1} de {grouped[placementOf(selected)].length}</p></div><div className="flex gap-2"><button onClick={() => void move(selected, -1)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F2DFBB]"><ArrowUp className="h-4 w-4" /></button><button onClick={() => void move(selected, 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F2DFBB]"><ArrowDown className="h-4 w-4" /></button></div></div>

            {analysis ? <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">{[['Inicial', analysis.priceLow], ['Medio', analysis.priceMid], ['Máximo', analysis.priceHigh], ['Recomendado', analysis.recommendedPrice]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white p-4"><p className="text-[8px] font-black uppercase tracking-[.15em] text-[#F5871F]">{label}</p><b className="mt-2 block text-lg">{money(value)}</b></div>)}</div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-4"><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]"><BarChart3 className="h-4 w-4" /> Demanda estimada</p><b className="mt-2 block text-3xl">{analysis.estimatedDemand}%</b><p className="mt-2 text-xs leading-5 text-[#BFB8AC]">{analysis.evidenceNote}</p></div><div className="rounded-2xl bg-white p-4"><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]"><BadgePercent className="h-4 w-4" /> Compra estimada</p><b className="mt-2 block text-3xl">{analysis.estimatedPurchasePopularity}%</b><p className="mt-2 text-xs leading-5 text-[#BFB8AC]">{analysis.marginNote}</p></div></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">Clasificación y descripción sugerida</p><h4 className="mt-2 text-lg font-black">{analysis.title}</h4><p className="mt-2 text-xs leading-6 text-[#BFB8AC]">{analysis.longDescription}</p><div className="mt-3 flex flex-wrap gap-1.5">{analysis.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F2DFBB] px-3 py-1 text-[8px] font-black">{tag}</span>)}</div></div>
              <button type="button" onClick={() => void applyAnalysis()} disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-5 text-sm font-black text-white disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#FFB000]" />} Aplicar precio, título y clasificación</button>
            </div> : <div className="mt-5 rounded-2xl bg-white p-5 text-sm leading-7 text-[#BFB8AC]"><Sparkles className="h-5 w-5 text-[#F5871F]" /><p className="mt-2">El análisis es privado. Los porcentajes no se publican en la tienda y no se presentan como ventas o búsquedas reales.</p></div>}
          </> : null}
        </div>
      </div>
      {message ? <p className="mt-5 rounded-2xl bg-white/7 px-4 py-3 text-xs leading-6 text-white/65">{message}</p> : null}
    </section>
  );
}
