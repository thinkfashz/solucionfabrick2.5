export default function TiendaLoading() {
  return (
    <main className="min-h-screen bg-[#F8F0E9] px-4 pb-24 pt-24 text-[#171820] md:px-8">
      <div className="mx-auto max-w-[1320px] animate-pulse">
        <div className="overflow-hidden rounded-[2rem] bg-[#171820] p-5 shadow-[0_26px_80px_rgba(23,24,32,.16)] md:h-[560px] md:rounded-[2.8rem] md:p-8">
          <div className="grid h-full gap-6 lg:grid-cols-[.92fr_1.08fr]">
            <div className="flex flex-col justify-center">
              <div className="h-7 w-48 rounded-full bg-[#CCB196]/20" />
              <div className="mt-7 h-16 w-4/5 rounded-2xl bg-white/10 sm:h-24" />
              <div className="mt-4 h-5 w-full max-w-xl rounded bg-white/7" />
              <div className="mt-2 h-5 w-3/4 rounded bg-white/7" />
              <div className="mt-7 flex gap-3"><div className="h-12 w-40 rounded-full bg-[#B6906C]/55" /><div className="h-12 w-40 rounded-full bg-white/8" /></div>
            </div>
            <div className="min-h-[290px] rounded-[1.7rem] bg-white/8 lg:min-h-0" />
          </div>
        </div>
        <div className="mt-6 h-24 rounded-[1.7rem] bg-white shadow-[0_16px_48px_rgba(23,24,32,.06)]" />
        <div className="mt-12 h-10 w-2/3 max-w-xl rounded-2xl bg-[#171820]/10" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-[0_16px_48px_rgba(23,24,32,.06)]">
              <div className="aspect-square rounded-[1.3rem] bg-[#E6D4C3]" />
              <div className="space-y-3 p-3">
                <div className="h-3 w-20 rounded bg-[#B6906C]/30" />
                <div className="h-5 w-4/5 rounded bg-[#171820]/12" />
                <div className="h-3 w-full rounded bg-[#171820]/7" />
                <div className="h-11 rounded-2xl bg-[#171820]/10" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
