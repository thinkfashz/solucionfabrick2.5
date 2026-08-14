'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Bot, Boxes, CheckCircle2, CircleDollarSign, Gauge, Loader2, MousePointerClick, PackageSearch, RefreshCw, ShieldCheck, ShoppingCart, Sparkles, Users } from 'lucide-react';

type Severity = 'high' | 'medium' | 'low';
type Product = { id: string; name?: string | null; stock?: number | null; price?: number | string | null; supplier_price?: number | string | null; image_url?: string | null; margin?: number | null };
type Payload = {
  generatedAt: string;
  periodDays: number;
  summary: { pageViews: number; visitors: number; sessions: number; contacts: number; productViews: number; addToCart: number; checkoutStarts: number; orders: number; activeProducts: number; criticalStock: number; runtimeErrorsHour: number };
  pages: Array<{ name: string; value: number }>;
  sources: Array<{ name: string; value: number }>;
  products: { criticalStock: Product[]; incomplete: Product[]; lowMargin: Product[] };
  errors: Array<{ id?: string; error_message?: string | null; endpoint?: string | null; status_code?: number | null; created_at?: string | null }>;
  recommendations: Array<{ severity: Severity; title: string; detail: string; href?: string }>;
  permissions: { mode: string; readOnlyAnalytics: boolean; productChangesRequireExplicitApproval: boolean; secretsAccessible: boolean; paymentCredentialsAccessible: boolean };
};

const fmt = new Intl.NumberFormat('es-CL');

function Metric({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Users }) {
  return <article className="rounded-[1.6rem] border border-white/8 bg-white/[0.045] p-5"><div className="flex items-center justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4cf57] text-black"><Icon className="h-5 w-5" /></span><b className="text-3xl tracking-[-.05em] text-white">{fmt.format(value)}</b></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">{label}</p><p className="mt-1 text-xs leading-5 text-white/45">{note}</p></article>;
}

