'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

export default function MetalconSeismicStory({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'seismic');
  const steps = objectList(current, 'steps');
  const background = current.style.background || '#08090A';
  const textColor = current.style.textColor || '#FFF9EE';
  const accent = current.style.accent || '#FFB000';

  return (
    <section aria-labelledby="sismo-title" data-cms-section="home-seismic" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" id="sismo-title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
            <p data-cms-field="paragraph1" className="mt-5 max-w-xl text-sm leading-7 opacity-55 sm:text-base">{textContent(current, 'paragraph1')}</p>
            <p data-cms-field="paragraph2" className="mt-4 max-w-xl text-sm leading-7 opacity-55">{textContent(current, 'paragraph2')}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link data-cms-field="primaryLabel" href={textContent(current, 'primaryHref', '/presupuesto?servicio=metalcon')} className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-[#08090A] transition hover:brightness-110" style={{ backgroundColor: accent }}>{textContent(current, 'primaryLabel', 'Estimar estructura Metalcon')}</Link>
              <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/servicios/metalcon')} className="inline-flex min-h-12 items-center justify-center rounded-full border border-current/15 px-6 text-sm font-black transition hover:opacity-75">{textContent(current, 'secondaryLabel', 'Conocer el sistema')}</Link>
            </div>
            <p data-cms-field="note" className="mt-5 max-w-xl text-[10px] leading-5 opacity-35">{textContent(current, 'note')}</p>
          </div>

          <div className="border-t border-current/10">
            {steps.map(({ title, text }, index) => (
              <article key={`${title}-${index}`} className="grid gap-2 border-b border-current/10 py-6 sm:grid-cols-[52px_220px_1fr] sm:gap-5 sm:py-7">
                <span data-cms-field="steps-number" className="text-sm font-black opacity-20">{String(index + 1).padStart(2, '0')}</span>
                <h3 data-cms-field="steps-title" className="text-lg font-black tracking-[-.03em]">{title}</h3>
                <p data-cms-field="steps-text" className="text-sm leading-7 opacity-50">{text}</p>
              </article>
            ))}
            <div className="py-6">
              <p data-cms-field="supportTitle" className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: accent }}>{textContent(current, 'supportTitle')}</p>
              <p data-cms-field="supportText" className="mt-2 max-w-2xl text-sm leading-7 opacity-50">{textContent(current, 'supportText')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
