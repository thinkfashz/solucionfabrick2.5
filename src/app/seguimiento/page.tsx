'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';

function cleanTrackingInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const token = parts[parts.length - 1] || '';
    return token.replace(/[^a-zA-Z0-9._-]/g, '');
  } catch {
    return trimmed.replace(/[^a-zA-Z0-9._-]/g, '');
  }
}

export default function SeguimientoLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const token = cleanTrackingInput(code);
    if (!token || token.length < 8) {
      setError('Pega el link privado completo o el código de seguimiento que recibiste después de comprar.');
      return;
    }
    router.push(`/seguimiento/${encodeURIComponent(token)}`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050403] px-4 py-7 text-white">
      <style>{`@keyframes highwayMove{from{background-position-x:0}to{background-position-x:180px}}.highway{animation:highwayMove 1.2s linear infinite}@keyframes deliveryRun{0%{transform:translateX(-25%) translateY(0)}45%{transform:translateX(45%) translateY(-3px)}100%{transform:translateX(135%) translateY(0)}}.delivery-run{animation:deliveryRun 5s ease-in-out infinite}`}</style>
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1fr_420px]">
          <section className="relative overflow-hidden rounded-[2.2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.25),transparent_24rem),linear-gradient(145deg,#11100c,#050403)] p-6 shadow-[0_40px_120px_rgba(0,0,0,.72)] md:p-9">
            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-200"><PackageCheck className="h-4 w-4" /> Seguimiento privado</span>
              <h1 className="mt-5 text-5xl font-black leading-[.92] tracking-[-0.075em] md:text-7xl">Sigue tu paquete en tiempo real.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/58">Pega tu link privado o código de seguimiento. Podrás ver pago, preparación, despacho, entrega y crear tu usuario con contraseña para futuras compras.</p>

              <div className="mt-7 rounded-[1.8rem] border border-white/10 bg-black/35 p-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Link o código de seguimiento</label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-4">
                    <Search className="h-5 w-5 text-yellow-300" />
                    <input value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Pega aquí tu link privado" className="w-full bg-transparent text-base font-bold outline-none placeholder:text-white/24" />
                  </div>
                  <button onClick={submit} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 font-black text-black"><span>Ver pedido</span><ArrowRight className="h-5 w-5" /></button>
                </div>
                {error && <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Info icon={<ShieldCheck className="h-5 w-5" />} title="Pago" text="Confirma si Mercado Pago ya aprobó." />
                <Info icon={<Truck className="h-5 w-5" />} title="Ruta" text="Estado visual del despacho." />
                <Info icon={<Lock className="h-5 w-5" />} title="Usuario" text="Crea contraseña sin perder el seguimiento." />
              </div>
            </div>
          </section>

          <section className="rounded-[2.2rem] border border-white/10 bg-black/35 p-5">
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,#17130b,#070707_52%,#030303)]">
              <div className="absolute left-6 top-8 h-28 w-16 rounded-t-3xl border border-yellow-300/15 bg-yellow-300/10" />
              <div className="absolute left-28 top-14 h-40 w-24 rounded-t-3xl border border-white/10 bg-white/[0.06]" />
              <div className="absolute right-8 top-10 h-48 w-28 rounded-t-3xl border border-yellow-300/15 bg-yellow-300/10" />
              <div className="absolute bottom-24 left-0 h-24 w-full bg-[#151515]" />
              <div className="highway absolute bottom-32 h-4 w-full bg-[repeating-linear-gradient(90deg,rgba(250,204,21,.8)_0_26px,transparent_26px_62px)]" />
              <div className="absolute bottom-24 h-8 w-full bg-black/55" />
              <div className="delivery-run absolute bottom-28 left-0 flex items-center gap-2 text-6xl drop-shadow-[0_18px_35px_rgba(250,204,21,.38)]"><span>📦</span><span>🚚</span></div>
              <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Animación de despacho</p>
                <p className="mt-2 text-sm leading-6 text-yellow-50/72">Un camión transporta el paquete por la autopista mientras el cliente ve las etapas reales del pedido.</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-yellow-300 text-black">{icon}</div><b className="mt-3 block text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-white/45">{text}</p></div>;
}
