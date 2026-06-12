'use client';

import { useEffect } from 'react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-[#050505] p-4 text-white">
    <section className="w-full max-w-xl rounded-[2rem] border border-yellow-300/15 bg-black/70 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-2xl font-black text-yellow-300">SF</div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Soluciones Fabrick</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Algo falló en este módulo</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">El admin sigue activo. Puedes reintentar el módulo o volver al centro de control.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black shadow-2xl transition hover:bg-yellow-200">Reintentar módulo</button>
        <a href="/admin" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/15">Volver al admin</a>
      </div>
    </section>
  </main>;
}
