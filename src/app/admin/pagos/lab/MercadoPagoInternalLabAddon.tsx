'use client';

import { useEffect, useState } from 'react';
import MercadoPagoInternalBrick from './MercadoPagoInternalBrick';

type LabStatus = { ready: boolean };

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

export default function MercadoPagoInternalLabAddon() {
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('Compra demo Soluciones Fabrick');
  const [amount, setAmount] = useState(1000);
  const [email, setEmail] = useState('test_user_123@testuser.com');
  const [paymentId, setPaymentId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/admin/mercadopago-lab/credentials', { cache: 'no-store' })
      .then((res) => readJson<LabStatus>(res))
      .then((json) => setReady(!!json.ready))
      .catch((err) => setNotice(err instanceof Error ? err.message : 'No se pudo leer MercadoPago Lab'));
  }, []);

  async function refreshEvents() {
    await fetch('/api/admin/mercadopago-lab/events', { cache: 'no-store' }).catch(() => null);
  }

  return <section className="mx-auto max-w-7xl px-4 pb-8 md:px-6">
    <div className="mb-5 rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-5 text-white">
      <p className="text-xs font-black uppercase tracking-[.24em] text-emerald-200">Nuevo modo interno</p>
      <h2 className="mt-2 text-2xl font-black">Pagar sin salir de la página</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">Este bloque usa las credenciales ya guardadas en MercadoPago Lab. No tienes que volver a pegarlas.</p>
      {notice && <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">{notice}</p>}
      {paymentId && <p className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">Último Payment ID: {paymentId}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[.16em] text-zinc-500">Producto<input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/70" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[.16em] text-zinc-500">Monto CLP<input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/70" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[.16em] text-zinc-500">Email test<input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/70" /></label>
      </div>
    </div>
    <MercadoPagoInternalBrick ready={ready} title={title} amount={amount} email={email} onPaymentId={setPaymentId} onNotice={setNotice} onRefreshEvents={refreshEvents} />
  </section>;
}
