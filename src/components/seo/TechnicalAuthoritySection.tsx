import Link from 'next/link';

export type TechnicalSource = {
  label: string;
  href: string;
  note?: string;
};

export type RelatedTechnicalLink = {
  label: string;
  href: string;
};

export default function TechnicalAuthoritySection({
  eyebrow,
  title,
  answer,
  method,
  limits,
  sources,
  related,
}: {
  eyebrow: string;
  title: string;
  answer: string;
  method: string[];
  limits: string[];
  sources: TechnicalSource[];
  related: RelatedTechnicalLink[];
}) {
  return (
    <section
      className="relative z-[60] isolate overflow-hidden border-y border-white/10 bg-[#090D11] px-4 py-12 text-[#F7F8F8] shadow-[0_-28px_80px_rgba(0,0,0,.45)] sm:px-6 lg:py-16"
      aria-labelledby="metodologia-tecnica"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_0%,rgba(246,198,74,.08),transparent_30rem),linear-gradient(180deg,#0B1115,#080C0F)]" />
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl rounded-[1.7rem] border border-white/[.07] bg-[#10171B]/95 p-5 shadow-[0_18px_55px_rgba(0,0,0,.24)] sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[.19em] text-[#FFD75E]">{eyebrow}</p>
          <h2 id="metodologia-tecnica" className="mt-3 text-3xl font-black leading-[1.02] tracking-[-.04em] text-white sm:text-4xl">{title}</h2>
          <p className="mt-4 text-[15px] leading-7 text-[#D3DCE0] sm:text-base sm:leading-8">{answer}</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.6rem] border border-white/10 bg-[#11191D] p-5 shadow-[0_14px_45px_rgba(0,0,0,.18)]">
            <h3 className="text-[15px] font-black text-white">Cómo se obtiene el resultado</h3>
            <ol className="mt-4 space-y-4 text-[13px] leading-6 text-[#C6D0D5]">
              {method.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[10px] font-black text-black">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-[1.6rem] border border-white/10 bg-[#11191D] p-5 shadow-[0_14px_45px_rgba(0,0,0,.18)]">
            <h3 className="text-[15px] font-black text-white">Qué no debe interpretarse</h3>
            <ul className="mt-4 space-y-4 text-[13px] leading-6 text-[#C6D0D5]">
              {limits.map((item) => <li key={item} className="flex gap-2"><span className="text-[#F6C64A]">•</span><span>{item}</span></li>)}
            </ul>
          </article>

          <article className="rounded-[1.6rem] border border-white/10 bg-[#11191D] p-5 shadow-[0_14px_45px_rgba(0,0,0,.18)]">
            <h3 className="text-[15px] font-black text-white">Fuentes y referencias</h3>
            <div className="mt-4 space-y-3">
              {sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-white/10 bg-[#080D10] p-3.5 transition hover:border-[#F6C64A]/45"
                >
                  <b className="block text-[13px] leading-5 text-[#FFD75E]">{source.label}</b>
                  {source.note ? <span className="mt-1.5 block text-[12px] leading-5 text-[#AEB9BE]">{source.note}</span> : null}
                </a>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/centro-tecnico" className="inline-flex min-h-12 items-center rounded-full bg-[#F6C64A] px-5 py-3 text-[12px] font-black text-black">
            Ver metodología completa
          </Link>
          {related.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/[.035] px-5 py-3 text-[12px] font-black text-[#E6ECEF] hover:border-[#F6C64A]/50 hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
