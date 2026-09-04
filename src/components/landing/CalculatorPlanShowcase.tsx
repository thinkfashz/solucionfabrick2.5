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
  const background = current.style.background || '#EEE8DF';
  const textColor = current.style.textColor || '#0B0C0E';
  const accent = current.style.accent || '#B96A16';

  return (
    <section data-cms-section="home-price-guide" className="px-4 py-18 sm:px-6 lg:px-8 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[12ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-52 sm:text-base">{textContent(current, 'description')}</p>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {benefits.map(({ title, text }, index) => (
            <article data-cms-container={`benefits-${index}`} key={`${title}-${index}`} className="rounded-[1.45rem] border border-current/[.07] bg-white/55 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span data-cms-field={`benefits-${index}-label`} className="text-[8px] font-black uppercase tracking-[.14em]" style={{ color: accent }}>Referencia</span>
                <span className="text-[9px] font-black opacity-22">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 data-cms-field={`benefits-${index}-title`} className="mt-8 text-xl font-black tracking-[-.035em]">{title}</h3>
              <p data-cms-field={`benefits-${index}-text`} className="mt-3 max-w-sm text-sm leading-6 opacity-48">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}