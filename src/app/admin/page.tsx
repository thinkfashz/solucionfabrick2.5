'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Megaphone,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react';
import { insforge } from '@/lib/insforge';
import SyncStatusButton from '@/components/admin/SyncStatusButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminPage as AdminPageShell, AdminPageHeader, AdminCard, AdminMotion, LiveDot } from '@/components/admin/ui';
import {
  formatCLP,
  normalizeOrderRecord,
  normalizeOrderStatus,
  orderStatusColor,
  orderStatusLabel,
  shortRecordId,
  type NormalizedOrderRecord,
  type OrderStatus,
} from '@/lib/commerce';

interface DashboardProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  featured?: boolean;
  activo?: boolean;
  category_id?: string;
  created_at?: string;
}

interface DashboardDelivery {
  id: string;
  order_id: string;
  customer_name?: string;
  status: string;
  responsible?: string;
  estimated_date?: string;
  updated_at?: string;
}

interface DashboardEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  href: string;
  amount?: number;
  icon: LucideIcon;
  status?: OrderStatus;
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeAgo(value: string | number) {
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'recién';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'hace segundos';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const startedAt = performance.now();
    const from = value;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

function MetricCard({ title, value, note, icon: Icon, trend = 'neutral' }: { title: string; value: string | number; note: string; icon: LucideIcon; trend?: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Sparkles;
  return (
    <AdminCard className="group p-4 sm:p-5" glow>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-black text-white sm:text-3xl">{value}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400"><TrendIcon className="h-3.5 w-3.5 text-yellow-300" />{note}</p>
        </div>
        <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-yellow-300 transition group-hover:scale-105 group-hover:bg-yellow-300/15">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </AdminCard>
  );
}

function ActionCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: LucideIcon }) {
  return (
    <Button asChild variant="outline" className="group h-auto justify-start whitespace-normal rounded-3xl border-white/10 bg-black/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-yellow-300/40 hover:bg-yellow-300/5 hover:text-white">
      <Link href={href}>
        <div className="flex w-full items-start gap-3">
          <span className="rounded-2xl bg-yellow-300/10 p-2 text-yellow-300"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-white">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span>
          </span>
          <ArrowRight className="mt-1 h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-300" />
        </div>
      </Link>
    </Button>
  );
}

function ProgressBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  const safeValue = Math.max(4, Math.min(100, value));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-zinc-300">{label}</span>
        <span className="text-zinc-500">{hint}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-white shadow-[0_0_20px_rgba(250,204,21,0.45)] transition-all duration-700" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<NormalizedOrderRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DashboardDelivery[]>([]);
  const [leadsToday, setLeadsToday] = useState(0);
  const [activityFeed, setActivityFeed] = useState<{ id: string; ts: number; customer: string; total: number; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('administrador');
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [productResponse, orderResponse, deliveryResponse, leadsResponse] = await Promise.allSettled([
      insforge.database.from('products').select('id, name, price, stock, featured, activo, category_id, created_at').order('created_at', { ascending: false }).limit(250),
      insforge.database.from('orders').select('id, customer_name, customer_email, customer_phone, region, shipping_address, items, subtotal, tax, shipping_fee, total, currency, status, created_at, updated_at, payment_id, payment_status').order('created_at', { ascending: false }).limit(250),
      insforge.database.from('deliveries').select('id, order_id, customer_name, status, responsible, estimated_date, updated_at').order('updated_at', { ascending: false }).limit(200),
      insforge.database.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    ]);

    const productResult = productResponse.status === 'fulfilled' ? productResponse.value : null;
    const orderResult = orderResponse.status === 'fulfilled' ? orderResponse.value : null;
    const deliveryResult = deliveryResponse.status === 'fulfilled' ? deliveryResponse.value : null;
    const firstError = productResult?.error?.message || orderResult?.error?.message || deliveryResult?.error?.message;

    if (firstError) setError(firstError);
    setProducts((productResult?.data ?? []) as DashboardProduct[]);
    setOrders(((orderResult?.data ?? []) as Record<string, unknown>[]).map((order) => normalizeOrderRecord(order)));
    setDeliveries((deliveryResult?.data ?? []) as DashboardDelivery[]);
    setLeadsToday(leadsResponse.status === 'fulfilled' && !leadsResponse.value.error && typeof leadsResponse.value.count === 'number' ? leadsResponse.value.count : 0);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetch('/api/admin/me').then((res) => res.json()).then((data) => { if (data?.email) setAdminEmail(data.email); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;
    void loadDashboard();
    (async () => {
      try {
        await insforge.realtime.connect();
        const subscription = await insforge.realtime.subscribe('orders');
        if (!disposed && subscription.ok) {
          setConnected(true);
          insforge.realtime.on('INSERT_order', (payload: unknown) => {
            if (disposed || !payload || typeof payload !== 'object') return;
            const record = payload as Record<string, unknown>;
            setActivityFeed((prev) => [{ id: String(record.id ?? Date.now()), ts: Date.now(), customer: String(record.customer_name ?? 'Cliente'), total: Number(record.total) || 0, status: String(record.status ?? 'pendiente') }, ...prev].slice(0, 8));
            void loadDashboard(true);
          });
          insforge.realtime.on('UPDATE_order', () => { if (!disposed) void loadDashboard(true); });
        }
        insforge.realtime.on('connect', () => { if (!disposed) setConnected(true); });
        insforge.realtime.on('disconnect', () => { if (!disposed) setConnected(false); });
      } catch {
        if (!disposed) setConnected(false);
      }
    })();
    return () => {
      disposed = true;
      try {
        insforge.realtime.unsubscribe('orders');
        insforge.realtime.disconnect();
      } catch {}
    };
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const activeProducts = products.filter((p) => p.activo !== false);
    const zeroStock = activeProducts.filter((p) => (p.stock ?? 0) === 0).length;
    const todayOrders = orders.filter((order) => new Date(order.created_at) >= today);
    const pendingOrders = orders.filter((order) => ['pendiente', 'en_preparacion'].includes(order.status));
    const oldPending = pendingOrders.filter((order) => now.getTime() - new Date(order.created_at).getTime() > 24 * 60 * 60 * 1000).length;
    const weekRevenue = orders.filter((order) => order.status === 'confirmado' && new Date(order.created_at) >= weekStart).reduce((sum, order) => sum + order.total, 0);
    const monthRevenue = orders.filter((order) => order.status !== 'cancelado' && new Date(order.created_at).getMonth() === now.getMonth()).reduce((sum, order) => sum + order.total, 0);
    const customers = new Set(orders.map((order) => order.customer_email).filter(Boolean)).size;
    return { activeProducts: activeProducts.length, zeroStock, todayOrders: todayOrders.length, pendingOrders: pendingOrders.length, oldPending, weekRevenue, monthRevenue, customers };
  }, [orders, products]);

  const animatedOrders = useCountUp(metrics.todayOrders);
  const animatedProducts = useCountUp(metrics.activeProducts);
  const animatedLeads = useCountUp(leadsToday);
  const animatedRevenue = useCountUp(metrics.weekRevenue);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const openDeliveries = useMemo(() => deliveries.filter((delivery) => delivery.status !== 'entregado').slice(0, 4), [deliveries]);
  const recentDocuments = useMemo<DashboardEvent[]>(() => {
    const orderEvents = recentOrders.slice(0, 3).map((order) => ({ id: order.id, title: `Pedido #${shortRecordId(order.id)}`, subtitle: `${order.customer_name} · ${order.items.length || 1} partida${order.items.length === 1 ? '' : 's'}`, date: order.created_at, href: `/admin/pedidos/${order.id}`, amount: order.total, icon: ShoppingCart, status: order.status }));
    const deliveryEvents = openDeliveries.slice(0, 3).map((delivery) => ({ id: delivery.id, title: `Entrega ${shortRecordId(delivery.order_id || delivery.id)}`, subtitle: `${delivery.customer_name || 'Cliente'} · ${delivery.responsible || 'Sin responsable'}`, date: delivery.estimated_date || delivery.updated_at || '', href: '/admin/entregas', icon: Truck }));
    return [...orderEvents, ...deliveryEvents].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);
  }, [openDeliveries, recentOrders]);

  const formattedTime = `${currentTime.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })} · ${currentTime.toLocaleTimeString('es-CL', { hour12: false })}`;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Centro operativo"
        icon={BarChart3}
        title={<>Panel de producción <span className="text-yellow-300">Soluciones Fabris</span></>}
        description={`${adminEmail} · ${formattedTime}`}
        actions={<><SyncStatusButton /><Button onClick={() => void loadDashboard(true)} variant="outline" className="rounded-full border-yellow-300/30 bg-yellow-300/5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200 hover:bg-yellow-300/15"><RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refrescar</Button></>}
      />

      {error ? <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div> : null}

      <AdminMotion>
        <section className="relative overflow-hidden rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.16),transparent_35%),linear-gradient(135deg,#09090b,#000)] p-5 shadow-2xl shadow-black/40 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge className="border-yellow-300/20 bg-yellow-300/15 text-yellow-200">Producción en vivo</Badge>
                <LiveDot status={connected ? 'ok' : 'warn'} label={connected ? 'Conectado' : 'Sin conexión realtime'} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-yellow-300">Banco visual del proyecto</p>
              <h2 className="mt-3 max-w-3xl font-playfair text-3xl font-black leading-tight text-white sm:text-5xl">Controla pedidos, documentos y fechas desde una sola lectura.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Vista pensada para producción: primero el estado general, luego el detalle del cliente, documentos, fechas y accesos directos al cierre operativo.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-5 font-black"><Link href="/admin/presupuestos"><FileText className="h-4 w-4" />Crear presupuesto</Link></Button>
                <Button asChild variant="outline" className="rounded-full px-5"><Link href="/admin/pedidos"><ClipboardList className="h-4 w-4" />Ver detalle de pedidos</Link></Button>
              </div>
            </div>
            <div className="grid gap-3">
              <ProgressBar label="Pedidos hoy" value={(metrics.todayOrders / 10) * 100} hint={`${metrics.todayOrders} activos`} />
              <ProgressBar label="Pendientes" value={(metrics.pendingOrders / 10) * 100} hint={metrics.oldPending > 0 ? `${metrics.oldPending} +24h` : `${metrics.pendingOrders} abiertos`} />
              <ProgressBar label="Stock sano" value={metrics.zeroStock > 0 ? 100 - (metrics.zeroStock / Math.max(metrics.activeProducts, 1)) * 100 : 100} hint={metrics.zeroStock > 0 ? `${metrics.zeroStock} sin stock` : 'OK'} />
            </div>
          </div>
        </section>
      </AdminMotion>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pedidos hoy" value={animatedOrders} note={`${metrics.pendingOrders} pendientes`} icon={ShoppingCart} trend={metrics.todayOrders > 0 ? 'up' : 'neutral'} />
        <MetricCard title="Ingresos semana" value={formatCLP(animatedRevenue)} note="Pedidos confirmados" icon={DollarSign} trend={metrics.weekRevenue > 0 ? 'up' : 'neutral'} />
        <MetricCard title="Productos activos" value={animatedProducts} note={metrics.zeroStock > 0 ? `${metrics.zeroStock} sin stock` : 'Stock disponible'} icon={Package} trend={metrics.zeroStock > 0 ? 'down' : 'up'} />
        <MetricCard title="Leads nuevos" value={animatedLeads} note={`${metrics.customers} clientes registrados`} icon={UserPlus} trend={leadsToday > 0 ? 'up' : 'neutral'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <AdminCard className="p-5 sm:p-6" glow>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Actividad reciente</p>
              <h2 className="mt-1 font-playfair text-2xl font-black text-white">Pedidos y movimientos del cliente</h2>
            </div>
            <Button asChild variant="outline" className="rounded-full"><Link href="/admin/pedidos">Ver todos <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {loading ? <p className="mt-5 text-sm text-zinc-500">Cargando actividad…</p> : recentOrders.length === 0 ? <p className="mt-5 text-sm text-zinc-500">Todavía no hay pedidos registrados.</p> : (
            <div className="mt-5 grid gap-3">
              {recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/pedidos/${order.id}`} className="group grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-yellow-300/40 hover:bg-yellow-300/[0.03] sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">#{shortRecordId(order.id)}</span><Badge variant="outline" className="border-transparent" style={{ background: `${orderStatusColor(order.status)}22`, color: orderStatusColor(order.status) }}>{orderStatusLabel(order.status)}</Badge></div>
                    <p className="mt-2 truncate text-base font-black text-white">{order.customer_name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDate(order.created_at)} · {order.customer_phone || order.customer_email || 'Sin contacto'}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right"><p className="text-lg font-black text-yellow-300">{formatCLP(order.total)}</p><p className="text-xs text-zinc-500">{order.items.length || 1} partidas</p></div>
                </Link>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard className="p-5 sm:p-6" glow>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Documentos y fechas</p>
              <h2 className="mt-1 font-playfair text-2xl font-black text-white">Lectura de proyecto</h2>
            </div>
            <CalendarClock className="h-5 w-5 text-yellow-300" />
          </div>
          <div className="mt-5 space-y-3">
            {recentDocuments.length === 0 ? <p className="text-sm text-zinc-500">Sin documentos recientes.</p> : recentDocuments.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={`${item.id}-${item.title}`} href={item.href} className="flex gap-3 rounded-3xl border border-white/10 bg-black/35 p-4 transition hover:border-yellow-300/40 hover:bg-yellow-300/[0.04]">
                  <span className="mt-1 h-10 w-10 shrink-0 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-2.5 text-yellow-300"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">{item.subtitle}</span><span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-600"><span>{formatDate(item.date)}</span>{item.amount ? <span className="text-yellow-300">{formatCLP(item.amount)}</span> : null}</span></span>
                  <ArrowRight className="mt-3 h-4 w-4 text-zinc-600" />
                </Link>
              );
            })}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-playfair text-xl font-black text-white">Alertas operativas</h2><AlertTriangle className="h-5 w-5 text-amber-300" /></div>
          <div className="mt-4 grid gap-3">
            {metrics.zeroStock > 0 ? <Link href="/admin/productos" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-200">{metrics.zeroStock} productos necesitan reposición de stock.</Link> : <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-200"><CheckCircle2 className="mr-2 inline h-4 w-4" />Stock sin alertas críticas.</div>}
            {metrics.oldPending > 0 ? <Link href="/admin/pedidos" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-200">{metrics.oldPending} pedidos superan 24h sin cierre.</Link> : <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">Pedidos pendientes dentro de rango normal.</div>}
          </div>
        </AdminCard>

        <AdminCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-playfair text-xl font-black text-white">Tiempo real</h2><Activity className="h-5 w-5 text-yellow-300" /></div>
          {activityFeed.length === 0 ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">Esperando nuevos pedidos en vivo… aparecerán aquí con cliente, fecha y documento.</p> : <ul className="mt-4 space-y-2">{activityFeed.map((event) => { const status = normalizeOrderStatus(event.status); return <li key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">Nuevo pedido #{shortRecordId(event.id)} · {event.customer}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">{formatTimeAgo(event.ts)} · {orderStatusLabel(status)}</p></div><span className="text-sm font-black text-yellow-300">{formatCLP(event.total)}</span></li>; })}</ul>}
        </AdminCard>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Parte baja · acciones</p><h2 className="font-playfair text-2xl font-black text-white">Siguiente paso del proyecto</h2></div>
          <p className="max-w-xl text-sm text-zinc-500">Después de revisar el detalle, baja aquí para crear documentos, actualizar productos o entrar al seguimiento.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard href="/admin/presupuestos" title="Presupuestos" description="Constructor comercial, vista cliente y confirmación por WhatsApp." icon={FileText} />
          <ActionCard href="/admin/productos" title="Catálogo" description="Gestiona productos, imágenes y disponibilidad visual." icon={Package} />
          <ActionCard href="/admin/pedidos" title="Pedidos" description="Revisa detalle, fechas, cliente y documentos de compra." icon={ShoppingCart} />
          <ActionCard href="/admin/entregas" title="Entregas" description="Coordina responsables, rutas y fechas estimadas." icon={Truck} />
          <ActionCard href="/admin/clientes" title="Clientes" description="Historial, contacto y contexto comercial por empresa." icon={Users} />
          <ActionCard href="/admin/publicidad" title="Publicidad" description="Conecta campañas con demanda real y productos destacados." icon={Megaphone} />
          <ActionCard href="/admin/reportes" title="Reportes" description="Lectura ejecutiva de ventas, productos y crecimiento." icon={BarChart3} />
          <ActionCard href="/admin/configuracion" title="Configuración" description="Ajustes del negocio, contacto, seguridad y producción." icon={Settings} />
        </div>
      </div>
    </AdminPageShell>
  );
}
