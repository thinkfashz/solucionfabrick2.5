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
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#08090A' ? '#0A1014' : configuredBackground;
  const textColor = current.style.textColor || '#F6F1E8';
  const accent = '#FFE600';
  const titleId = current.id === 'home-seismic' ? 'sismo-title' : current.id + '-title';
  const configuredPrimaryLabel = textContent(current, 'primaryLabel', 'Ver solución Metalcon');
  const configuredSecondaryLabel = textContent(current, 'secondaryLabel', 'Cotizar estructura');
  const primaryLabel = current.id === 'home-seismic' && ['Ver solución Metalcon', 'Estimar estructura Metalcon'].includes(configuredPrimaryLabel) ? 'Simular sismo y daños' : configuredPrimaryLabel;
  const secondaryLabel = current.id === 'home-seismic' && ['Cotizar estructura', 'Conocer el sistema'].includes(configuredSecondaryLabel) ? 'Configurar estructura' : configuredSecondaryLabel;
  const legacyPrimaryHref = textContent(current, 'primaryHref', '/servicios/metalcon');
  const legacySecondaryHref = textContent(current, 'secondaryHref', '/presupuesto?servicio=metalcon');
  const primaryHref = current.id === 'home-seismic' ? '/herramientas/metalcon/monitoreo' : legacyPrimaryHref;
  const secondaryHref = current.id === 'home-seismic' ? '/herramientas/metalcon' : legacySecondaryHref;
  const visualImage = current.style.backgroundImage?.trim() || HOME_PREMIUM_VISUALS.metalcon;

  return (
    <section
      aria-labelledby={titleId}
      data-cms-section="home-seismic"
      className="border-y border-white/[.09] px-4 py-16 sm:px-6 md:px-8 lg:py-24"
      style={{ backgroundColor: background, color: textColor }}
    >
      <div className="mx-auto max-w-[1360px]">
        <header className="grid gap-5 border-b border-white/[.1] pb-7 lg:grid-cols-[minmax(0,.9fr)_minmax(300px,.45fr)] lg:items-end">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.2em]" style={{ color: accent }}>Laboratorio estructural Fabrick</p>
            <h2 id={titleId} className="mt-3 max-w-[14ch] text-[clamp(2.2rem,5vw,4.5rem)] font-extrabold leading-[.94] tracking-[-.055em]">
              Diseña la estructura. Después ponla a prueba.
            </h2>
          </div>
          <p className="max-w-md text-[12px] leading-7 text-white/50">
            Configura Metalcon y entra al simulador sísmico para visualizar respuesta, puntos críticos, daño aproximado y una referencia de reparación.
          </p>
        </header>

        <div className="grid border-b border-white/[.1] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.72fr)]">
          <div className="relative min-h-[360px] overflow-hidden border-b border-white/[.1] lg:min-h-[560px] lg:border-b-0 lg:border-r">
            <img
              src={visualImage}
              alt="Estructura Steel Frame y Metalcon · Soluciones Fabrick"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover saturate-[.82]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-9">
              <p data-cms-field="eyebrow" className="text-[9px] font-extrabold uppercase tracking-[.18em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
              <h3 data-cms-field="title" className="mt-2 max-w-[13ch] text-3xl font-extrabold leading-[.98] tracking-[-.045em] sm:text-4xl">{textContent(current, 'title')}</h3>
              <p data-cms-field="paragraph1" className="mt-4 max-w-xl text-xs leading-6 text-white/62 sm:text-sm sm:leading-7">{textContent(current, 'paragraph1')}</p>
            </div>
          </div>

          <div className="flex flex-col px-0 py-2 lg:pl-10">
            <p data-cms-field="paragraph2" className="border-b border-white/[.1] py-7 text-sm leading-7 text-white/55 sm:text-base">{textContent(current, 'paragraph2')}</p>

            <div>
              {steps.map(({ title, text }, index) => (
                <article data-cms-container={'steps-' + index} key={title + '-' + index} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 border-b border-white/[.09] py-5">
                  <span data-cms-field={'steps-' + index + '-number'} className="pt-1 text-[9px] font-extrabold text-[#FFE600]/70">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h4 data-cms-field={'steps-' + index + '-title'} className="text-[15px] font-extrabold tracking-[-.02em]">{title}</h4>
                    <p data-cms-field={'steps-' + index + '-text'} className="mt-1.5 text-[11px] leading-5 text-white/44">{text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-auto pt-7">
              <p data-cms-field="supportTitle" className="text-[9px] font-extrabold uppercase tracking-[.16em]" style={{ color: accent }}>{textContent(current, 'supportTitle')}</p>
              <p data-cms-field="supportText" className="mt-2 max-w-2xl text-[11px] leading-6 text-white/45">{textContent(current, 'supportText')}</p>
              <p className="mt-2 text-[10px] leading-5 text-white/30">El simulador es una herramienta visual y referencial; no sustituye cálculo estructural, ingeniería ni evaluación técnica en terreno.</p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Link data-cms-field="primaryLabel" href={primaryHref} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#FFE600] px-5 text-xs font-extrabold text-[#08090A] transition-transform duration-150 active:scale-[.98]">{primaryLabel}</Link>
                <Link data-cms-field="secondaryLabel" href={secondaryHref} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/[.16] px-5 text-xs font-extrabold transition-colors hover:border-[#FFE600]/45 hover:bg-[#FFE600]/[.04]">{secondaryLabel}</Link>
              </div>
              <p data-cms-field="note" className="mt-3 max-w-2xl text-[9px] leading-5 text-white/25">{textContent(current, 'note')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
