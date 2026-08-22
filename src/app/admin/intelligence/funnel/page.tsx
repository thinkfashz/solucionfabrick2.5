'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleDollarSign, Contact, Loader2, RefreshCw, ShoppingCart, Store, TrendingUp } from 'lucide-react';

type Payload = {
  generatedAt: string;
  periodDays: number;
  summary: {
    revenue?: number;
    averageOrderValue?: number;
    paidOrders?: number;
  };
  funnel: {
    visits: number;
    productViews: number;
    addToCart: number;
    checkout: number;
    orders: number;
    paidOrders: number;
    contacts: number;
    rates: {
      visitToProduct: number;
      productToCart: number;
      cartToCheckout: number;
      checkoutToOrder: number;
      visitToOrder: number;
      visitToContact: number;
    };
  };
  error?: string;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CL');

export default function IntelligenceFunnelPage() {
  const [days, setDays] = useState('30');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/intelligence?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el embudo.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el embudo.');
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const steps = useMemo(() => data ? [
    { label: 'Visitas', value: data.funnel.visits, rate: 100, icon: TrendingUp },
    { label: 'Producto visto', value: data.funnel.productViews, rate: data.funnel.rates.visitToProduct, icon: Store },
    { label: 'Añadido al carrito', value: data.funnel.addToCart, rate: data.funnel.rates.productToCart, icon: ShoppingCart },
    { label: 'Checkout', value: data.funnel.checkout, rate: data.funnel.rates.cartToCheckout, icon: CircleDollarSign },
    { label: 'Pedido', value: data.funnel.orders, rate: data.funnel.rates.checkoutToOrder, icon: ArrowRight },
  ] : [], [data]);

  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.15),transparent_35%),#171820] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Fabrick Intelligence</Link>
          <div className="flex gap-2">
            <select value={days} onChange={(event) => setDays(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white [&>option]:bg-[#171820]"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select>
            <button onClick={() => void load()} className="grid h-11 w-11 place-items-center rounded-xl bg-[#f4cf57] text-black"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
          </div>
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">V2 · Conversion Intelligence</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-6xl">De la visita a la venta.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Detecta exactamente dónde se pierde la gente: producto, carrito, checkout, pedido o contacto.</p>
      </header>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
      {loading ? <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]"/></div> : null}

      {data && !loading ? <>
        <section className="grid gap-3 md:grid-cols-4">
          <Kpi label="Conversión a pedido" value={`${data.funnel.rates.visitToOrder}%`} note={`${number.format(data.funnel.orders)} pedidos / ${number.format(data.funnel.visits)} visitas`}/>
          <Kpi label="Conversión a contacto" value={`${data.funnel.rates.visitToContact}%`} note={`${number.format(data.funnel.contacts)} contactos registrados`}/>
          <Kpi label="Ventas pagadas" value={money.format(data.summary.revenue || 0)} note={`${number.format(data.summary.paidOrders || 0)} pedidos pagados`}/>
          <Kpi label="Ticket promedio" value={money.format(data.summary.averageOrderValue || 0)} note="Promedio de pedidos pagados"/>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><TrendingUp className="h-5 w-5 text-[#f4cf57]"/><div><h2 className="text-xl font-black">Embudo comercial</h2><p className="text-xs text-white/35">El porcentaje muestra la conversión desde el paso anterior.</p></div></div>
          <div className="space-y-3">{steps.map((step, index) => {
            const width = data.funnel.visits > 0 ? Math.max(4, (step.value / data.funnel.visits) * 100) : 4;
            const Icon = step.icon;
            return <article key={step.label} className="rounded-2xl border border-white/7 bg-black/20 p-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4cf57]/10 text-[#f4cf57]"><Icon className="h-4 w-4"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><b>{step.label}</b><span className="text-sm font-black text-[#f4cf57]">{number.format(step.value)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-[#f4cf57]" style={{ width: `${width}%` }}/></div><p className="mt-2 text-[11px] text-white/35">{index === 0 ? '100% base' : `${step.rate}% desde el paso anterior`}</p></div></div>
            </article>;
          })}</div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Insight icon={Store} title="Producto → carrito" rate={data.funnel.rates.productToCart} good={data.funnel.rates.productToCart >= 3} action="Si está bajo, revisa precio, fotos, envío, confianza y CTA." href="/admin/productos"/>
          <Insight icon={ShoppingCart} title="Carrito → checkout" rate={data.funnel.rates.cartToCheckout} good={data.funnel.rates.cartToCheckout >= 30} action="Si cae aquí, simplifica carrito y costos antes de pedir datos." href="/admin/intelligence/operations"/>
          <Insight icon={Contact} title="Checkout → pedido" rate={data.funnel.rates.checkoutToOrder} good={data.funnel.rates.checkoutToOrder >= 30} action="Si está bajo, revisa pagos, errores, envío y fricción del formulario." href="/admin/observabilidad"/>
        </section>
      </> : null}
    </section>
  </main>;
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f4cf57]">{label}</p><p className="mt-3 text-3xl font-black tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-white/35">{note}</p></article>;
}

function Insight({ icon: Icon, title, rate, good, action, href }: { icon: typeof Store; title: string; rate: number; good: boolean; action: string; href: string }) {
  return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center justify-between gap-3"><Icon className="h-5 w-5 text-[#f4cf57]"/><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${good ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}>{rate}%</span></div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{action}</p><Link href={href} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#f4cf57]">Revisar <ArrowRight className="h-4 w-4"/></Link></article>;
}
