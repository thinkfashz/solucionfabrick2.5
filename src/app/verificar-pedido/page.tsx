'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, MapPin, PackageCheck, Search, Truck, XCircle } from 'lucide-react';

type OrderStatusResponse = {
  id?: string;
  dispatchCode?: string;
  status?: string;
  publicStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  customerName?: string;
  region?: string;
  shippingAddress?: string | null;
  trackingNumber?: string;
  carrier?: string;
  shippingNote?: string;
  items?: Array<{ nombre?: string; name?: string; productoId?: string; productId?: string; cantidad?: number; quantity?: number; precioUnitario?: number; unitPrice?: number }>;
  summary?: { subtotal?: number; iva?: number; despacho?: number; total?: number };
  deliveryEstimate?: string;
  message?: string;
  error?: string;
};

function clp(value?: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0)); }
function dateCl(value?: string) { try { return value ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch { return value || '-'; } }
function itemName(item: NonNullable<OrderStatusResponse['items']>[number]) { return item.nombre || item.name || item.productoId || item.productId || 'Producto'; }
function itemId(item: NonNullable<OrderStatusResponse['items']>[number]) { return item.productoId || item.productId || ''; }
function qty(item: NonNullable<OrderStatusResponse['items']>[number]) { return Number(item.cantidad ?? item.quantity ?? 1) || 1; }
function price(item: NonNullable<OrderStatusResponse['items']>[number]) { return Number(item.precioUnitario ?? item.unitPrice ?? 0) || 0; }

export default function VerificarPedidoPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState('');

  const normalized = useMemo(() => code.trim().toUpperCase(), [code]);

  async function search() {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`/api/orders/status?code=${encodeURIComponent(normalized)}`, { cache: 'no-store' });
      const json = await res.json() as OrderStatusResponse;
      if (!res.ok) throw new Error(json.error || 'No se encontró el pedido.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se encontró el pedido.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#050403] px-4 py-8 text-white">
    <section className="mx-auto max-w-4xl">
      <div className="rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.20),transparent_22rem),linear-gradient(145deg,#0b0a08,#050403)] p-6 shadow-[0_35px_100px_rgba(0,0,0,.55)]">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Verificación de pedido</p>
        <h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.06em] md:text-6xl">Busca por código de despacho</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">Ingresa el código que llegó por correo, por ejemplo FBK-26-ABC123, para ver el estado del pedido y sus productos.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }} placeholder="FBK-26-ABC123" className="rounded-2xl border border-white/10 bg-black px-4 py-4 text-lg font-black uppercase tracking-widest text-yellow-300 outline-none placeholder:text-white/20 focus:border-yellow-300/60" />
          <button onClick={search} disabled={loading || normalized.length < 5} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-6 py-4 font-black text-black disabled:opacity-50"><Search className="h-5 w-5" />{loading ? 'Buscando…' : 'Verificar'}</button>
        </div>
      </div>

      {error && <div className="mt-5 rounded-[1.5rem] border border-red-400/25 bg-red-500/10 p-5 text-red-100"><XCircle className="mr-2 inline h-5 w-5" />{error}</div>}
      {data && <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">{data.dispatchCode}</p>
              <h2 className="mt-2 text-3xl font-black">{data.publicStatus}</h2>
              <p className="mt-2 text-sm text-white/45">Orden: {data.id} · {dateCl(data.createdAt)}</p>
            </div>
            <CheckCircle2 className="h-9 w-9 text-yellow-300" />
          </div>
          <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-7 text-yellow-50/80">{data.message}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info icon={<Truck className="h-4 w-4" />} label="Transportista" value={data.carrier || 'Pendiente'} />
            <Info icon={<PackageCheck className="h-4 w-4" />} label="N° seguimiento" value={data.trackingNumber || 'Pendiente'} />
            <Info icon={<MapPin className="h-4 w-4" />} label="Dirección" value={data.shippingAddress || data.region || 'Pendiente'} wide />
            <Info icon={<Clock className="h-4 w-4" />} label="Actualizado" value={dateCl(data.updatedAt || data.createdAt)} wide />
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-black/35 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Productos</p>
          <div className="mt-4 space-y-3">
            {(data.items || []).map((item, index) => {
              const id = itemId(item);
              const amount = price(item) * qty(item);
              return <div key={`${id}-${index}`} className="border-b border-white/10 pb-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-white/65">{qty(item)} × {itemName(item)}</span><b>{clp(amount)}</b></div>
                {id && id !== 'sin-id' && id !== 'mp-recovery' ? <Link href={`/producto/${id}`} className="mt-2 inline-flex rounded-full border border-yellow-300/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">Ver producto</Link> : null}
              </div>;
            })}
          </div>
          <div className="mt-5 space-y-2 text-sm text-white/65">
            <Row label="Subtotal" value={clp(data.summary?.subtotal)} />
            <Row label="IVA" value={clp(data.summary?.iva)} />
            <Row label="Despacho" value={clp(data.summary?.despacho)} />
            <Row label="Total" value={clp(data.summary?.total)} strong />
          </div>
        </aside>
      </section>}
    </section>
  </main>;
}

function Info({ icon, label, value, wide }: { icon: ReactNode; label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${wide ? 'sm:col-span-2' : ''}`}><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{icon}{label}</p><b className="mt-2 block text-sm text-white/75">{value}</b></div>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-xl font-black text-white' : ''}`}><span>{label}</span><span>{value}</span></div>;
}
