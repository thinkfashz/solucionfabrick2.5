'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

const SERVICE_VISUALS = [
  { src: '/images/landing/fabrick-home-showcase.webp', href: '/servicios/ampliaciones', label: 'Construcción' },
  { src: '/images/fabrick-construction-hero.webp', href: '/servicios', label: 'Remodelación' },
  { src: '/images/landing/fabrick-house-plan.webp', href: '/servicios', label: 'Terminaciones' },
];

export default function FabrickStorySection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'story');
  const areas = objectList(current, 'areas');
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#FFF9EE' ? '#FAF8F4' : configuredBackground;
  const textColor = current.style.textColor || '#111214';
  const accent = current.style.accent || '#9A5B22';
  const sectionAnchor = current.id === 'home-story' ? 'nosotros' : current.id;

  return (
    <section id={sectionAnchor} data-cms-section="home-story" className="px-4 py-18 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[13ch] text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-5xl lg:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <div className="lg:pb-1">
            <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-50 sm:text-base">{textContent(current, 'description')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link data-cms-field="primaryLabel" href={textContent(current, 'primaryHref', '/servicios')} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111214] px-5 text-xs font-black text-[#F6F1E8] transition hover:bg-[#2A2B2E] sm:px-6 sm:text-sm">{textContent(current, 'primaryLabel', 'Ver servicios')}</Link>
              <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full border border-current/12 px-5 text-xs font-black transition hover:bg-black/[.035] sm:px-6 sm:text-sm">{textContent(current, 'secondaryLabel', 'Cotizar proyecto')}</Link>
            </div>
          </div>
        </div>

        <div className="mt-9 grid gap-3 md:grid-cols-3">
          {areas.map(({ title, text }, index) => {
            const visual = SERVICE_VISUALS[index % SERVICE_VISUALS.length];
            return (
              <Link href={visual.href} key={`${title}-${index}`} data-cms-container={`areas-${index}`} className="group relative min-h-[330px] overflow-hidden rounded-[1.6rem] bg-[#151518] text-white sm:min-h-[390px]">
                <img src={visual.src} alt={`${title} · Soluciones Fabrick`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-black/8" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[.16em] text-[#E6B56F]">{visual.label}</span>
                    <span className="text-[9px] font-black opacity-38">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 data-cms-field={`areas-${index}-title`} className="mt-3 max-w-[16ch] text-xl font-black leading-tight tracking-[-.035em] sm:text-2xl">{title}</h3>
                  <p data-cms-field={`areas-${index}-text`} className="mt-2 max-w-sm text-xs leading-6 text-white/58 sm:text-sm">{text}</p>
                  <span className="mt-5 inline-flex text-[9px] font-black uppercase tracking-[.12em] text-white/72 transition group-hover:text-white">Ver servicio →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
