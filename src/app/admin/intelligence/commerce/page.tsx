'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, Loader2, PackagePlus, Search, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';

type Ranked = {
  name: string;
  description?: string | null;
  supplier?: string | null;
  supplierUrl?: string | null;
  supplierPrice: number;
  marketPrice?: number | null;
  stock?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  specifications?: Record<string, unknown> | null;
  suggestedPrice: number;
  marginPercent: number;
  score: number;
  duplicateRisk: 'low' | 'medium' | 'high';
  reasons: string[];
};

type RankResponse = { ok?: boolean; ranked?: Ranked[]; catalogCompared?: number; received?: number; error?: string };

const SAMPLE = JSON.stringify([
  {
    name: 'Taladro inalámbrico 20V Brushless',
    description: 'Taladro atornillador inalámbrico con motor brushless y dos baterías.',
    supplier: 'Proveedor ejemplo',
    supplierUrl: 'https://proveedor.example/producto-1',
    supplierPrice: 54990,
    marketPrice: 84990,
    stock: 18,
    imageUrl: 'https://images.example/taladro.webp',
    category: 'Herramientas',
    specifications: { voltaje: '20V', motor: 'Brushless' }
  },
  {
    name: 'Nivel láser 12 líneas verde',
    description: 'Nivel láser autonivelante para obra y terminaciones.',
    supplier: 'Proveedor ejemplo',
    supplierPrice: 69990,
    marketPrice: 109990,
    stock: 7,
    category: 'Herramientas'
  }
], null, 2);

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CommerceAgentPage() {
  const [raw, setRaw] = useState(SAMPLE);
  const [markup, setMarkup] = useState(30);
  const [minimumMargin, setMinimumMargin] = useState(25);
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [catalogCompared, setCatalogCompared] = useState(0);

  const parsedCount = useMemo(() => {
    try { const value = JSON.parse(raw); return Array.isArray(value) ? value.length : 0; } catch { return 0; }
  }, [raw]);

  async function analyze() {
    setLoading(true); setError(''); setMessage('');
    try {
      const candidates = JSON.parse(raw);
      const response = await fetch('/api/admin/intelligence/commerce/rank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates, markupPercent: markup, minimumMarginPercent: minimumMargin }),
      });
      const json = await response.json() as RankResponse;
      if (!response.ok) throw new Error(json.error || 'No se pudieron analizar los candidatos.');
      setRanked(json.ranked || []);
      setCatalogCompared(json.catalogCompared || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON o candidatos inválidos.');
    } finally { setLoading(false); }
  }

  async function proposal(candidate: Ranked) {
    setCreating(candidate.name); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/intelligence/proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'product.create',
            payload: {
              name: candidate.name,
              description: candidate.description || `Producto recomendado por Fabrick Intelligence. Proveedor: ${candidate.supplier || 'por confirmar'}.`,
              supplier: candidate.supplier || null,
              supplierUrl: candidate.supplierUrl || null,
              supplierPrice: candidate.supplierPrice,
              price: candidate.suggestedPrice,
              stock: candidate.stock || 0,
              image_url: candidate.imageUrl || null,
              specifications: {
                ...(candidate.specifications || {}),
                commerce_agent_score: candidate.score,
                commerce_agent_market_price: candidate.marketPrice || null,
                commerce_agent_category_hint: candidate.category || null,
              },
            },
          },
          context: { supplierPrice: candidate.supplierPrice },
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || json.decision?.reasons?.join(' ') || 'No se pudo guardar la propuesta.');
      setMessage(`Propuesta creada para “${candidate.name}”. Ya está en la cola de aprobación.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la propuesta.');
    } finally { setCreating(''); }
  }

  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.18),transparent_34%),#171820] p-6 sm:p-8">
        <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Fabrick Intelligence</Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]"><Bot className="h-4 w-4"/> V2 · Commerce Agent</span><h1 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Compara antes de comprar o publicar.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Recibe candidatos de proveedores o investigación, compara margen, disponibilidad, precio de mercado y duplicados del catálogo; luego convierte solo la opción elegida en propuesta.</p></div><Link href="/admin/intelligence/proposals" className="rounded-2xl border border-[#f4cf57]/30 bg-[#f4cf57]/10 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-[#f4cf57]">Cola de aprobación</Link></div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-3"><Search className="h-5 w-5 text-[#f4cf57]"/><div><h2 className="text-xl font-black">Candidatos</h2><p className="text-xs text-white/40">JSON compatible con el importador actual</p></div></div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={21} spellCheck={false} className="mt-5 w-full rounded-2xl border border-white/8 bg-black/25 p-4 font-mono text-xs leading-6 text-white/75 outline-none focus:border-[#f4cf57]/40"/>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-white/50">Candidatos<input value={parsedCount} readOnly className="mt-2 h-11 w-full rounded-xl bg-white/5 px-3 font-black text-white"/></label><label className="text-xs font-bold text-white/50">Markup %<input type="number" value={markup} onChange={(e) => setMarkup(Math.max(0, Number(e.target.value) || 0))} className="mt-2 h-11 w-full rounded-xl bg-white/5 px-3 font-black text-white outline-none"/></label><label className="text-xs font-bold text-white/50">Margen mínimo %<input type="number" value={minimumMargin} onChange={(e) => setMinimumMargin(Math.max(0, Number(e.target.value) || 0))} className="mt-2 h-11 w-full rounded-xl bg-white/5 px-3 font-black text-white outline-none"/></label></div>
          <button onClick={() => void analyze()} disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4cf57] text-sm font-black text-black disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Analizar y elegir las 4 mejores</button>
          <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-xs leading-6 text-emerald-100/75"><ShieldCheck className="mr-2 inline h-4 w-4"/> Esta pantalla no publica nada. El producto seleccionado entra primero a la cola de aprobación y se vuelve a validar al ejecutar.</div>
          {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"><TriangleAlert className="mr-2 inline h-4 w-4"/>{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4"/>{message}</p> : null}
        </article>

        <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">Ranking comercial</p><h2 className="mt-1 text-2xl font-black">Top 4 recomendados</h2></div><span className="text-xs text-white/35">{catalogCompared ? `${catalogCompared} productos comparados` : 'Sin análisis aún'}</span></div>
          {ranked.length ? <div className="mt-5 space-y-4">{ranked.map((item, index) => <div key={`${item.name}-${index}`} className="rounded-[1.7rem] border border-white/8 bg-black/20 p-4 sm:p-5"><div className="flex gap-4">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-white object-contain p-2"/> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/6 text-2xl font-black text-[#f4cf57]">#{index + 1}</div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f4cf57] px-2.5 py-1 text-[10px] font-black text-black">Score {item.score}/100</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.duplicateRisk === 'high' ? 'bg-red-400/15 text-red-200' : item.duplicateRisk === 'medium' ? 'bg-amber-300/15 text-amber-100' : 'bg-emerald-400/15 text-emerald-200'}`}>Duplicado: {item.duplicateRisk}</span></div><h3 className="mt-2 text-lg font-black">{item.name}</h3><p className="mt-1 text-xs text-white/40">{item.supplier || 'Proveedor por confirmar'} · stock {item.stock ?? 'N/D'}</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2"><Mini label="Costo" value={money.format(item.supplierPrice)}/><Mini label="Venta sugerida" value={money.format(item.suggestedPrice)}/><Mini label="Margen" value={`${item.marginPercent}%`}/></div>
            <div className="mt-4 space-y-1 text-xs leading-5 text-white/45">{item.reasons.slice(0, 4).map((reason) => <p key={reason}>• {reason}</p>)}</div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">{item.supplierUrl ? <a href={item.supplierUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black"><ExternalLink className="h-4 w-4"/> Ver proveedor</a> : null}<button onClick={() => void proposal(item)} disabled={creating === item.name} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black disabled:opacity-50">{creating === item.name ? <Loader2 className="h-4 w-4 animate-spin"/> : <PackagePlus className="h-4 w-4"/>} Convertir en propuesta</button></div>
          </div>)}</div> : <div className="mt-8 grid min-h-[520px] place-items-center rounded-[1.7rem] border border-dashed border-white/10 bg-black/10 p-8 text-center"><div><Search className="mx-auto h-10 w-10 text-[#f4cf57]"/><p className="mt-4 font-black">Todavía no hay candidatos clasificados.</p><p className="mt-2 max-w-md text-sm leading-6 text-white/40">Carga datos del proveedor o resultados de investigación y Fabrick Intelligence devolverá las cuatro opciones más prometedoras.</p></div></div>}
        </article>
      </section>
    </section>
  </main>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 p-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>;
}
