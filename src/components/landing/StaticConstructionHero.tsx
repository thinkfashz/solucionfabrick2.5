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

interface StaticConstructionHeroProps {
  section?: HomeVisualSection;
}

export default function StaticConstructionHero({ section }: StaticConstructionHeroProps) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'hero');
  const advanced = getAdvancedStyle(current.style);
  const needs = objectList(current, 'needs');
  const highlights = stringList(current, 'highlights');
  const backgroundImage = current.style.backgroundImage?.trim();
  const overlay = Math.max(0, Math.min(100, Number(current.style.overlay ?? 58))) / 100;
  const accent = current.style.accent || '#F5871F';
  const background = current.style.background || '#08090A';
  const textColor = current.style.textColor || '#FFF9EE';
  const backgroundFit = advanced.backgroundFit === 'contain' ? 'contain' : 'cover';
  const positionX = clampPercent(advanced.backgroundPositionX, 50);
  const positionY = clampPercent(advanced.backgroundPositionY, 50);

  return (
    <section
      id="inicio"
      data-cms-section="home-hero"
      className="relative isolate overflow-hidden px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-28"
      style={{ backgroundColor: background, color: textColor }}
    >
      {backgroundImage ? (
        <div
          className="pointer-events-none absolute inset-0 -z-30"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: backgroundFit,
            backgroundPosition: `${positionX}% ${positionY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 -z-20" style={{ background: backgroundImage ? `linear-gradient(rgba(8,9,10,${overlay}),rgba(8,9,10,${overlay}))` : `radial-gradient(circle at 12% 10%,${accent}29,transparent 30rem),radial-gradient(circle at 88% 72%,${accent}14,transparent 28rem)` }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.04] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-9 lg:min-h-[610px] lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.62fr)] lg:gap-12">
        <div className="max-w-4xl">
          <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px] sm:tracking-[.24em]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
          <h1 data-cms-field="title" className="mt-4 max-w-[11ch] text-[clamp(2.75rem,13vw,7.3rem)] font-black leading-[.87] tracking-[-.07em] sm:mt-5 sm:leading-[.84]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>{textContent(current, 'title')}</h1>
          <p data-cms-field="description" className="mt-5 max-w-2xl text-[15px] leading-7 opacity-70 sm:mt-7 sm:text-lg sm:leading-8">{textContent(current, 'description')}</p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:gap-3">
            <Link data-cms-field="primaryLabel" href={textContent(current, 'primaryHref', '#cotizador')} className="inline-flex min-h-12 items-center justify-center rounded-full px-4 text-center text-[11px] font-black leading-4 text-[#08090A] transition hover:brightness-110 sm:min-h-14 sm:px-7 sm:text-sm" style={{ backgroundColor: accent }}>{textContent(current, 'primaryLabel', 'Calcular referencia')}</Link>
            <Link data-cms-field="secondaryLabel" href={textContent(current, 'secondaryHref', '/proyectos')} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-4 text-center text-[11px] font-black leading-4 transition hover:bg-white/[.05] sm:min-h-14 sm:px-7 sm:text-sm">{textContent(current, 'secondaryLabel', 'Ver proyectos')}</Link>
          </div>
          {highlights.length ? (
            <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden border-y border-white/9 bg-white/9 sm:mt-10 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:border-t sm:border-b-0 sm:bg-transparent sm:pt-5">
              {highlights.map((item) => <span data-cms-field="highlights" key={item} className="px-2 py-3 text-center text-[8px] font-bold uppercase leading-4 tracking-[.08em] opacity-45 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left sm:text-[10px] sm:tracking-[.14em]">{item}</span>)}
            </div>
          ) : null}
        </div>

        <aside className="border-t border-white/15 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p data-cms-field="sideEyebrow" className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{textContent(current, 'sideEyebrow', '¿Qué quieres hacer?')}</p>
          <div className="mt-3 divide-y divide-white/10 border-y border-white/10 sm:mt-4">
            {needs.map(({ title, text }) => (
              <div key={title} className="grid grid-cols-[92px_1fr] gap-3 py-4 sm:grid-cols-[110px_1fr] sm:py-5">
                <h2 data-cms-field="needs-title" className="text-sm font-black sm:text-lg">{title}</h2>
                <p data-cms-field="needs-text" className="text-xs leading-5 opacity-50 sm:leading-6">{text}</p>
              </div>
            ))}
          </div>
          <a data-cms-field="whatsappLabel" href={textContent(current, 'whatsappHref')} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#FFF9EE] px-5 text-xs font-black text-[#08090A] transition hover:brightness-95 sm:min-h-12 sm:text-sm">{textContent(current, 'whatsappLabel', 'Hablar por WhatsApp')}</a>
        </aside>
      </div>
    </section>
  );
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}
