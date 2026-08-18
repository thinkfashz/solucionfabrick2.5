export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#08090A] px-6 text-[#FFF9EE]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFB000] text-xl font-black text-[#08090A] shadow-[0_20px_60px_rgba(182,144,108,.22)]">SF</div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.28em] text-[#FFB000]">Soluciones Fabrick</p>
        <h1 className="mt-3 text-2xl font-black tracking-[-.04em]">Preparando tu proyecto</h1>
        <p className="mt-3 text-sm leading-6 text-[#BFB8AC]">Cargando servicios, medidas y rangos aproximados.</p>
        <div className="mx-auto mt-7 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-[linear-gradient(90deg,#F5871F,#FFF9EE)]" />
        </div>
      </div>
    </main>
  );
}
