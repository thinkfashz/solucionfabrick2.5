'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserRound,
  WalletCards,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DailyPoint = { date: string; label: string; visitors: number; pageViews: number; sales: number; failed: number; revenue: number };
type Incident = { id: string; customer: string; total: number; status: string; createdAt: string; kind: 'payment' | 'transfer' };
type DashboardPayload = {
  ok: boolean;
  profile: { email: string; name: string; role: string };
  stats: { products: number; orders: number; budgets: number; invoices: number; leads: number; revenue: number };
  commerce30d: { approvedSales: number; failedSales: number; pendingSales: number; transferPending: number; transferIssues: number; revenue: number; conversionRate: number };
  traffic30d: { visitors: number; pageViews: number; trackingAvailable: boolean };
  daily30d: DailyPoint[];
  incidents: Incident[];
  health: { app: string; db: string; latency_ms: number; realtime: string; last_deploy: string };
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function AnimatedNumber({ value, format }: { value: number; format?: (value: number) => string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const target = Number(value || 0);
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 620);
      setCurrent(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{format ? format(current) : current.toLocaleString('es-CL')}</>;
}

function KpiCard({ label, value, note, icon: Icon, dark = false, warning = false, format }: { label: string; value: number; note: string; icon: LucideIcon; dark?: boolean; warning?: boolean; format?: (value: number) => string }) {
  return (
    <article className={`relative overflow-hidden rounded-[1.7rem] p-4 shadow-[0_18px_60px_rgba(58,45,19,.10)] sm:p-5 ${dark ? 'bg-[#111214] text-[#fff7e7]' : warning ? 'bg-[#fff0e7] text-[#3a1711]' : 'bg-[#F2DFBB] text-[#111214]'}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${dark ? 'bg-yellow-300 text-black' : warning ? 'bg-[#ef6a52]/12 text-[#b63824]' : 'bg-black/[0.06] text-black'}`}><Icon className="h-5 w-5" /></span>
        <ArrowUpRight className={`h-4 w-4 ${dark ? 'text-yellow-300/55' : 'text-black/25'}`} />
      </div>
      <p className={`mt-5 text-[10px] font-black uppercase tracking-[.2em] ${dark ? 'text-[#fff7e7]/45' : 'text-black/42'}`}>{label}</p>
      <b className="mt-1 block text-[clamp(28px,5vw,42px)] font-black leading-none tracking-[-.06em]"><AnimatedNumber value={value} format={format} /></b>
      <p className={`mt-2 text-xs leading-5 ${dark ? 'text-[#fff7e7]/52' : 'text-black/50'}`}>{note}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen px-1 pb-28 sm:px-3 lg:pb-8">
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-4">
        <div className="h-48 rounded-[2.2rem] bg-[#F2DFBB]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 rounded-[1.7rem] bg-[#F2DFBB]" />)}</div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]"><div className="h-96 rounded-[2rem] bg-[#F2DFBB]" /><div className="h-96 rounded-[2rem] bg-[#F2DFBB]" /></div>
      </div>
    </main>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-[#111214] p-3 text-xs text-[#fff7e7] shadow-2xl">
      <p className="mb-2 font-black text-yellow-300">{label}</p>
      {payload.map((item) => <p key={item.name} className="mt-1 flex justify-between gap-5"><span className="text-white/55">{item.name}</span><b>{Number(item.value || 0).toLocaleString('es-CL')}</b></p>)}
    </div>
  );
}

function PerformanceChart({ data }: { data: DailyPoint[] }) {
  return (
    <article className="overflow-hidden rounded-[2rem] bg-[#F2DFBB] p-4 text-[#111214] shadow-[0_24px_80px_rgba(58,45,19,.11)] sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C97700]">Rendimiento diario</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Visitas y ventas · 30 días</h2></div>
        <span className="rounded-full bg-black/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-black/55">Datos reales</span>
      </header>
      <div className="mt-6 h-[300px] w-full sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <defs><linearGradient id="visitorCream" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d1912" stopOpacity={0.2} /><stop offset="95%" stopColor="#1d1912" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#2f281c" strokeOpacity={0.08} vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tick={{ fill: '#7c6f5a', fontSize: 10 }} />
            <YAxis yAxisId="traffic" tickLine={false} axisLine={false} tick={{ fill: '#7c6f5a', fontSize: 10 }} allowDecimals={false} />
            <YAxis yAxisId="sales" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#C97700', fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#08090A', opacity: 0.035 }} />
            <Area yAxisId="traffic" type="monotone" name="Visitantes" dataKey="visitors" stroke="#1d1912" strokeWidth={2.5} fill="url(#visitorCream)" />
            <Bar yAxisId="sales" name="Ventas" dataKey="sales" fill="#f4c430" radius={[7, 7, 2, 2]} maxBarSize={18} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.12em] text-black/45"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#1d1912]" />Visitantes únicos estimados</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-yellow-400" />Ventas aprobadas</span></div>
    </article>
  );
}

