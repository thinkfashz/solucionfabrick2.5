'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Megaphone,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { insforge } from '@/lib/insforge';
import SyncStatusButton from '@/components/admin/SyncStatusButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  formatCLP,
  normalizeOrderRecord,
  normalizeOrderStatus,
  ORDER_STATUS_COLORS,
  orderStatusColor,
  orderStatusLabel,
  resolveCategoryName,
  shortRecordId,
} from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';

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

interface ObservatoryLog {
  id: string;
  ts: string;
  text: string;
  status?: string;
  created_at?: string;
}

function formatTimeAgo(timestampMs: number): string {
  const diff = Date.now() - timestampMs;
  if (diff < 60_000) return 'hace segundos';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

// Count-up hook with easeOutCubic
function useCountUp(target: number, duration = 900) {
  const [displayed, setDisplayed] = useState(0);
  const prevTarget = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevTarget.current;
    const change = target - start;
    const startTime = Date.now();

    const easeOutCubic = (t: number) => {
      const t1 = t - 1;
      return t1 * t1 * t1 + 1;
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = start + change * eased;

      setDisplayed(current);
      prevTarget.current = current;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration]);

  return Math.round(displayed);
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Package;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="group h-auto justify-start whitespace-normal rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-5 text-left transition hover:border-yellow-400/40 hover:shadow-[0_0_30px_rgba(250,204,21,0.15)]"
    >
      <Link href={href}>
        <div className="flex w-full flex-col">
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 text-yellow-400" />
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-400" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
        </div>
      </Link>
    </Button>
  );
}

