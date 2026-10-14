'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import { HOME_FLOW_VISUALS } from '@/lib/homePremiumVisuals';

export default function MetalconSeismicStory({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'seismic');
  const steps = objectList(current, 'steps');
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#08090A' ? '#0C0D0E' : configuredBackground;
  const textColor = current.style.textColor || '#F5F2EC';
  const accent = '#FFE600';
  const titleId = current.id === 'home-seismic' ? 'sismo-title' : `${current.id}-title`;
  const configuredPrimaryLabel = textContent(current, 'primaryLabel', 'Ver solución Metalcon');
  const configuredSecondaryLabel = textContent(current, 'secondaryLabel', 'Cotizar estructura');
  const primaryLabel = current.id === 'home-seismic' && ['Ver solución Metalcon', 'Estimar estructura Metalcon'].includes(configuredPrimaryLabel) ? 'Simular sismo y daños' : configuredPrimaryLabel;
  const secondaryLabel = current.id === 'home-seismic' && ['Cotizar estructura', 'Conocer el sistema'].includes(configuredSecondaryLabel) ? 'Configurar estructura' : configuredSecondaryLabel;
  const legacyPrimaryHref = textContent(current, 'primaryHref', '/servicios/metalcon');
  const legacySecondaryHref = textContent(current, 'secondaryHref', '/presupuesto?servicio=metalcon');
  const primaryHref = current.id === 'home-seismic' ? '/herramientas/metalcon/monitoreo' : legacyPrimaryHref;
  const secondaryHref = current.id === 'home-seismic' ? '/herramientas/metalcon' : legacySecondaryHref;
  const visualImage = current.style.backgroundImage?.trim() || HOME_FLOW_VISUALS.seismicWall;

  return (
    <section aria-labelledby={titleId} data-cms-section="home-seismic" className="border-y border-white/[.07] px-4 py-16 sm:px-6 md:px-12 lg:py-20" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-col gap-3 border-b border-white/[.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>Simulador de terremotos</p><h2 className="mt-2 max-w-[16ch] text-3xl font-black tracking-[-.05em] sm:text-5xl">Pon tu casa a prueba antes del terremoto.</h2></div>
          <p className="max-w-md text-[11px] leading-6 opacity-45">Elige la intensidad, mira cómo responde tu estructura Metalcon y recibe el daño estimado más una referencia de reparación.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-stretch lg:gap-7">
          <div className="relative overflow-hidden rounded-[1.55rem] border border-white/[.09] bg-white/[.025]">
            <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden bg-black/25 lg:min-h-[420px]">
              <img src={visualImage} alt="Muro Metalcon con drywall a medio instalar · simulador de terremoto" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <span className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-white/75 backdrop-blur">Simulador de terremoto 4D</span>
              <div className="absolute inset-x-5 bottom-5">
                <div className="flex flex-wrap gap-1.5" aria-hidden>
                  {['VII leve', 'VIII fuerte', 'IX severo'].map((level) => (
                    <span key={level} className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-black text-white/80 backdrop-blur">{level}</span>
                  ))}
                </div>
                <Link data-cms-field="primaryLabel" href={primaryHref} className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-xs font-black text-[#08090A] transition hover:brightness-110" style={{ backgroundColor: accent }}>{primaryLabel} <span aria-hidden>→</span></Link>
              </div>
            </div>
            <div className="border-t border-white/[.08] p-5 sm:p-7">
              <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
              <h3 data-cms-field="title" id={titleId} className="mt-3 max-w-[16ch] text-3xl font-black leading-[.96] tracking-[-.05em] sm:text-4xl">{textContent(current, 'title')}</h3>
              <p data-cms-field="paragraph1" className="mt-4 max-w-xl text-xs leading-6 opacity-52 sm:text-sm sm:leading-7">{textContent(current, 'paragraph1')}</p>
            </div>
          </div>

          <div className="flex flex-col rounded-[1.55rem] border border-white/[.07] bg-white/[.018] p-5 sm:p-7">
            <p data-cms-field="paragraph2" className="max-w-2xl text-sm leading-7 opacity-52 sm:text-base">{textContent(current, 'paragraph2')}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {steps.map(({ title, text }, index) => (
                <article data-cms-container={`steps-${index}`} key={`${title}-${index}`} className="rounded-[1.15rem] border border-white/[.07] bg-white/[.025] p-4">
                  <div className="flex items-center justify-between gap-3"><span className="text-[8px] font-black uppercase tracking-[.12em]" style={{ color: accent }}>Evalúa</span><span data-cms-field={`steps-${index}-number`} className="text-[9px] font-black opacity-22">{String(index + 1).padStart(2, '0')}</span></div>
                  <h4 data-cms-field={`steps-${index}-title`} className="mt-3 text-base font-black tracking-[-.025em]">{title}</h4>
                  <p data-cms-field={`steps-${index}-text`} className="mt-2 text-[10px] leading-5 opacity-48 sm:text-[11px]">{text}</p>
                </article>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="rounded-[1.2rem] border border-[#FFE600]/20 bg-[#FFE600]/[.055] p-4">
                <p data-cms-field="supportTitle" className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: accent }}>{textContent(current, 'supportTitle')}</p>
                <p data-cms-field="supportText" className="mt-2 max-w-2xl text-[11px] leading-6 opacity-48">{textContent(current, 'supportText')}</p>
                <p className="mt-2 text-[10px] leading-5 text-white/38">El simulador es una herramienta visual y referencial; no sustituye cálculo estructural, ingeniería ni evaluación técnica en terreno.</p>
              </div>
              <div className="mt-4">
                <Link data-cms-field="secondaryLabel" href={secondaryHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/[.12] px-5 text-xs font-black transition hover:bg-white/[.045]">{secondaryLabel}</Link>
              </div>
              <p data-cms-field="note" className="mt-3 max-w-2xl text-[9px] leading-5 opacity-28">{textContent(current, 'note')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