function PaymentHealth({ commerce }: { commerce: DashboardPayload['commerce30d'] }) {
  const total = Math.max(1, commerce.approvedSales + commerce.failedSales + commerce.pendingSales);
  const approved = Math.round((commerce.approvedSales / total) * 100);
  const pending = Math.round((commerce.pendingSales / total) * 100);
  const donut = { background: `conic-gradient(#111214 0 ${approved}%, #f4c430 ${approved}% ${approved + pending}%, #e76a52 ${approved + pending}% 100%)` };
  return (
    <article className="rounded-[2rem] bg-[#e9ddc4] p-5 text-[#111214] shadow-[0_24px_80px_rgba(58,45,19,.10)] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8a6218]">Salud de cobros</p>
      <h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Resultado de pagos</h2>
      <div className="mt-6 grid grid-cols-[126px_1fr] items-center gap-5">
        <div className="relative h-[126px] w-[126px] rounded-full p-[14px] shadow-inner" style={donut}><div className="grid h-full w-full place-items-center rounded-full bg-[#f8f0df]"><div className="text-center"><b className="block text-2xl">{approved}%</b><span className="text-[8px] font-black uppercase tracking-widest text-black/40">aprobado</span></div></div></div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-black/55"><i className="h-2.5 w-2.5 rounded-full bg-[#111214]" />Aprobadas</span><b>{commerce.approvedSales}</b></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-black/55"><i className="h-2.5 w-2.5 rounded-full bg-yellow-400" />Pendientes</span><b>{commerce.pendingSales}</b></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-black/55"><i className="h-2.5 w-2.5 rounded-full bg-[#e76a52]" />Fallidas</span><b>{commerce.failedSales}</b></div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/45 p-3"><span className="text-[9px] font-black uppercase tracking-widest text-black/40">Transferencias pendientes</span><b className="mt-1 block text-2xl">{commerce.transferPending}</b></div><div className="rounded-2xl bg-white/45 p-3"><span className="text-[9px] font-black uppercase tracking-widest text-black/40">Con error real</span><b className="mt-1 block text-2xl text-[#a93624]">{commerce.transferIssues}</b></div></div>
    </article>
  );
}

function QuickAction({ href, title, note, icon: Icon }: { href: string; title: string; note: string; icon: LucideIcon }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-[1.45rem] bg-[#F2DFBB] p-4 text-[#111214] shadow-[0_16px_50px_rgba(58,45,19,.08)] transition hover:-translate-y-1"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-yellow-300"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm">{title}</b><span className="mt-1 block truncate text-[11px] text-black/45">{note}</span></span><ArrowUpRight className="h-4 w-4 text-black/25 transition group-hover:text-black" /></Link>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/admin/dashboard/blue', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo cargar el centro de control.');
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error cargando el panel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(true); }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const commerce = data?.commerce30d || { approvedSales: 0, failedSales: 0, pendingSales: 0, transferPending: 0, transferIssues: 0, revenue: 0, conversionRate: 0 };
  const traffic = data?.traffic30d || { visitors: 0, pageViews: 0, trackingAvailable: false };
  const incidents = useMemo(() => data?.incidents || [], [data]);

  if (loading) return <DashboardSkeleton />;

  return (
    <main className="min-h-screen px-1 pb-28 text-[#111214] sm:px-3 lg:pb-8">
      <section className="mx-auto grid w-full max-w-[1500px] gap-4 sm:gap-5">
        {error ? <div className="rounded-2xl bg-[#fff0e7] p-4 text-sm font-semibold text-[#8d2f20]"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

        <header className="relative overflow-hidden rounded-[2.2rem] bg-[radial-gradient(circle_at_88%_14%,rgba(255, 176, 0,.55),transparent_24rem),linear-gradient(135deg,#fffaf0_0%,#eadabd_100%)] p-5 shadow-[0_30px_100px_rgba(58,45,19,.14)] sm:p-8">
          <div className="relative grid gap-7 xl:grid-cols-[1fr_420px] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-yellow-300">Centro de control</span><span className={`rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] ${data?.health.db === 'online' ? 'bg-emerald-700/10 text-emerald-800' : 'bg-red-600/10 text-red-700'}`}>{data?.health.db === 'online' ? 'Datos conectados' : 'Revisar conexión'}</span></div>
              <p className="mt-6 text-sm font-semibold text-black/55">Hola, {data?.profile.name || 'Administrador'}.</p>
              <h1 className="mt-2 max-w-3xl text-[clamp(38px,7vw,74px)] font-black leading-[.88] tracking-[-.075em]">Tu negocio, explicado de un vistazo.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-black/58">Ventas, visitas, cobros e incidencias de los últimos 30 días. Los pendientes se separan de los errores para que puedas actuar sin alarmas falsas.</p>
            </div>
            <div className="rounded-[1.8rem] bg-[#111214] p-5 text-[#fff7e7] shadow-[0_22px_60px_rgba(0,0,0,.20)]">
              <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Ventas aprobadas · 30 días</span><Banknote className="h-5 w-5 text-yellow-300" /></div>
              <b className="mt-4 block text-[clamp(38px,6vw,60px)] font-black leading-none tracking-[-.07em]">{money.format(commerce.revenue)}</b>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs"><span className="text-white/45">{commerce.approvedSales} operaciones aprobadas</span><span className="font-black text-yellow-300">{commerce.conversionRate}% conversión</span></div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label="Visitantes estimados" value={traffic.visitors} note={traffic.trackingAvailable ? `${traffic.pageViews} páginas vistas en 30 días` : 'Activa la tabla pwa_events desde Setup'} icon={UserRound} />
          <KpiCard label="Ventas aprobadas" value={commerce.approvedSales} note="Cobros confirmados en el período" icon={ShoppingBag} dark />
          <KpiCard label="Ventas fallidas" value={commerce.failedSales} note="Rechazadas, canceladas o reembolsadas" icon={XCircle} warning />
          <KpiCard label="Transferencias erróneas" value={commerce.transferIssues} note={`${commerce.transferPending} pendientes de validación, no son errores`} icon={WalletCards} warning={commerce.transferIssues > 0} />
        </section>

        {!traffic.trackingAvailable ? <div className="flex items-start gap-3 rounded-[1.5rem] bg-[#111214] p-4 text-sm leading-6 text-[#fff7e7]/65"><Eye className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" /><p><b className="text-white">Las visitas todavía no se pueden leer.</b> El código de seguimiento anónimo ya quedó preparado; ejecuta la alineación de base de datos desde Setup para crear `pwa_events`. Hasta entonces el panel muestra cero, no números inventados.</p></div> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
          <PerformanceChart data={data?.daily30d || []} />
          <PaymentHealth commerce={commerce} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <article className="rounded-[2rem] bg-[#F2DFBB] p-5 shadow-[0_24px_80px_rgba(58,45,19,.10)] sm:p-6">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#a46c09]">Atención requerida</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Cobros con problemas reales</h2></div><Link href="/admin/pagos" className="rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300">Ver pagos</Link></div>
            <div className="mt-5 space-y-2">
              {incidents.length ? incidents.map((incident) => <Link href={`/admin/pedidos/${encodeURIComponent(incident.id)}`} key={incident.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-[1.25rem] bg-black/[0.045] p-3 transition hover:bg-black/[0.075]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ef6a52]/12 text-[#a93624]">{incident.kind === 'transfer' ? <CreditCard className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><span className="min-w-0"><b className="block truncate text-sm">{incident.customer}</b><span className="mt-1 block truncate text-[10px] uppercase tracking-widest text-black/38">{incident.status} · {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('es-CL') : 'sin fecha'}</span></span><b className="text-sm">{money.format(incident.total)}</b></Link>) : <div className="rounded-[1.4rem] bg-emerald-700/[0.07] p-5 text-sm text-emerald-900"><CheckCircle2 className="mb-2 h-5 w-5" /><b>No hay cobros fallidos registrados en los últimos 30 días.</b><p className="mt-1 text-xs leading-5 opacity-65">Las transferencias pendientes se mantienen fuera de esta lista hasta que exista un error real.</p></div>}
            </div>
          </article>

          <aside className="rounded-[2rem] bg-[#d9c8a6] p-5 shadow-[0_24px_80px_rgba(58,45,19,.10)] sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-black/45">Estado operativo</p>
            <div className="mt-5 space-y-3">
              {[{ label: 'Aplicación', value: data?.health.app || 'sin datos', icon: Activity }, { label: 'Base de datos', value: `${data?.health.latency_ms || 0} ms`, icon: BarChart3 }, { label: 'Actualización', value: 'cada 60 s', icon: Clock3 }, { label: 'Versión', value: data?.health.last_deploy || 'local', icon: TrendingUp }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/38 p-3"><span className="flex items-center gap-2 text-xs font-semibold text-black/55"><Icon className="h-4 w-4" />{label}</span><b className="text-xs">{value}</b></div>)}
            </div>
            <button type="button" onClick={() => void load(true)} disabled={refreshing} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-xs font-black uppercase tracking-[.12em] text-yellow-300 disabled:opacity-55"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Actualizando' : 'Actualizar datos'}</button>
          </aside>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/admin/reportes" title="Reportes de ventas" note="Detalle y exportación de pedidos" icon={BarChart3} />
          <QuickAction href="/admin/pagos" title="Revisar cobros" note="Mercado Pago y transferencias" icon={CreditCard} />
          <QuickAction href="/admin/pedidos" title="Gestionar pedidos" note={`${data?.stats.orders || 0} pedidos registrados`} icon={Package} />
          <QuickAction href="/admin/presupuestos" title="Crear presupuesto" note={`${data?.stats.budgets || 0} presupuestos guardados`} icon={FileText} />
        </section>
      </section>
    </main>
  );
}
