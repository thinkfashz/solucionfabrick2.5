'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, CircleDollarSign, Gauge, Loader2, PackageSearch, RefreshCw, ShoppingCart, Sparkles, TriangleAlert } from 'lucide-react';

type Action = { id: string; priority: 'critical'|'high'|'medium'|'low'; area: string; title: string; detail: string; href: string; score: number };
type Brief = {
  generatedAt: string;
  periodDays: number;
  healthScore: number;
  headline: string;
  metrics: { visits: number; productViews: number; addToCart: number; checkout: number; orders: number; paidOrders: number; contacts: number; revenue: number; criticalStock: number; lowMargin: number; incompleteProducts: number };
  actions: Action[];
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CL');

export default function IntelligenceTodayPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/intelligence/today', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo generar el brief de hoy.');
      setBrief(json.brief);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error cargando Fabrick Intelligence.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function regenerate() {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/intelligence/today', { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo regenerar el brief.');
      setBrief(json.brief);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo regenerar.'); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#0f1015] px-4 py-5 text-white sm:px-6 lg:px-8">
    <section className="mx-auto max-w-[1500px] space-y-5">
      <header className="overflow-hidden rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.2),transparent_35%),linear-gradient(135deg,#191a22,#0b0c10)] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Intelligence</Link>
          <button onClick={() => void regenerate()} disabled={saving || loading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Regenerar brief</button>
        </div>
        <div className="mt-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4cf57] text-black"><Bot className="h-6 w-6"/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f4cf57]">Daily Operating Brief</p><p className="text-xs text-white/40">Fabrick Intelligence V2</p></div></div>
        <h1 className="mt-5 max-w-5xl text-4xl font-black tracking-[-.055em] sm:text-6xl">{brief?.headline || 'Qué debes mejorar hoy.'}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Prioriza decisiones usando conversión, stock, margen, catálogo y ventas. Fabrick propone; las acciones sensibles siguen pasando por aprobación.</p>
      </header>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"><TriangleAlert className="mr-2 inline h-4 w-4"/>{error}</div> : null}
      {loading ? <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]"/></div> : null}

      {brief && !loading ? <>
        <section className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
          <article className="rounded-[2rem] border border-[#f4cf57]/20 bg-[#f4cf57]/[0.06] p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">Health score</p><p className="mt-2 text-6xl font-black tracking-[-.06em]">{brief.healthScore}<span className="text-xl text-white/35">/100</span></p></div><Gauge className="h-10 w-10 text-[#f4cf57]"/></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#f4cf57]" style={{ width: `${brief.healthScore}%` }}/></div>
            <p className="mt-4 text-xs leading-6 text-white/45">Calculado a partir de las principales alertas comerciales y operativas de los últimos {brief.periodDays} días.</p>
          </article>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Visitas" value={number.format(brief.metrics.visits)} icon={Sparkles}/>
            <Metric label="Pedidos" value={number.format(brief.metrics.orders)} icon={ShoppingCart}/>
            <Metric label="Ingresos" value={money.format(brief.metrics.revenue)} icon={CircleDollarSign}/>
            <Metric label="Stock crítico" value={number.format(brief.metrics.criticalStock)} icon={PackageSearch}/>
          </section>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">Plan de acción</p><h2 className="mt-1 text-2xl font-black">Las 5 prioridades de mayor impacto</h2></div><Sparkles className="h-6 w-6 text-[#f4cf57]"/></div>
          <div className="mt-5 grid gap-3">
            {brief.actions.map((action, index) => <article key={action.id} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/7 text-sm font-black text-[#f4cf57]">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Priority value={action.priority}/><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/30">{action.area}</span></div><h3 className="mt-2 text-lg font-black">{action.title}</h3><p className="mt-1 text-sm leading-6 text-white/48">{action.detail}</p></div><Link href={action.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black">Resolver <ArrowRight className="h-4 w-4"/></Link></div></article>)}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Mini label="Producto → carrito" value={`${rate(brief.metrics.addToCart, brief.metrics.productViews)}%`}/>
          <Mini label="Carrito → checkout" value={`${rate(brief.metrics.checkout, brief.metrics.addToCart)}%`}/>
          <Mini label="Checkout → pedido" value={`${rate(brief.metrics.orders, brief.metrics.checkout)}%`}/>
          <Mini label="Margen en riesgo" value={String(brief.metrics.lowMargin)}/>
          <Mini label="Fichas incompletas" value={String(brief.metrics.incompleteProducts)}/>
        </section>

        <footer className="flex flex-col gap-2 rounded-[1.5rem] border border-white/8 bg-black/30 p-4 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>Generado {new Date(brief.generatedAt).toLocaleString('es-CL')}</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Automatización segura · sin cambios destructivos</span></footer>
      </> : null}
    </section>
  </main>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Sparkles }) { return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><Icon className="h-5 w-5 text-[#f4cf57]"/><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</p></article>; }
function Mini({ label, value }: { label: string; value: string }) { return <article className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4"><p className="text-[10px] font-black uppercase tracking-[.13em] text-white/35">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>; }
function Priority({ value }: { value: Action['priority'] }) { const cls = value === 'critical' ? 'bg-red-400/12 text-red-200' : value === 'high' ? 'bg-amber-300/12 text-amber-100' : value === 'medium' ? 'bg-sky-300/10 text-sky-100' : 'bg-emerald-400/10 text-emerald-200'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${cls}`}>{value}</span>; }
function rate(value: number, total: number) { return total > 0 ? Math.round((value / total) * 1000) / 10 : 0; }
