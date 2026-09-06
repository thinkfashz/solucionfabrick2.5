'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import { getAdvancedStyle } from '@/lib/homeVisualLayout';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';

const SERVICE_META = [
  { href: '/servicios/ampliaciones', label: 'Construcción' },
  { href: '/servicios', label: 'Remodelación' },
  { href: '/servicios', label: 'Instalaciones' },
];

export default function FabrickStorySection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'story');
  const advanced = getAdvancedStyle(current.style);
  const areas = objectList(current, 'areas');
  const configuredBackground = current.style.background || '';
  const background = !configuredBackground || configuredBackground.toUpperCase() === '#FFF9EE' ? '#FAF8F4' : configuredBackground;
  const textColor = current.style.textColor || '#111214';
  const accent = current.style.accent || '#9A5B22';
  const sectionAnchor = current.id === 'home-story' ? 'nosotros' : current.id;
  const primaryLabel = textContent(current, 'primaryLabel', 'Ver servicios');
  const secondaryLabel = textContent(current, 'secondaryLabel', 'Cotizar proyecto');
  const legacyPrimaryHref = textContent(current, 'primaryHref', '/servicios');
  const legacySecondaryHref = textContent(current, 'secondaryHref', '/presupuesto');
  const primaryHref = primaryLabel === 'Ver servicios' && legacyPrimaryHref === '/presupuesto' ? '/servicios' : legacyPrimaryHref;
  const secondaryHref = secondaryLabel === 'Cotizar proyecto' && legacySecondaryHref === '/proyectos' ? '/presupuesto' : legacySecondaryHref;
  const visualImage = current.style.backgroundImage?.trim() || HOME_PREMIUM_VISUALS.construction;
  const visualFit = advanced.backgroundFit === 'contain' ? 'contain' : 'cover';
  const visualX = clampPercent(advanced.backgroundPositionX, 50);
  const visualY = clampPercent(advanced.backgroundPositionY, 50);

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
              <Link data-cms-field="primaryLabel" href={primaryHref} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111214] px-5 text-xs font-black text-[#F6F1E8] transition hover:bg-[#2A2B2E] sm:px-6 sm:text-sm">{primaryLabel}</Link>
              <Link data-cms-field="secondaryLabel" href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-full border border-current/12 px-5 text-xs font-black transition hover:bg-black/[.035] sm:px-6 sm:text-sm">{secondaryLabel}</Link>
            </div>
          </div>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1.12fr_.88fr] lg:items-stretch">
          <div className="relative min-h-[340px] overflow-hidden rounded-[1.8rem] border border-black/[.06] bg-[#151518] shadow-[0_20px_55px_rgba(26,22,18,.09)] sm:min-h-[440px]">
            <img
              src={visualImage}
              alt="Servicio destacado de Soluciones Fabrick"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: visualFit, objectPosition: `${visualX}% ${visualY}%` }}
            />
          </div>

          <div className="grid gap-3">
            {areas.map(({ title, text }, index) => {
              const meta = SERVICE_META[index] || SERVICE_META[SERVICE_META.length - 1];
              return (
                <Link
                  href={meta.href}
                  key={`${title}-${index}`}
                  data-cms-container={`areas-${index}`}
                  className="group flex min-h-[150px] flex-col justify-between rounded-[1.45rem] border border-black/[.07] bg-[#151518] p-5 text-white shadow-[0_12px_35px_rgba(26,22,18,.06)] transition hover:-translate-y-0.5 hover:border-[#D77A2D]/25 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[.16em] text-[#E6B56F]">{meta.label}</span>
                    <span className="text-[9px] font-black opacity-25">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="mt-5">
                    <h3 data-cms-field={`areas-${index}-title`} className="max-w-[18ch] text-lg font-black leading-tight tracking-[-.03em] sm:text-xl">{title}</h3>
                    <p data-cms-field={`areas-${index}-text`} className="mt-2 max-w-md text-[11px] leading-5 text-white/48 sm:text-xs sm:leading-6">{text}</p>
                  </div>
                  <span className="mt-4 inline-flex text-[9px] font-black uppercase tracking-[.12em] text-white/58 transition group-hover:text-white">Ver servicio →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}
