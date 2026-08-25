'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleDollarSign, Contact, Loader2, RefreshCw, ShoppingCart, Store, TrendingUp } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

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
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/intelligence?days=${days}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el embudo.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el embudo.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const steps = useMemo(() => data ? [
    { label: 'Visitas', value: data.funnel.visits, rate: 100, icon: TrendingUp },
    { label: 'Producto visto', value: data.funnel.productViews, rate: data.funnel.rates.visitToProduct, icon: Store },
    { label: 'Añadido al carrito', value: data.funnel.addToCart, rate: data.funnel.rates.productToCart, icon: ShoppingCart },
    { label: 'Checkout', value: data.funnel.checkout, rate: data.funnel.rates.cartToCheckout, icon: CircleDollarSign },
    { label: 'Pedido', value: data.funnel.orders, rate: data.funnel.rates.checkoutToOrder, icon: ArrowRight },
  ] : [], [data]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Conversion Intelligence"
        title="De la visita a la venta"
        description="Localiza dónde se pierde intención entre producto, carrito, checkout, pedido y contacto. Esta vista solo analiza; no modifica pedidos, precios ni campañas."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="min-h-10 rounded-xl border border-black/10 bg-white/80 px-3 text-xs font-black text-[#514b42] outline-none focus:border-[#c77a00]/45"
            >
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        )}
      />

      {error ? <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loading ? (
        <div className="grid min-h-[420px] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c77a00]" />
        </div>
      ) : null}

      {data && !loading ? (
        <>
          <AdminStats>
            <AdminStat label="Conversión a pedido" value={`${data.funnel.rates.visitToOrder}%`} note={`${number.format(data.funnel.orders)} pedidos / ${number.format(data.funnel.visits)} visitas`} icon={TrendingUp} />
            <AdminStat label="Conversión a contacto" value={`${data.funnel.rates.visitToContact}%`} note={`${number.format(data.funnel.contacts)} contactos registrados`} icon={Contact} />
            <AdminStat label="Ventas pagadas" value={money.format(data.summary.revenue || 0)} note={`${number.format(data.summary.paidOrders || 0)} pedidos pagados`} icon={CircleDollarSign} />
            <AdminStat label="Ticket promedio" value={money.format(data.summary.averageOrderValue || 0)} note={`Periodo analizado: ${data.periodDays} días`} icon={ShoppingCart} />
          </AdminStats>

          <AdminSurface title="Embudo comercial" description="La barra muestra el volumen relativo a visitas; el porcentaje indica la conversión desde el paso anterior.">
            <div className="space-y-3">
              {steps.map((step, index) => {
                const width = data.funnel.visits > 0 ? Math.max(4, (step.value / data.funnel.visits) * 100) : 4;
                const Icon = step.icon;
                return (
                  <article key={step.label} className="rounded-[16px] border border-black/8 bg-[#f7f2e9] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff2d8] text-[#c77a00]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <b className="text-[#171612]">{step.label}</b>
                          <span className="text-sm font-black text-[#9b6a12]">{number.format(step.value)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
                          <span className="block h-full rounded-full bg-[#c77a00]" style={{ width: `${width}%` }} />
                        </div>
                        <p className="mt-2 text-[11px] text-[#8f887c]">{index === 0 ? '100% base' : `${step.rate}% desde el paso anterior`}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </AdminSurface>

          <div className="grid gap-4 lg:grid-cols-3">
            <Insight
              icon={Store}
              title="Producto → carrito"
              rate={data.funnel.rates.productToCart}
              good={data.funnel.rates.productToCart >= 3}
              action="Si está bajo, revisa precio, fotos, envío, confianza y CTA."
              href="/admin/productos"
            />
            <Insight
              icon={ShoppingCart}
              title="Carrito → checkout"
              rate={data.funnel.rates.cartToCheckout}
              good={data.funnel.rates.cartToCheckout >= 30}
              action="Si cae aquí, simplifica carrito y costos antes de pedir datos."
              href="/admin/intelligence/operations"
            />
            <Insight
              icon={Contact}
              title="Checkout → pedido"
              rate={data.funnel.rates.checkoutToOrder}
              good={data.funnel.rates.checkoutToOrder >= 30}
              action="Si está bajo, revisa pagos, errores, envío y fricción del formulario."
              href="/admin/observabilidad"
            />
          </div>

          <p className="border-t border-black/10 pt-4 text-xs text-[#817a6f]">Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</p>
        </>
      ) : null}
    </AdminPage>
  );
}

function Insight({
  icon: Icon,
  title,
  rate,
  good,
  action,
  href,
}: {
  icon: typeof Store;
  title: string;
  rate: number;
  good: boolean;
  action: string;
  href: string;
}) {
  return (
    <AdminSurface className="min-h-full">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff2d8] text-[#c77a00]"><Icon className="h-5 w-5" /></span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${good ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{rate}%</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-[#171612]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#716b60]">{action}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#9b6a12]">Revisar <ArrowRight className="h-4 w-4" /></Link>
    </AdminSurface>
  );
}
