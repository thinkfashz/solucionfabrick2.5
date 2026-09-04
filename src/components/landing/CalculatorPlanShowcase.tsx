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
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#FFF9EE' ? '#EEE7DD' : configuredBackground;
  const textColor = current.style.textColor || '#111214';
  const accent = current.style.accent || '#9A5B22';

  return (
    <section data-cms-section="home-price-guide" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px] border-y border-current/[.08] py-7 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-12">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-2 max-w-[18ch] text-2xl font-black leading-tight tracking-[-.04em] sm:text-3xl">{textContent(current, 'title')}</h2>
            <p data-cms-field="description" className="mt-3 max-w-xl text-xs leading-6 opacity-48 sm:text-sm">{textContent(current, 'description')}</p>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            {benefits.map(({ title, text }, index) => (
              <article data-cms-container={`benefits-${index}`} key={`${title}-${index}`} className="border-l border-current/[.1] pl-4 sm:pl-5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black tracking-[.12em] opacity-24">{String(index + 1).padStart(2, '0')}</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                </div>
                <h3 data-cms-field={`benefits-${index}-title`} className="mt-3 text-sm font-black tracking-[-.02em] sm:text-base">{title}</h3>
                <p data-cms-field={`benefits-${index}-text`} className="mt-2 text-[11px] leading-5 opacity-46 sm:text-xs sm:leading-6">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
