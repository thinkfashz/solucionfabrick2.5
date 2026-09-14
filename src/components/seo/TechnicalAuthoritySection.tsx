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

type Props = {
  eyebrow: string;
  title: string;
  answer: string;
  method: string[];
  limits: string[];
  sources: TechnicalSource[];
  related: RelatedTechnicalLink[];
  compact?: boolean;
};

function AuthorityContent({ title, answer, method, limits, sources, related }: Omit<Props, 'eyebrow' | 'compact'>) {
  return (
    <>
      <div className="max-w-3xl">
        <h2 id="metodologia-tecnica" className="text-2xl font-black leading-[1.02] tracking-[-.04em] text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 text-[13px] leading-6 text-[#D3DCE0] sm:text-sm">{answer}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <article className="rounded-[1.25rem] border border-white/10 bg-[#11191D] p-4">
          <h3 className="text-[13px] font-black text-white">Cómo se obtiene</h3>
          <ol className="mt-3 space-y-2.5 text-[11px] leading-5 text-[#C6D0D5]">
            {method.map((item, index) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[8px] font-black text-black">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-[1.25rem] border border-white/10 bg-[#11191D] p-4">
          <h3 className="text-[13px] font-black text-white">Límites</h3>
          <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-[#C6D0D5]">
            {limits.map((item) => <li key={item} className="flex gap-2"><span className="text-[#F6C64A]">•</span><span>{item}</span></li>)}
          </ul>
        </article>

        <article className="rounded-[1.25rem] border border-white/10 bg-[#11191D] p-4">
          <h3 className="text-[13px] font-black text-white">Fuentes</h3>
          <div className="mt-3 space-y-2">
            {sources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-white/10 bg-[#080D10] p-3 transition hover:border-[#F6C64A]/45">
                <b className="block text-[11px] leading-4 text-[#FFD75E]">{source.label}</b>
                {source.note ? <span className="mt-1 block text-[10px] leading-4 text-[#AEB9BE]">{source.note}</span> : null}
              </a>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/centro-tecnico" className="inline-flex min-h-10 items-center rounded-full bg-[#F6C64A] px-4 py-2 text-[10px] font-black text-black">Ver metodología completa</Link>
        {related.map((item) => (
          <Link key={item.href} href={item.href} className="inline-flex min-h-10 items-center rounded-full border border-white/20 bg-white/[.035] px-4 py-2 text-[10px] font-black text-[#E6ECEF] hover:border-[#F6C64A]/50 hover:text-white">{item.label}</Link>
        ))}
      </div>
    </>
  );
}

export default function TechnicalAuthoritySection(props: Props) {
  const { eyebrow, compact = false } = props;
  const body = <AuthorityContent title={props.title} answer={props.answer} method={props.method} limits={props.limits} sources={props.sources} related={props.related} />;

  if (compact) {
    return (
      <section className="relative z-[60] isolate border-y border-white/10 bg-[#090D11] px-3 py-5 text-[#F7F8F8] sm:px-6" aria-labelledby="metodologia-tecnica">
        <div className="mx-auto max-w-6xl">
          <details className="group rounded-[1.35rem] border border-white/10 bg-[#10171B] p-4 open:shadow-[0_18px_55px_rgba(0,0,0,.24)] sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFD75E]">{eyebrow}</p>
                <p className="mt-1 truncate text-sm font-black text-white">Fuentes, metodología y límites técnicos</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.07] text-lg font-black text-[#F6C64A] transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-5 border-t border-white/[.07] pt-5">{body}</div>
          </details>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-[60] isolate overflow-hidden border-y border-white/10 bg-[#090D11] px-4 py-12 text-[#F7F8F8] shadow-[0_-28px_80px_rgba(0,0,0,.45)] sm:px-6 lg:py-16" aria-labelledby="metodologia-tecnica">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_0%,rgba(246,198,74,.08),transparent_30rem),linear-gradient(180deg,#0B1115,#080C0F)]" />
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[.19em] text-[#FFD75E]">{eyebrow}</p>
        {body}
      </div>
    </section>
  );
}
