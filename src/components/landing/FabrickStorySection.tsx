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
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#FFF9EE' ? '#F8F5EF' : configuredBackground;
  const textColor = current.style.textColor || '#0B0C0E';
  const accent = current.style.accent || '#B96A16';
  const sectionAnchor = current.id === 'home-story' ? 'nosotros' : current.id;

  return (
    <section id={sectionAnchor} data-cms-section="home-story" className="px-4 py-18 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-start lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{textContent(current, 'title')}</h2>
            <p data-cms-field="description" className="mt-5 max-w-lg text-sm leading-7 opacity-52 sm:text-base">{textContent(current, 'description')}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link data-cms-field="primaryLabel" href={textContent(current, 'primaryHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0B0C0E] px-5 text-xs font-black text-[#F7F4EE] transition hover:bg-[#24262A] sm:min-h-12 sm:px-6 sm:text-sm">{textContent(current, 'primaryLabel', 'Calcular un trabajo')}</Link>
              <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/proyectos')} className="inline-flex min-h-11 items-center justify-center rounded-full border border-current/12 px-5 text-xs font-black transition hover:bg-black/[.035] sm:min-h-12 sm:px-6 sm:text-sm">{textContent(current, 'secondaryLabel', 'Ver proyectos')}</Link>
            </div>
          </div>

          <div className="grid gap-3">
            {areas.map(({ title, text }, index) => (
              <article data-cms-container={`areas-${index}`} key={`${title}-${index}`} className="grid gap-3 rounded-[1.35rem] border border-current/[.065] bg-white/50 p-5 sm:grid-cols-[64px_210px_1fr] sm:items-start sm:gap-5 sm:p-6">
                <span className="text-[9px] font-black tracking-[.14em] opacity-25">{String(index + 1).padStart(2, '0')}</span>
                <h3 data-cms-field={`areas-${index}-title`} className="text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
                <p data-cms-field={`areas-${index}-text`} className="text-[13px] leading-6 opacity-48 sm:text-sm sm:leading-7">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}