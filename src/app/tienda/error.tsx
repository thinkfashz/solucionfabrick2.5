'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Store } from 'lucide-react';

export default function TiendaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#070706] px-5 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[.055] p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-yellow-300/25 bg-yellow-300/[.10] text-yellow-200">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.27em] text-yellow-300">Tienda protegida</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-.055em]">No pudimos abrir esta vista.</h1>
        <p className="mt-4 text-sm leading-7 text-white/60">El catálogo y tu carrito se mantienen protegidos. Puedes volver a intentar sin perder tu navegación.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 text-sm font-black text-black transition hover:bg-white">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.05] px-6 text-sm font-black text-white transition hover:border-yellow-300/55">
            <Store className="h-4 w-4" /> Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
