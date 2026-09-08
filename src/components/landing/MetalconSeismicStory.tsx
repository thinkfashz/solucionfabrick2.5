'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';

export default function MetalconSeismicStory({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'seismic');
  const steps = objectList(current, 'steps');
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#08090A' ? '#171819' : configuredBackground;
  const textColor = current.style.textColor || '#F6F1E8';
  const accent = current.style.accent || '#C69A52';
  const titleId = current.id === 'home-seismic' ? 'sismo-title' : `${current.id}-title`;
  const primaryLabel = textContent(current, 'primaryLabel', 'Ver solución Metalcon');
  const secondaryLabel = textContent(current, 'secondaryLabel', 'Cotizar estructura');
  const legacyPrimaryHref = textContent(current, 'primaryHref', '/servicios/metalcon');
  const legacySecondaryHref = textContent(current, 'secondaryHref', '/presupuesto?servicio=metalcon');
  const primaryHref = primaryLabel === 'Ver solución Metalcon' && legacyPrimaryHref === '/presupuesto?servicio=metalcon' ? '/servicios/metalcon' : legacyPrimaryHref;
  const secondaryHref = secondaryLabel === 'Cotizar estructura' && legacySecondaryHref === '/servicios/metalcon' ? '/presupuesto?servicio=metalcon' : legacySecondaryHref;
  const visualImage = current.style.backgroundImage?.trim() || HOME_PREMIUM_VISUALS.metalcon;

  return (
    <section aria-labelledby={titleId} data-cms-section="home-seismic" className="px-4 py-18 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-stretch lg:gap-10">
          <div className="overflow-hidden rounded-[1.8rem] border border-white/[.08] bg-white/[.025]">
            <div className="aspect-[4/3] min-h-[300px] overflow-hidden bg-black/25 lg:min-h-[370px]">
              <img src={visualImage} alt="Estructura Steel Frame y Metalcon · Soluciones Fabrick" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
            <div className="border-t border-white/[.08] p-5 sm:p-7">
              <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
              <h2 data-cms-field="title" id={titleId} className="mt-3 max-w-[12ch] text-3xl font-black leading-[.96] tracking-[-.05em] sm:text-5xl">{textContent(current, 'title')}</h2>
              <p data-cms-field="paragraph1" className="mt-4 max-w-xl text-xs leading-6 opacity-52 sm:text-sm sm:leading-7">{textContent(current, 'paragraph1')}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <p data-cms-field="paragraph2" className="max-w-2xl text-sm leading-7 opacity-52 sm:text-base">{textContent(current, 'paragraph2')}</p>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {steps.map(({ title, text }, index) => (
                  <article data-cms-container={`steps-${index}`} key={`${title}-${index}`} className="rounded-[1.25rem] border border-white/[.075] bg-white/[.025] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-black uppercase tracking-[.12em]" style={{ color: accent }}>Criterio</span>
                      <span data-cms-field={`steps-${index}-number`} className="text-[9px] font-black opacity-22">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 data-cms-field={`steps-${index}-title`} className="mt-4 text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
                    <p data-cms-field={`steps-${index}-text`} className="mt-2 text-[11px] leading-5 opacity-48 sm:text-xs sm:leading-6">{text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-white/[.08] pt-6">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p data-cms-field="supportTitle" className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: accent }}>{textContent(current, 'supportTitle')}</p>
                  <p data-cms-field="supportText" className="mt-2 max-w-xl text-xs leading-6 opacity-46">{textContent(current, 'supportText')}</p>
                  <p data-cms-field="note" className="mt-3 max-w-xl text-[9px] leading-5 opacity-28">{textContent(current, 'note')}</p>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-[190px]">
                  <Link data-cms-field="primaryLabel" href={primaryHref} className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-xs font-black text-[#111214] transition hover:brightness-110" style={{ backgroundColor: accent }}>{primaryLabel}</Link>
                  <Link data-cms-field="secondaryLabel" href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/[.12] px-5 text-xs font-black transition hover:bg-white/[.045]">{secondaryLabel}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
