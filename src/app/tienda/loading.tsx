export default function TiendaLoading() {
  return (
    <main className="min-h-screen bg-[#070706] px-4 pb-24 pt-24 text-white md:px-8">
      <div className="mx-auto max-w-[1320px] animate-pulse">
        <div className="h-[430px] rounded-[2rem] border border-white/10 bg-white/[.055] md:h-[560px]" />
        <div className="mt-6 h-16 rounded-[1.4rem] border border-white/10 bg-white/[.045]" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[.045] p-3">
              <div className="aspect-square rounded-[1.3rem] bg-white/[.08]" />
              <div className="space-y-3 p-3">
                <div className="h-3 w-20 rounded bg-yellow-300/15" />
                <div className="h-5 w-4/5 rounded bg-white/[.10]" />
                <div className="h-3 w-full rounded bg-white/[.06]" />
                <div className="h-11 rounded-2xl bg-yellow-300/15" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
