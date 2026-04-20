'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Megaphone,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { insforge } from '@/lib/insforge';
import {
  formatCLP,
  normalizeOrderRecord,
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

function MetricCard({
  label,
  value,
  note,
  tone = 'text-white',
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/8 bg-zinc-950/70 p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className={`mt-3 text-3xl font-black ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{note}</p>
    </div>
  );
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
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.96))] p-5 transition hover:border-yellow-400/40 hover:bg-zinc-950"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-yellow-400" />
        <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-400" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
    </Link>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/8 bg-zinc-950/70 p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-yellow-400">{title}</p>
          <h2 className="mt-2 text-lg font-bold text-white">{subtitle}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const { categoryMap } = useCategories();
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<ReturnType<typeof normalizeOrderRecord>[]>([]);
  const [deliveries, setDeliveries] = useState<DashboardDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    const [productResponse, orderResponse, deliveryResponse] = await Promise.all([
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
    ]);

    if (productResponse.error || orderResponse.error || deliveryResponse.error) {
      setError(productResponse.error?.message || orderResponse.error?.message || deliveryResponse.error?.message || 'No se pudo cargar el dashboard.');
    } else {
      setProducts((productResponse.data ?? []) as DashboardProduct[]);
      setOrders(((orderResponse.data ?? []) as Record<string, unknown>[]).map((order) => normalizeOrderRecord(order)));
      setDeliveries((deliveryResponse.data ?? []) as DashboardDelivery[]);
    }

    setLoading(false);
    setRefreshing(false);
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
        ]);

        if (subscriptions.every((subscription) => subscription.ok)) {
          setConnected(true);
          insforge.realtime.on('INSERT_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('UPDATE_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('DELETE_product', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('INSERT_order', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('UPDATE_order', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('INSERT_delivery', () => { if (!disposed) void loadDashboard(true); });
          insforge.realtime.on('UPDATE_delivery', () => { if (!disposed) void loadDashboard(true); });
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
        insforge.realtime.disconnect();
      } catch {
        // Ignore cleanup failures.
      }
    };
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.activo !== false).length;
    const lowStock = products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5).length;
    const pendingOrders = orders.filter((order) => order.status === 'pendiente' || order.status === 'en_preparacion').length;
    const activeCustomers = new Set(orders.map((order) => order.customer_email).filter(Boolean)).size;
    const realizedRevenue = orders
      .filter((order) => order.status !== 'cancelado')
      .reduce((accumulator, order) => accumulator + order.total, 0);
    const inFlightDeliveries = deliveries.filter((delivery) => delivery.status === 'pendiente' || delivery.status === 'en_camino').length;

    return {
      activeProducts,
      lowStock,
      pendingOrders,
      activeCustomers,
      realizedRevenue,
      inFlightDeliveries,
    };
  }, [deliveries, orders, products]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const stockFocus = useMemo(() => {
    return [...products]
      .filter((product) => product.activo !== false)
      .sort((left, right) => (left.stock ?? Number.MAX_SAFE_INTEGER) - (right.stock ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 5);
  }, [products]);

  const categoryCoverage = useMemo(() => {
    const categoryCounts = new Map<string, number>();

    for (const product of products) {
      const categoryName = resolveCategoryName(product.category_id, categoryMap);
      categoryCounts.set(categoryName, (categoryCounts.get(categoryName) ?? 0) + 1);
    }

    return [...categoryCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [categoryMap, products]);

  const deliverySnapshot = useMemo(() => deliveries.slice(0, 5), [deliveries]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.18),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-yellow-400">Centro de control</p>
            <h1 className="mt-3 font-playfair text-4xl font-black text-white md:text-5xl">Operación unificada de Fabrick</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Catálogo, pedidos, entregas y reportes quedan sincronizados contra la base real. El objetivo aquí es decidir rápido, no perseguir pantallas rotas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300"
            >
              {connected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
              {connected ? 'Tiempo real activo' : 'Modo sincronización'}
            </span>
            <button
              onClick={() => void loadDashboard(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Productos activos" value={metrics.activeProducts} note={`${metrics.lowStock} con stock crítico`} tone="text-emerald-400" />
        <MetricCard label="Pedidos abiertos" value={metrics.pendingOrders} note={`${orders.length} pedidos en total`} tone="text-amber-400" />
        <MetricCard label="Clientes con actividad" value={metrics.activeCustomers} note="Correos únicos con compras registradas" tone="text-white" />
        <MetricCard label="Ingresos no cancelados" value={formatCLP(metrics.realizedRevenue)} note={`${metrics.inFlightDeliveries} entregas en curso`} tone="text-yellow-400" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/admin/productos" title="Catálogo" description="Gestiona productos, categorías activas y visibilidad en tienda sin salir del panel." icon={Package} />
        <ActionCard href="/admin/pedidos" title="Pedidos" description="Supervisa cobros, confirma compras y baja directo al detalle operativo." icon={ShoppingCart} />
        <ActionCard href="/admin/entregas" title="Entregas" description="Coordina responsables, fechas estimadas y cierre logístico desde una sola vista." icon={Truck} />
        <ActionCard href="/admin/reportes" title="Reportes" description="Mira volumen, ventas y productos dominantes sin exportar datos manualmente." icon={BarChart3} />
        <ActionCard href="/admin/clientes" title="Clientes" description="Revisa historial de compra, recurrencia y contexto comercial por contacto." icon={Users} />
        <ActionCard href="/admin/publicidad" title="Publicidad" description="Conecta la adquisición pagada con el inventario y la demanda real del catálogo." icon={Megaphone} />
        <ActionCard href="/admin/configuracion" title="Configuración" description="Centraliza datos del negocio, parámetros de contacto y seguridad operativa." icon={Settings} />
        <ActionCard href="/admin/productos/nuevo" title="Alta rápida" description="Crea nuevos productos sin rodeos cuando necesites publicar catálogo o stock." icon={Package} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Pedidos recientes" subtitle="Lo último que requiere revisión">
          {loading ? (
            <p className="text-sm text-zinc-500">Cargando actividad…</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">Todavía no hay pedidos registrados en esta base.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="flex flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-black/30 p-4 transition hover:border-yellow-400/40 hover:bg-black/40 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">{shortRecordId(order.id)}</p>
                    <p className="mt-2 text-base font-bold text-white">{order.customer_name}</p>
                    <p className="text-sm text-zinc-500">{order.customer_email || 'Sin correo registrado'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]"
                      style={{
                        background: `${orderStatusColor(order.status)}22`,
                        color: orderStatusColor(order.status),
                      }}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                    <p className="text-lg font-black text-yellow-400">{formatCLP(order.total)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Inventario" subtitle="Productos que piden atención inmediata">
            {stockFocus.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay productos activos todavía.</p>
            ) : (
              <div className="space-y-3">
                {stockFocus.map((product) => (
                  <div key={product.id} className="rounded-[1.4rem] border border-white/8 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">
                          {resolveCategoryName(product.category_id, categoryMap)}
                        </p>
                      </div>
                      <span className={`text-sm font-black ${(product.stock ?? 0) <= 5 ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {product.stock ?? '—'} un.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Cobertura" subtitle="Cómo está distribuido el catálogo">
            {categoryCoverage.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin categorías cargadas todavía.</p>
            ) : (
              <div className="space-y-3">
                {categoryCoverage.map(([name, count]) => (
                  <div key={name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{name}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/6">
                      <div
                        className="h-2 rounded-full bg-yellow-400"
                        style={{ width: `${Math.max(10, (count / Math.max(products.length, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Despacho" subtitle="Entregas con movimiento reciente">
            {deliverySnapshot.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no se han generado entregas para pedidos.</p>
            ) : (
              <div className="space-y-3">
                {deliverySnapshot.map((delivery) => (
                  <div key={delivery.id} className="rounded-[1.4rem] border border-white/8 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{delivery.customer_name || 'Entrega sin cliente'}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">
                          Pedido {shortRecordId(delivery.order_id)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-300">
                        {delivery.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {(delivery.responsible || delivery.estimated_date) && (
                      <p className="mt-3 text-sm text-zinc-500">
                        {delivery.responsible ? `Responsable: ${delivery.responsible}` : 'Responsable pendiente'}
                        {delivery.responsible && delivery.estimated_date ? ' · ' : ''}
                        {delivery.estimated_date ? `ETA ${delivery.estimated_date}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}