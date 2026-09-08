'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  stringList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import { getAdvancedStyle } from '@/lib/homeVisualLayout';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';

interface StaticConstructionHeroProps {
  section?: HomeVisualSection;
}

export default function StaticConstructionHero({ section }: StaticConstructionHeroProps) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'hero');
  const advanced = getAdvancedStyle(current.style);
  const needs = objectList(current, 'needs');
  const highlights = stringList(current, 'highlights');
  const selectedVisual = current.style.backgroundImage?.trim();
  const visualImage = selectedVisual || HOME_PREMIUM_VISUALS.hero;
  const accent = current.style.accent || '#D77A2D';
  const configuredBackground = current.style.background || '';
  const normalizedBackground = configuredBackground.toUpperCase();
  const background = !configuredBackground || normalizedBackground === '#08090A' || normalizedBackground === '#2F4F6F' ? '#0E0E10' : configuredBackground;
  const textColor = current.style.textColor || '#F6F1E8';
  const backgroundFit = advanced.backgroundFit === 'contain' ? 'contain' : 'cover';
  const positionX = clampPercent(advanced.backgroundPositionX, 50);
  const positionY = clampPercent(advanced.backgroundPositionY, 50);
  const sectionAnchor = current.id === 'home-hero' ? 'inicio' : current.id;
  const primaryLabel = textContent(current, 'primaryLabel', 'Cotizar proyecto');
  const legacyPrimaryHref = textContent(current, 'primaryHref', '/presupuesto');
  const primaryHref = primaryLabel === 'Cotizar proyecto' && legacyPrimaryHref === '#cotizador' ? '/presupuesto' : legacyPrimaryHref;

  return (
    <section
      id={sectionAnchor}
      data-cms-section="home-hero"
      className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32"
      style={{ backgroundColor: background, color: textColor }}
    >
      <div className="pointer-events-none absolute inset-0 -z-20" style={{ background: `radial-gradient(circle at 12% 8%,${accent}1F,transparent 31rem),radial-gradient(circle at 90% 82%,${accent}0D,transparent 28rem)` }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.018] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:84px_84px]" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:min-h-[610px] lg:grid-cols-[minmax(0,1.03fr)_minmax(390px,.77fr)] lg:gap-14">
        <div className="max-w-4xl">
          <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px] sm:tracking-[.24em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
          <h1 data-cms-field="title" className="mt-4 max-w-[12ch] text-[clamp(2.7rem,9vw,5.9rem)] font-black leading-[.91] tracking-[-.064em] sm:mt-5" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>{textContent(current, 'title')}</h1>
          <p data-cms-field="description" className="mt-6 max-w-2xl text-[15px] leading-7 opacity-62 sm:text-lg sm:leading-8">{textContent(current, 'description')}</p>

          <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:flex-wrap">
            <Link data-cms-field="primaryLabel" href={primaryHref} className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-center text-xs font-black text-[#111214] transition hover:brightness-105 sm:min-h-13 sm:px-7 sm:text-sm" style={{ backgroundColor: accent }}>{primaryLabel}</Link>
            <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/proyectos')} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/[.025] px-6 text-center text-xs font-black transition hover:bg-white/[.055] sm:min-h-13 sm:px-7 sm:text-sm">{textContent(current, 'secondaryLabel', 'Ver inspiraciones')}</Link>
          </div>

          {highlights.length ? (
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[.08] pt-5 sm:mt-11 sm:gap-x-7">
              {highlights.map((item, index) => (
                <span data-cms-container={`highlights-${index}`} data-cms-field={`highlights-${index}`} key={`${item}-${index}`} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] opacity-42 sm:text-[10px]">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: accent }} />{item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/[.08] bg-[#121315] shadow-[0_28px_80px_rgba(0,0,0,.28)]">
          <div className="relative aspect-[4/3] min-h-[310px] overflow-hidden bg-black/35 sm:min-h-[360px] lg:min-h-[390px]">
            <img
              src={visualImage}
              alt="Vivienda contemporánea de referencia · Soluciones Fabrick"
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: backgroundFit, objectPosition: `${positionX}% ${positionY}%` }}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <div className="border-t border-white/[.08] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p data-cms-field="sideEyebrow" className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{textContent(current, 'sideEyebrow', 'Empieza por lo que necesitas')}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/35">Visual</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {needs.map(({ title, text }, index) => (
                <div data-cms-container={`needs-${index}`} key={`${title}-${index}`} className="rounded-2xl border border-white/[.07] bg-white/[.025] px-3.5 py-3">
                  <h2 data-cms-field={`needs-${index}-title`} className="text-xs font-black sm:text-sm">{title}</h2>
                  <p data-cms-field={`needs-${index}-text`} className="mt-1.5 text-[10px] leading-5 opacity-48 sm:text-[11px]">{text}</p>
                </div>
              ))}
            </div>

            <a data-cms-field="whatsappLabel" href={textContent(current, 'whatsappHref')} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[.12em] underline decoration-white/20 underline-offset-4 transition hover:decoration-white/60">{textContent(current, 'whatsappLabel', 'Hablar por WhatsApp')}</a>
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
