'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Clock3,
  FileText,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

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

function Action({ href, title, note, icon: Icon }: { href: string; title: string; note: string; icon: typeof Package }) {
  return (
    <Link href={href} className="group flex items-center gap-3 border-b border-black/10 py-3 last:border-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-[#ffb000]"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><b className="block text-sm text-[#171612]">{title}</b><span className="mt-0.5 block truncate text-xs text-[#817a6f]">{note}</span></span>
      <ArrowUpRight className="h-4 w-4 text-black/25 transition group-hover:text-black" />
    </Link>
  );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el panel.');
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

  const incidents = useMemo(() => data?.incidents || [], [data]);
  const commerce = data?.commerce30d;
  const traffic = data?.traffic30d;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Centro operativo"
        title={data?.profile?.name ? `Hola, ${data.profile.name}` : 'Centro de control'}
        description="Una vista compacta del negocio: ventas, tráfico, oportunidades, incidencias y estado técnico, sin paneles duplicados."
        actions={<>
          <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-bold text-[#171612]"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Actualizar</button>
          <Link href="/admin/intelligence/today" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-bold text-[#ffb000]"><Sparkles className="h-4 w-4" />Prioridades de hoy</Link>
        </>}
      />

      {error ? <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {loading ? <div className="h-1 overflow-hidden rounded-full bg-black/5"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#ffb000]" /></div> : null}

      <AdminStats>
        <AdminStat label="Ingresos 30 días" value={money.format(commerce?.revenue || data?.stats.revenue || 0)} note={`${commerce?.approvedSales || 0} ventas aprobadas`} icon={Banknote} />
        <AdminStat label="Visitantes" value={(traffic?.visitors || 0).toLocaleString('es-CL')} note={`${(traffic?.pageViews || 0).toLocaleString('es-CL')} vistas registradas`} icon={Users} />
        <AdminStat label="Conversión" value={`${commerce?.conversionRate || 0}%`} note="Visita → venta aprobada" icon={TrendingUp} />
        <AdminStat label="Leads" value={(data?.stats.leads || 0).toLocaleString('es-CL')} note="Oportunidades comerciales" icon={UserRound} />
      </AdminStats>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_.45fr]">
        <AdminSurface title="Rendimiento · 30 días" description="Visitantes y ventas en una sola lectura.">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily30d || []} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                <defs><linearGradient id="adminTraffic" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c77a00" stopOpacity={0.22}/><stop offset="95%" stopColor="#c77a00" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid vertical={false} strokeOpacity={0.08} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tick={{ fontSize: 10, fill: '#817a6f' }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#817a6f' }} />
                <Tooltip />
                <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="#171612" strokeWidth={2.2} fill="url(#adminTraffic)" />
                <Area type="monotone" dataKey="sales" name="Ventas" stroke="#c77a00" strokeWidth={2.2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminSurface>

        <AdminSurface title="Acciones frecuentes" description="Atajos a tareas operativas, no a páginas duplicadas.">
          <Action href="/admin/productos" title="Gestionar productos" note={`${data?.stats.products || 0} productos en catálogo`} icon={Package} />
          <Action href="/admin/pedidos" title="Revisar pedidos" note={`${data?.stats.orders || 0} pedidos registrados`} icon={ShoppingBag} />
          <Action href="/admin/crm" title="Trabajar pipeline" note={`${data?.stats.leads || 0} leads`} icon={UserRound} />
          <Action href="/admin/cotizaciones" title="Cotizaciones" note={`${data?.stats.budgets || 0} solicitudes`} icon={FileText} />
        </AdminSurface>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminSurface title="Incidencias de cobro" description="Solo situaciones que requieren atención.">
          {incidents.length ? <div className="divide-y divide-black/10">{incidents.slice(0, 6).map((incident) => <div key={incident.id} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-[#c77a00]"><AlertTriangle className="h-4 w-4" /></span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-[#171612]">{incident.customer || 'Cliente'}</b><span className="text-xs text-[#817a6f]">{incident.kind === 'transfer' ? 'Transferencia' : 'Pago'} · {incident.status}</span></div><b className="text-sm text-[#171612]">{money.format(incident.total || 0)}</b></div>)}</div> : <p className="py-8 text-center text-sm text-[#817a6f]">No hay incidencias pendientes.</p>}
        </AdminSurface>

        <AdminSurface title="Estado de plataforma" description="Salud técnica resumida para operar sin ruido.">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <div><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">App</span><b className="mt-1 block text-sm text-[#171612]">{data?.health.app || '—'}</b></div>
            <div><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Base de datos</span><b className="mt-1 block text-sm text-[#171612]">{data?.health.db || '—'}</b></div>
            <div><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Latencia</span><b className="mt-1 block text-sm text-[#171612]">{data?.health.latency_ms ?? '—'} ms</b></div>
            <div><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Realtime</span><b className="mt-1 block text-sm text-[#171612]">{data?.health.realtime || '—'}</b></div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4 text-xs text-[#817a6f]"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Último deploy: {data?.health.last_deploy || '—'}</span><Link href="/admin/estado" className="font-bold text-[#8b5a08]">Ver diagnóstico →</Link></div>
        </AdminSurface>
      </div>
    </AdminPage>
  );
}
