'use client';

import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

export default function CalculatorPlanShowcase({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'price-guide');
  const benefits = objectList(current, 'benefits');
  const background = current.style.background || '#FFF9EE';
  const textColor = current.style.textColor || '#08090A';
  const accent = current.style.accent || '#B96F00';

  return (
    <section data-cms-section="home-price-guide" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1260px]">
        <div className="grid gap-7 border-b border-current/10 pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-55 sm:text-base">{textContent(current, 'description')}</p>
        </div>

        <div className="grid gap-px bg-current/10 sm:grid-cols-3">
          {benefits.map(({ title, text }, index) => (
            <article key={`${title}-${index}`} className="px-1 py-6 sm:px-5 sm:py-8" style={{ backgroundColor: background }}>
              <span data-cms-field={`benefits-${index}-label`} className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em]" style={{ backgroundColor: `${accent}18`, color: accent }}>Referencia</span>
              <h3 data-cms-field={`benefits-${index}-title`} className="mt-3 text-xl font-black tracking-[-.035em]">{title}</h3>
              <p data-cms-field={`benefits-${index}-text`} className="mt-2 max-w-sm text-sm leading-6 opacity-50">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
