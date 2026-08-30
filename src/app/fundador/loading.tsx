export default function FounderLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[9999] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#f4eee3] px-5 text-[#171612]"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-[14vw] -top-[10vw] h-[52vw] min-h-[320px] w-[52vw] min-w-[320px] rounded-full bg-[#c96037]/12 blur-3xl" />
        <div className="absolute -bottom-[18vw] -left-[12vw] h-[48vw] min-h-[300px] w-[48vw] min-w-[300px] rounded-full bg-[#dba553]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[.18] [background-image:linear-gradient(rgba(23,22,18,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(23,22,18,.035)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <section className="relative z-10 w-full max-w-5xl border-y border-[#171612]/12 py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[9px] font-extrabold uppercase tracking-[.36em] text-[#b84d27]">Biografía</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[.18em] text-[#8b8175]">Perfil público</span>
        </div>
        <div className="mt-5 overflow-hidden">
          <p className="font-black uppercase leading-[.82] tracking-[-.055em] text-[#171612] [font-size:clamp(4.6rem,18vw,12rem)]">Fundador</p>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b84d27]" />
          <span className="text-[9px] font-bold uppercase tracking-[.2em] text-[#756b5f]">Preparando perfil público</span>
        </div>
      </section>
    </main>
  );
}