function SeverityDot({ level }: { level: Severity }) {
  const cls = level === 'high' ? 'bg-red-400' : level === 'medium' ? 'bg-amber-300' : 'bg-emerald-400';
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

export default function FabrickIntelligencePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/intelligence?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Fabrick Intelligence.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el panel.');
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return <main className="min-h-screen bg-[#111217] px-4 pb-24 pt-4 text-white sm:px-6 lg:px-8">
    <section className="mx-auto max-w-[1500px]">
      <header className="overflow-hidden rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.18),transparent_34%),linear-gradient(135deg,#171820,#0c0d11)] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full border border-[#f4cf57]/30 bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f4cf57]"><Bot className="h-4 w-4" /> Fabrick Intelligence</span><h1 className="mt-4 max-w-5xl text-4xl font-black tracking-[-.055em] sm:text-6xl">Tu sitio, tienda y operación en un solo centro de decisiones.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Modo copiloto: observa tráfico, errores, stock y oportunidades. Los cambios de productos siguen requiriendo aprobación explícita.</p></div><div className="flex gap-2"><select value={days} onChange={(e) => setDays(e.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white outline-none [&>option]:bg-[#171820]"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select><button onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4cf57] text-black"><RefreshCw className="h-4 w-4" /></button></div></div>
      </header>

      {loading ? <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]" /></div> : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}

      {data && !loading ? <div className="mt-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Vistas" value={data.summary.pageViews} note="Páginas vistas en el periodo" icon={MousePointerClick}/><Metric label="Visitantes" value={data.summary.visitors} note="Usuarios anónimos únicos" icon={Users}/><Metric label="Contactos" value={data.summary.contacts} note="Leads y eventos de contacto" icon={Activity}/><Metric label="Pedidos" value={data.summary.orders} note="Pedidos creados" icon={ShoppingCart}/><Metric label="Productos" value={data.summary.activeProducts} note="Catálogo activo" icon={Boxes}/><Metric label="Errores/h" value={data.summary.runtimeErrorsHour} note="Errores registrados última hora" icon={Gauge}/></section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">Prioridades</p><h2 className="mt-1 text-2xl font-black">Qué deberías revisar ahora</h2></div><Sparkles className="h-6 w-6 text-[#f4cf57]" /></div><div className="mt-5 space-y-3">{data.recommendations.map((item, index) => <div key={`${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-white/7 bg-black/20 p-4"><SeverityDot level={item.severity}/><div className="min-w-0 flex-1"><p className="font-black">{item.title}</p><p className="mt-1 text-sm leading-6 text-white/50">{item.detail}</p></div>{item.href ? <Link href={item.href} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8 text-[#f4cf57]"><ArrowRight className="h-4 w-4"/></Link> : null}</div>)}</div></article>

          <article className="rounded-[2rem] border border-[#f4cf57]/18 bg-[#f4cf57]/[0.06] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4cf57] text-black"><ShieldCheck className="h-5 w-5"/></span><div><p className="font-black">Control seguro</p><p className="text-xs text-white/45">Permisos actuales del agente</p></div></div><div className="mt-5 space-y-3 text-sm"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Analítica y rendimiento: lectura</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Productos: propuesta + aprobación</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Secretos y credenciales: bloqueados</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/> Credenciales de pago: bloqueadas</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/admin/productos" className="rounded-2xl bg-[#f4cf57] px-4 py-3 text-center text-xs font-black uppercase tracking-[.14em] text-black">Gestionar productos</Link><Link href="/admin/analitica" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[.14em] text-white">Analítica completa</Link></div></article>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <ListCard title="Páginas más vistas" icon={MousePointerClick} items={data.pages}/><ListCard title="Principales orígenes" icon={Users} items={data.sources}/>
          <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center gap-3"><PackageSearch className="h-5 w-5 text-[#f4cf57]"/><h3 className="text-lg font-black">Salud del catálogo</h3></div><div className="mt-5 space-y-3"><HealthRow label="Stock crítico" value={data.products.criticalStock.length} warn={data.products.criticalStock.length > 0}/><HealthRow label="Fichas incompletas" value={data.products.incomplete.length} warn={data.products.incomplete.length > 0}/><HealthRow label="Margen bajo 25%" value={data.products.lowMargin.length} warn={data.products.lowMargin.length > 0}/></div><Link href="/admin/productos" className="mt-5 flex items-center justify-between rounded-2xl bg-white/7 px-4 py-3 text-sm font-black"><span>Abrir catálogo</span><ArrowRight className="h-4 w-4 text-[#f4cf57]"/></Link></article>
        </section>

        <section className="grid gap-5 xl:grid-cols-2"><ProductTable title="Stock crítico" products={data.products.criticalStock}/><ProductTable title="Margen bajo" products={data.products.lowMargin}/></section>

        <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-[#f4cf57]"/><div><h2 className="text-xl font-black">Errores recientes</h2><p className="text-xs text-white/40">Última hora según admin_error_logs</p></div></div>{data.errors.length ? <div className="mt-5 space-y-3">{data.errors.map((item, index) => <div key={`${item.id || index}`} className="rounded-2xl border border-white/7 bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#f4cf57]"><span>{item.status_code || 'ERR'}</span><span>•</span><span>{item.endpoint || 'runtime'}</span></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">{item.error_message || 'Error sin detalle'}</p></div>)}</div> : <p className="mt-5 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-200">Sin errores registrados durante la última hora.</p>}</section>

        <footer className="flex flex-col gap-3 rounded-[1.5rem] border border-white/8 bg-black/30 p-4 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</span><span>Fabrick Intelligence · modo copiloto seguro</span></footer>
      </div> : null}
    </section>
  </main>;
}

function ListCard({ title, icon: Icon, items }: { title: string; icon: typeof Users; items: Array<{ name: string; value: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#f4cf57]"/><h3 className="text-lg font-black">{title}</h3></div><div className="mt-5 space-y-4">{items.slice(0, 7).map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-white/55">{item.name}</span><b>{fmt.format(item.value)}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-[#f4cf57]" style={{ width: `${Math.max(5, item.value / max * 100)}%` }}/></div></div>)}</div></article>;
}

function HealthRow({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3"><span className="text-sm text-white/55">{label}</span><b className={warn ? 'text-amber-300' : 'text-emerald-300'}>{value}</b></div>;
}

function ProductTable({ title, products }: { title: string; products: Product[] }) {
  return <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black">{title}</h3><CircleDollarSign className="h-5 w-5 text-[#f4cf57]"/></div>{products.length ? <div className="mt-4 space-y-2">{products.slice(0, 8).map((product) => <Link key={product.id} href={`/admin/productos/${product.id}/editar`} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 transition hover:bg-black/35">{product.image_url ? <img src={product.image_url} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1"/> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/8"><PackageSearch className="h-4 w-4"/></span>}<span className="min-w-0 flex-1"><b className="block truncate text-sm">{product.name || 'Producto'}</b><span className="text-[11px] text-white/40">Stock: {product.stock ?? 0}{typeof product.margin === 'number' ? ` · Margen: ${product.margin}%` : ''}</span></span><ArrowRight className="h-4 w-4 text-[#f4cf57]"/></Link>)}</div> : <p className="mt-4 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-200">Sin alertas en esta categoría.</p>}</article>;
}
