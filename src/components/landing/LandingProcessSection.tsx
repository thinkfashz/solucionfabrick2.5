'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

export default function LandingProcessSection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'process');
  const options = objectList(current, 'options');
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#08090A' ? '#101113' : configuredBackground;
  const textColor = current.style.textColor || '#F6F1E8';
  const accent = current.style.accent || '#D77A2D';
  const sectionAnchor = current.id === 'home-process' ? 'como-funciona' : current.id;

  return (
    <section id={sectionAnchor} data-cms-section="home-process" className="relative scroll-mt-20 px-4 py-18 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[13ch] text-4xl font-black leading-[.97] tracking-[-.05em] sm:text-5xl">{textContent(current, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-46 sm:text-base">{textContent(current, 'description')}</p>
        </div>

        <div className="mt-9 grid gap-x-5 gap-y-8 border-t border-white/[.08] pt-7 sm:grid-cols-2 lg:grid-cols-4">
          {options.map(({ title, text }, index) => (
            <article data-cms-container={`options-${index}`} key={`${title}-${index}`} className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black tracking-[.14em]" style={{ color: accent }}>{String(index + 1).padStart(2, '0')}</span>
                <span className="h-px flex-1 bg-white/[.08]" />
              </div>
              <h3 data-cms-field={`options-${index}-title`} className="mt-5 max-w-[16ch] text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
              <p data-cms-field={`options-${index}-text`} className="mt-2 max-w-sm text-xs leading-6 opacity-44">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/[.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <b data-cms-field="ctaTitle" className="text-base sm:text-lg">{textContent(current, 'ctaTitle')}</b>
            <p data-cms-field="ctaText" className="mt-1 max-w-xl text-xs leading-5 opacity-40">{textContent(current, 'ctaText')}</p>
          </div>
          <Link data-cms-field="ctaLabel" href={textContent(current, 'ctaHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-xs font-black text-[#111214] transition hover:brightness-110 sm:text-sm" style={{ backgroundColor: accent }}>{textContent(current, 'ctaLabel', 'Cotizar mi proyecto')}</Link>
        </div>
      </div>
    </section>
  );
}
