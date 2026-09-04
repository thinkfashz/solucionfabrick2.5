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
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#08090A' ? '#101215' : configuredBackground;
  const textColor = current.style.textColor || '#F7F4EE';
  const accent = current.style.accent || '#F5A13D';
  const sectionAnchor = current.id === 'home-process' ? 'como-funciona' : current.id;

  return (
    <section id={sectionAnchor} data-cms-section="home-process" className="relative scroll-mt-20 px-4 py-18 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-7 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-48 sm:text-base">{textContent(current, 'description')}</p>
        </div>

        <div className="mt-9 grid gap-3 md:grid-cols-3">
          {options.map(({ title, text }, index) => (
            <article data-cms-container={`options-${index}`} key={`${title}-${index}`} className="rounded-[1.4rem] border border-white/[.075] bg-white/[.025] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4"><span className="text-[8px] font-black uppercase tracking-[.13em]" style={{ color: accent }}>Paso</span><span className="text-[9px] font-black opacity-22">{String(index + 1).padStart(2, '0')}</span></div>
              <h3 data-cms-field={`options-${index}-title`} className="mt-10 text-lg font-black tracking-[-.03em]">{title}</h3>
              <p data-cms-field={`options-${index}-text`} className="mt-3 text-sm leading-7 opacity-44">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[1.4rem] border border-white/[.075] bg-white/[.025] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><b data-cms-field="ctaTitle" className="text-lg">{textContent(current, 'ctaTitle')}</b><p data-cms-field="ctaText" className="mt-1 text-xs leading-5 opacity-42">{textContent(current, 'ctaText')}</p></div>
          <Link data-cms-field="ctaLabel" href={textContent(current, 'ctaHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-xs font-black text-[#0B0C0E] transition hover:brightness-110 sm:min-h-12 sm:text-sm" style={{ backgroundColor: accent }}>{textContent(current, 'ctaLabel', 'Armar mi presupuesto')}</Link>
        </div>
      </div>
    </section>
  );
}