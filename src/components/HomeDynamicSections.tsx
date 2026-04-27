import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import type { PublicHomeSection } from '@/lib/cms';

interface Props {
  sections: PublicHomeSection[];
}

/**
 * Renders dynamic editor-managed home sections above the static landing.
 *
 * Each section is rendered with a layout chosen by `kind`. Unknown kinds use
 * the default banner-style layout. Sections without a title or body are
 * skipped so an accidentally empty row doesn't break the page.
 */
export default function HomeDynamicSections({ sections }: Props) {
  if (!sections || sections.length === 0) return null;
  const renderable = sections.filter((s) => s.title || s.subtitle || s.body || s.image_url);
  if (renderable.length === 0) return null;

  return (
    <div className="space-y-0">
      {renderable.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </div>
  );
}

function SectionRenderer({ section }: { section: PublicHomeSection }) {
  const cta = section.link_url ? (
    <Link
      href={section.link_url}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-white"
    >
      {section.link_label || 'Ver más'}
    </Link>
  ) : null;

  if (section.kind === 'banner' && section.image_url) {
    return (
      <section className="relative w-full overflow-hidden bg-black py-12 md:py-20">
        <img src={section.image_url} alt={section.title ?? ''} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center text-white">
          {section.title && <h2 className="font-playfair text-3xl font-black tracking-tight md:text-5xl">{section.title}</h2>}
          {section.subtitle && <p className="mt-3 text-sm uppercase tracking-[0.3em] text-yellow-400">{section.subtitle}</p>}
          {section.body && <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-200 md:text-base">{section.body}</p>}
          {cta}
        </div>
      </section>
    );
  }

  if (section.kind === 'cta') {
    return (
      <section className="bg-zinc-950 py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          {section.title && <h2 className="font-playfair text-2xl font-black text-yellow-400 md:text-4xl">{section.title}</h2>}
          {section.body && <p className="mt-3 text-sm text-zinc-300 md:text-base">{section.body}</p>}
          {cta}
        </div>
      </section>
    );
  }

  // Default / hero / custom layout
  return (
    <section className="bg-black py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className={section.image_url ? 'grid gap-8 md:grid-cols-2 md:items-center' : ''}>
          <div>
            {section.title && <h2 className="font-playfair text-2xl font-black text-white md:text-4xl">{section.title}</h2>}
            {section.subtitle && <p className="mt-2 text-xs uppercase tracking-[0.3em] text-yellow-400">{section.subtitle}</p>}
            {section.body && <p className="mt-3 text-sm text-zinc-300 md:text-base whitespace-pre-line">{section.body}</p>}
            {cta}
          </div>
          {section.image_url && (
            <img src={section.image_url} alt={section.title ?? ''} className="rounded-2xl border border-white/10 object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}
