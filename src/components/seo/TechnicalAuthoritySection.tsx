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
    <section className="border-y border-white/10 bg-[#07090b] px-4 py-12 text-white sm:px-6 lg:py-16" aria-labelledby="metodologia-tecnica">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]">{eyebrow}</p>
          <h2 id="metodologia-tecnica" className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">{answer}</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <h3 className="text-sm font-black">Cómo se obtiene el resultado</h3>
            <ol className="mt-4 space-y-3 text-xs leading-6 text-white/55">
              {method.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[9px] font-black text-black">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <h3 className="text-sm font-black">Qué no debe interpretarse</h3>
            <ul className="mt-4 space-y-3 text-xs leading-6 text-white/55">
              {limits.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <h3 className="text-sm font-black">Fuentes y referencias</h3>
            <div className="mt-4 space-y-3">
              {sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-white/8 bg-black/25 p-3 transition hover:border-[#F6C64A]/40"
                >
                  <b className="block text-xs text-[#F6C64A]">{source.label}</b>
                  {source.note ? <span className="mt-1 block text-[10px] leading-5 text-white/40">{source.note}</span> : null}
                </a>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/centro-tecnico" className="rounded-full bg-[#F6C64A] px-5 py-3 text-xs font-black text-black">
            Ver metodología completa
          </Link>
          {related.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/65 hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
