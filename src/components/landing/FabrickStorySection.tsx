'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

export default function FabrickStorySection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'story');
  const areas = objectList(current, 'areas');
  const background = current.style.background || '#FFF9EE';
  const textColor = current.style.textColor || '#08090A';
  const accent = current.style.accent || '#B96F00';

  return (
    <section id="nosotros" data-cms-section="home-story" className="px-4 py-14 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-24">
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
            <p data-cms-field="description" className="mt-5 max-w-lg text-sm leading-7 opacity-55 sm:text-base">{textContent(current, 'description')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link data-cms-field="primaryLabel" href={textContent(current, 'primaryHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-xs font-black transition hover:brightness-110 sm:min-h-12 sm:px-6 sm:text-sm" style={{ backgroundColor: textColor, color: background }}>{textContent(current, 'primaryLabel', 'Calcular un trabajo')}</Link>
              <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/proyectos')} className="inline-flex min-h-11 items-center justify-center rounded-full border border-current/15 px-5 text-xs font-black transition hover:opacity-70 sm:min-h-12 sm:px-6 sm:text-sm">{textContent(current, 'secondaryLabel', 'Ver proyectos')}</Link>
            </div>
          </div>

          <div className="border-t border-current/10">
            {areas.map(({ title, text }) => (
              <article key={title} className="grid gap-2 border-b border-current/10 py-6 sm:grid-cols-[230px_1fr] sm:gap-5 sm:py-8">
                <h3 data-cms-field="areas-title" className="text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
                <p data-cms-field="areas-text" className="text-[13px] leading-6 opacity-50 sm:text-sm sm:leading-7">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
