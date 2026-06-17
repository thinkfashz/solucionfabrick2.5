'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, Home, PackageCheck, ShieldCheck, Truck, XCircle } from 'lucide-react';

type OrderStatusResponse = {
  id: string;
  status: string;
  publicStatus: string;
  closed: boolean;
  createdAt: string;
  updatedAt?: string;
  customerName?: string;
  region?: string;
  shippingAddress?: string | null;
  items?: Array<{ nombre?: string; productoId?: string; cantidad?: number; precioUnitario?: number }>;
  summary?: { subtotal?: number; iva?: number; despacho?: number; total?: number; moneda?: 'CLP' };
  deliveryEstimate?: string;
  message?: string;
  error?: string;
};

function clp(value?: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.round(value || 0));
}

function dateCl(value?: string) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return value; }
}

function stepState(status: string, index: number) {
  const s = String(status || '').toLowerCase();
  const paid = ['pagada', 'confirmado', 'confirmada'].includes(s);
  const prep = paid || ['preparacion', 'preparación', 'preparando'].includes(s);
  const route = prep || ['despachada', 'en_ruta', 'envio', 'envío'].includes(s);
  const delivered = ['entregada', 'delivered', 'entrega_confirmada'].includes(s);
  const failed = ['fallida', 'cancelado', 'cancelada', 'rechazada'].includes(s);
  if (failed) return index === 0 ? 'failed' : 'locked';
  if (index === 0 && paid) return 'done';
  if (index === 1 && prep) return 'done';
  if (index === 2 && route) return 'done';
  if (index === 3 && delivered) return 'done';
  if (index === 0) return 'active';
  return 'locked';
}

export default function OrderTrackingPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/status?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const json = await res.json() as OrderStatusResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ id: '', status: 'error', publicStatus: 'No disponible', closed: false, createdAt: '', error: 'No se pudo cargar el pedido.' });
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  const steps = useMemo(() => [
    { label: 'Pago', icon: ShieldCheck },
    { label: 'Preparación', icon: PackageCheck },
    { label: 'En camino', icon: Truck },
    { label: 'Entregado', icon: Home },
  ], []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050403] px-4 py-6 text-white">
      <style>{`@keyframes pulseTrack{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.18);opacity:1}}.track-pulse{animation:pulseTrack 1.7s ease-in-out infinite}`}</style>
      <section className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.20),transparent_22rem),linear-gradient(145deg,#0b0a08,#050403)] p-5 shadow-[0_40px_120px_rgba(0,0,0,.7)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Soluciones Fabrick · seguimiento</p>
            <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">Estado de tu pedido</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">Link privado y temporal para revisar el avance de compra, preparación, despacho y entrega.</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white/60"><Clock className="mx-auto mb-3 h-8 w-8 animate-spin text-yellow-300" />Cargando estado…</div>
        ) : data?.error ? (
          <div className="mt-5 rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center text-red-100"><XCircle className="mx-auto mb-3 h-8 w-8" />{data.error}</div>
        ) : data && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Orden</p>
                  <h2 className="mt-2 text-2xl font-black md:text-4xl">{data.id}</h2>
                  <p className="mt-2 text-white/50">Registrado: {dateCl(data.createdAt)}</p>
                </div>
                <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${data.closed ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-yellow-300/30 bg-yellow-300/10 text-yellow-200'}`}>{data.publicStatus}</span>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-4">
                {steps.map((step, i) => {
                  const state = stepState(data.status, i);
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className={`rounded-[1.4rem] border p-4 ${state === 'done' ? 'border-emerald-300/25 bg-emerald-300/10' : state === 'active' ? 'border-yellow-300/35 bg-yellow-300/10' : state === 'failed' ? 'border-red-400/35 bg-red-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${state === 'done' ? 'bg-emerald-400 text-black' : state === 'active' ? 'track-pulse bg-yellow-300 text-black' : state === 'failed' ? 'bg-red-500 text-white' : 'bg-white/8 text-zinc-500'}`}>
                        {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <b className="mt-3 block text-sm">{step.label}</b>
                      <p className="mt-1 text-xs text-white/42">{state === 'done' ? 'Completado' : state === 'active' ? 'En revisión' : state === 'failed' ? 'No aprobado' : 'Pendiente'}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-7 text-yellow-50/80">{data.message || 'Seguimiento activo.'}</div>
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resumen</p>
              <h3 className="mt-2 text-2xl font-black">Compra</h3>
              <div className="mt-5 space-y-3">
                {(data.items || []).map((item, idx) => (
                  <div key={`${item.productoId}-${idx}`} className="flex gap-3 border-b border-white/10 pb-3 text-sm">
                    <span className="flex-1 text-white/65">{item.cantidad || 1} × {item.nombre || item.productoId}</span>
                    <b>{clp((item.precioUnitario || 0) * (item.cantidad || 1))}</b>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <Row label="Subtotal" value={clp(data.summary?.subtotal)} />
                <Row label="IVA referencial" value={clp(data.summary?.iva)} />
                <Row label="Despacho" value={clp(data.summary?.despacho)} />
                <Row label="Total" value={clp(data.summary?.total)} strong />
              </div>
              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-white/48">
                Entrega estimada: <b className="text-white">{data.deliveryEstimate}</b>{data.shippingAddress ? <><br />Dirección: {data.shippingAddress}</> : null}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-xl font-black text-white' : 'text-white/62'}`}><span>{label}</span><span>{value}</span></div>;
}