export default function AdminPage() {
  const { categoryMap } = useCategories();
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<ReturnType<typeof normalizeOrderRecord>[]>([]);
  const [deliveries, setDeliveries] = useState<DashboardDelivery[]>([]);
  const [leadsToday, setLeadsToday] = useState(0);
  const [activityFeed, setActivityFeed] = useState<
    { id: string; ts: number; customer: string; total: number; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('administrador');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [healthData, setHealthData] = useState<{
    services?: { vercel?: { status: string; latency: number }; insforge?: { status: string; latency: number } };
  }>({});
  const [observatoryLogs, setObservatoryLogs] = useState<ObservatoryLog[]>([]);

  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [productResponse, orderResponse, deliveryResponse, leadsResponse] =
      await Promise.allSettled([
        insforge.database
          .from('products')
          .select('id, name, price, stock, featured, activo, category_id, created_at')
          .order('created_at', { ascending: false })
          .limit(250),
        insforge.database
          .from('orders')
          .select('id, customer_name, customer_email, customer_phone, region, shipping_address, items, subtotal, tax, shipping_fee, total, currency, status, created_at, updated_at, payment_id, payment_status')
          .order('created_at', { ascending: false })
          .limit(250),
        insforge.database
          .from('deliveries')
          .select('id, order_id, customer_name, status, responsible, estimated_date, updated_at')
          .order('updated_at', { ascending: false })
          .limit(200),
        insforge.database
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayISO),
      ]);

    const productResult =
      productResponse.status === 'fulfilled' ? productResponse.value : null;
    const orderResult =
      orderResponse.status === 'fulfilled' ? orderResponse.value : null;
    const deliveryResult =
      deliveryResponse.status === 'fulfilled' ? deliveryResponse.value : null;

    const firstError =
      productResult?.error?.message ||
      orderResult?.error?.message ||
      deliveryResult?.error?.message;

    if (!productResult && !orderResult && !deliveryResult) {
      setError('No se pudo cargar el dashboard.');
    } else if (firstError) {
      setError(firstError);
    } else {
      setProducts((productResult?.data ?? []) as DashboardProduct[]);
      setOrders(
        ((orderResult?.data ?? []) as Record<string, unknown>[]).map((order) =>
          normalizeOrderRecord(order),
        ),
      );
      setDeliveries((deliveryResult?.data ?? []) as DashboardDelivery[]);
    }

    // Leads count: graceful fallback to 0 if table/column missing.
    if (
      leadsResponse.status === 'fulfilled' &&
      !leadsResponse.value.error &&
      typeof leadsResponse.value.count === 'number'
    ) {
      setLeadsToday(leadsResponse.value.count);
    } else {
      setLeadsToday(0);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Fetch admin email
  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) {
          setAdminEmail(data.email);
        }
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch health data
  useEffect(() => {
    fetch('/api/admin/health')
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch(() => {
        // Ignore
      });
  }, []);

  useEffect(() => {
    let disposed = false;
    void loadDashboard();

    (async () => {
      try {
        await insforge.realtime.connect();
        if (disposed) return;

        const subscriptions = await Promise.all([
          insforge.realtime.subscribe('products'),
          insforge.realtime.subscribe('orders'),
          insforge.realtime.subscribe('deliveries'),
          insforge.realtime.subscribe('observatory_logs'),
        ]);

        if (subscriptions.every((subscription) => subscription.ok)) {
          setConnected(true);
          insforge.realtime.on('INSERT_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('UPDATE_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('DELETE_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('INSERT_order', (payload: unknown) => {
            if (!disposed) {
              if (payload && typeof payload === 'object') {
                const record = payload as Record<string, unknown>;
                const totalRaw = record.total;
                const total =
                  typeof totalRaw === 'number'
                    ? totalRaw
                    : Number(totalRaw) || 0;
                setActivityFeed((prev) => [
                  {
                    id: String(record.id ?? `${Date.now()}-${Math.random()}`),
                    ts: Date.now(),
                    customer: String(record.customer_name ?? 'Cliente'),
                    total,
                    status: String(record.status ?? 'pendiente'),
                  },
                  ...prev,
                ].slice(0, 10));
              }
              void loadDashboard(true);
            }
          });
          insforge.realtime.on('UPDATE_order', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('INSERT_delivery', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('UPDATE_delivery', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('INSERT_observatory_log', (payload: unknown) => {
            if (!disposed && payload && typeof payload === 'object') {
              const record = payload as Record<string, unknown>;
              const log: ObservatoryLog = {
                id: String(record.id ?? ''),
                ts: String(record.ts ?? ''),
                text: String(record.text ?? ''),
                status: String(record.status ?? ''),
                created_at: String(record.created_at ?? ''),
              };
              setObservatoryLogs((prev) => [...prev.slice(-2), log]);
            }
          });
        }

        insforge.realtime.on('connect', () => { if (!disposed) setConnected(true); });
        insforge.realtime.on('disconnect', () => { if (!disposed) setConnected(false); });
      } catch {
        setConnected(false);
      }
    })();

    return () => {
      disposed = true;
      try {
        insforge.realtime.unsubscribe('products');
        insforge.realtime.unsubscribe('orders');
        insforge.realtime.unsubscribe('deliveries');
        insforge.realtime.unsubscribe('observatory_logs');
        insforge.realtime.disconnect();
      } catch {
        // Ignore cleanup failures.
      }
    };
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of the current week (Monday 00:00 local).
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);

    // Active products
    const activeProducts = products.filter((product) => product.activo !== false);
    const activeProductsCount = activeProducts.length;
    const zeroStock = activeProducts.filter((product) => (product.stock ?? 0) === 0).length;

    // Orders created today
    const ordersTodayCount = orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= todayStart;
    }).length;

    // Paid revenue this week (normalized status "confirmado" includes pagada/paid/approved).
    const paidThisWeekRevenue = orders
      .filter((order) => {
        if (order.status !== 'confirmado') return false;
        const created = new Date(order.created_at);
        return created >= weekStart;
      })
      .reduce((sum, order) => sum + order.total, 0);

    // Pending orders (new, preparing, pending)
    const pendingOrders = orders.filter((order) =>
      ['pendiente', 'en_preparacion'].includes(order.status)
    );
    const pendingOrdersCount = pendingOrders.length;
    const oldPending = pendingOrders.filter((order) => {
      const created = new Date(order.created_at);
      return now.getTime() - created.getTime() > 24 * 60 * 60 * 1000;
    }).length;

    // Revenue this month
    const thisMonthRevenue = orders
      .filter((order) => {
        if (order.status === 'cancelado') return false;
        const created = new Date(order.created_at);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.total, 0);

    const prevMonthRevenue = orders
      .filter((order) => {
        if (order.status === 'cancelado') return false;
        const created = new Date(order.created_at);
        return created.getMonth() === prevMonth && created.getFullYear() === prevYear;
      })
      .reduce((sum, order) => sum + order.total, 0);

    const revenueChange = prevMonthRevenue > 0
      ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : 0;

    // Customers
    const allCustomerEmails = new Set(orders.map((order) => order.customer_email).filter(Boolean));
    const customersCount = allCustomerEmails.size;

    const newCustomersThisMonth = new Set(
      orders
        .filter((order) => {
          const created = new Date(order.created_at);
          return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
        })
        .map((order) => order.customer_email)
        .filter(Boolean)
    ).size;

    return {
      activeProductsCount,
      zeroStock,
      ordersTodayCount,
      paidThisWeekRevenue,
      pendingOrdersCount,
      oldPending,
      thisMonthRevenue,
      revenueChange,
      customersCount,
      newCustomersThisMonth,
    };
  }, [orders, products]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.activo !== false && (p.stock ?? 0) === 0).slice(0, 5);
  }, [products]);

  const weeklyOrdersData = useMemo(() => {
    const now = new Date();
    const weeksToShow = isMobile ? 2 : 4;
    const weeks: { label: string; count: number }[] = [];

    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7 - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const count = orders.filter((order) => {
        const created = new Date(order.created_at);
        return created >= weekStart && created <= weekEnd;
      }).length;

      const label = weekStart.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      weeks.push({ label, count });
    }

    return weeks;
  }, [orders, isMobile]);

  // Daily revenue for the last 7 days (paid/confirmed orders only).
  const ventasPorDia = useMemo(() => {
    const now = new Date();
    const days: { fecha: string; total: number }[] = [];
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const total = orders
        .filter((order) => {
          if (order.status !== 'confirmado') return false;
          const created = new Date(order.created_at);
          return created >= dayStart && created <= dayEnd;
        })
        .reduce((sum, order) => sum + order.total, 0);

      days.push({ fecha: dayLabels[dayStart.getDay()], total });
    }

    return days;
  }, [orders]);

  const animatedActiveProducts = useCountUp(metrics.activeProductsCount);
  const animatedOrdersToday = useCountUp(metrics.ordersTodayCount);
  const animatedLeadsToday = useCountUp(leadsToday);
  const animatedPaidWeekRevenue = useCountUp(metrics.paidThisWeekRevenue);

  const formattedTime = currentTime.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + currentTime.toLocaleTimeString('es-CL', { hour12: false });

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h1 className="font-playfair text-3xl font-black text-white md:text-4xl">
              Bienvenido, {adminEmail}
            </h1>
            <p className="mt-2 text-sm text-zinc-400 capitalize">{formattedTime}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SyncStatusButton />
            <Button
              onClick={() => void loadDashboard(true)}
              variant="outline"
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Four metric cards — Task 9 KPIs (pedidos hoy · ingresos semana · productos activos · leads nuevos) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pedidos hoy */}
        <Card className="border-l-4 border-l-yellow-400 p-5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 text-yellow-400">
            <ShoppingCart className="h-4 w-4" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Pedidos hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-3 text-3xl font-black text-white">{animatedOrdersToday}</p>
            {metrics.pendingOrdersCount > 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {metrics.pendingOrdersCount} pendientes
                {metrics.oldPending > 0 ? ` · ${metrics.oldPending} +24h` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Sin pedidos pendientes</p>
            )}
          </CardContent>
        </Card>

        {/* Ingresos semana */}
        <Card className="border-l-4 border-l-yellow-400 p-5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 text-yellow-400">
            <DollarSign className="h-4 w-4" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Ingresos semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-3 text-3xl font-black text-white">{formatCLP(animatedPaidWeekRevenue)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
              {metrics.revenueChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className={metrics.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                {metrics.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(metrics.revenueChange))}% mes vs anterior
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Productos activos */}
        <Card className="border-l-4 border-l-yellow-400 p-5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 text-yellow-400">
            <Package className="h-4 w-4" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Productos activos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-3 text-3xl font-black text-white">{animatedActiveProducts}</p>
            {metrics.zeroStock > 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {metrics.zeroStock} sin stock
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Todos con stock disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Leads nuevos */}
        <Card className="border-l-4 border-l-yellow-400 p-5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 text-yellow-400">
            <UserPlus className="h-4 w-4" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Leads nuevos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-3 text-3xl font-black text-white">{animatedLeadsToday}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {metrics.customersCount} clientes · {metrics.newCustomersThisMonth} nuevos mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos por día (últimos 7 días) — recharts LineChart */}
      <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-playfair text-xl font-bold text-white">Ingresos por día · 7 días</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Solo pedidos pagados
          </span>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ventasPorDia}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis
                dataKey="fecha"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                hide={isMobile}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                }
              />
              <Tooltip
                contentStyle={{
                  background: '#09090b',
                  border: '1px solid #facc1533',
                  borderRadius: 12,
                  color: '#facc15',
                }}
                cursor={{ stroke: 'rgba(250,204,21,0.2)' }}
                formatter={(value: number) => [formatCLP(value), 'Ingresos']}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#facc15"
                strokeWidth={2}
                dot={{ fill: '#facc15', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pedidos por semana — mantenemos la vista histórica (BarChart) */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6">
        <h2 className="font-playfair text-xl font-bold text-white">Pedidos por semana</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyOrdersData}>
              <XAxis
                dataKey="label"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                hide={isMobile}
              />
              <Tooltip
                contentStyle={{
                  background: '#0a0a0b',
                  border: '1px solid rgba(250,204,21,0.3)',
                  borderRadius: 12,
                  color: '#facc15',
                }}
                cursor={{ fill: 'rgba(250,204,21,0.1)' }}
              />
              <Bar dataKey="count" fill="#facc15" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column section: Latest orders + System alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest orders */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6">
          <h2 className="font-playfair text-xl font-bold text-white">Últimos pedidos</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Cargando actividad…</p>
          ) : recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Todavía no hay pedidos registrados.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-yellow-400/40 hover:bg-black/50"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">{shortRecordId(order.id)}</p>
                    <p className="mt-1 text-base font-bold text-white">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="border-transparent"
                      style={{
                        background: `${orderStatusColor(order.status)}22`,
                        color: orderStatusColor(order.status),
                      }}
                    >
                      {orderStatusLabel(order.status)}
                    </Badge>
                    <p className="mt-1 text-lg font-black text-yellow-400">{formatCLP(order.total)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* System alerts */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6">
          <h2 className="font-playfair text-xl font-bold text-white">Alertas del sistema</h2>
          <div className="mt-4 space-y-3">
            {/* Out of stock products */}
            {outOfStockProducts.length > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <Link href="/admin/productos" className="block">
                  <p className="text-sm font-bold text-amber-400">⚠ Productos sin stock</p>
                  <div className="mt-2 space-y-1">
                    {outOfStockProducts.map((p) => (
                      <p key={p.id} className="text-xs text-amber-300">• {p.name}</p>
                    ))}
                  </div>
                </Link>
              </div>
            )}

            {/* Old pending orders */}
            {metrics.oldPending > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <Link href="/admin/pedidos" className="block">
                  <p className="text-sm font-bold text-amber-400">
                    ⚠ {metrics.oldPending} pedidos llevan más de 24h sin atención
                  </p>
                </Link>
              </div>
            )}

            {/* Health check */}
            {healthData.services?.vercel && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-300">
                  {healthData.services.vercel.status === 'online' ? '✓' : '✕'} Vercel · {healthData.services.vercel.latency}ms
                </p>
              </div>
            )}
            {healthData.services?.insforge && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-300">
                  {healthData.services.insforge.status === 'online' ? '✓' : '✕'} InsForge · {healthData.services.insforge.latency}ms
                </p>
              </div>
            )}

            {/* Mini live feed */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">Feed observatory</p>
              {observatoryLogs.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">Feed observatory en espera…</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {observatoryLogs.slice(-3).map((log) => (
                    <p key={log.id} className="text-xs text-zinc-400">
                      <span className="text-zinc-600">{log.ts}</span> · {log.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live activity feed — Task 9: realtime INSERT on orders */}
      <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-playfair text-xl font-bold text-white">
            <Activity className="h-5 w-5 text-yellow-400" />
            Actividad en tiempo real
          </h2>
          <span
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
              connected ? 'text-green-400' : 'text-zinc-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'animate-pulse bg-green-400' : 'bg-zinc-600'
              }`}
            />
            {connected ? 'Conectado' : 'Esperando'}
          </span>
        </div>
        {activityFeed.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Esperando nuevos pedidos en vivo… Cuando entre un pedido lo verás aquí al instante.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {activityFeed.map((event) => {
              const status = normalizeOrderStatus(event.status);
              const color = ORDER_STATUS_COLORS[status];
              return (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-200">
                        Nuevo pedido #{shortRecordId(event.id)} · {event.customer}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                        {formatTimeAgo(event.ts)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-yellow-400">
                    {formatCLP(event.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick Actions section */}
      <div>
        <h2 className="mb-4 font-playfair text-2xl font-black text-white">Acciones rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard href="/admin/productos" title="Catálogo" description="Gestiona productos, categorías activas y visibilidad en tienda sin salir del panel." icon={Package} />
          <ActionCard href="/admin/pedidos" title="Pedidos" description="Supervisa cobros, confirma compras y baja directo al detalle operativo." icon={ShoppingCart} />
          <ActionCard href="/admin/entregas" title="Entregas" description="Coordina responsables, fechas estimadas y cierre logístico desde una sola vista." icon={Truck} />
          <ActionCard href="/admin/reportes" title="Reportes" description="Mira volumen, ventas y productos dominantes sin exportar datos manualmente." icon={BarChart3} />
          <ActionCard href="/admin/clientes" title="Clientes" description="Revisa historial de compra, recurrencia y contexto comercial por contacto." icon={Users} />
          <ActionCard href="/admin/publicidad" title="Publicidad" description="Conecta la adquisición pagada con el inventario y la demanda real del catálogo." icon={Megaphone} />
          <ActionCard href="/admin/configuracion" title="Configuración" description="Centraliza datos del negocio, parámetros de contacto y seguridad operativa." icon={Settings} />
          <ActionCard href="/admin/productos/nuevo" title="Alta rápida" description="Crea nuevos productos sin rodeos cuando necesites publicar catálogo o stock." icon={Package} />
        </div>
      </div>
    </div>
  );
}