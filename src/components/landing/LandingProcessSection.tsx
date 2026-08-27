'use client';

import Link from 'next/link';
import {
  DEFAULT_HOME_PAGE,
  getHomeSection,
  objectList,
  textContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

export default function LandingProcessSection({ section }: { section?: HomeVisualSection }) {
  const current = section ?? getHomeSection(DEFAULT_HOME_PAGE, 'process');
  const options = objectList(current, 'options');
  const background = current.style.background || '#08090A';
  const textColor = current.style.textColor || '#FFF9EE';
  const accent = current.style.accent || '#FFB000';

  return (
    <section id="como-funciona" data-cms-section="home-process" className="relative scroll-mt-20 px-4 py-14 sm:px-6 md:px-12 lg:py-24" style={{ backgroundColor: background, color: textColor }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-7 border-b border-current/10 pb-7 lg:grid-cols-[.75fr_1.25fr] lg:items-end lg:pb-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] sm:text-[10px]" style={{ color: accent }}>{textContent(current, 'eyebrow')}</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">{textContent(current, 'title')}</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 opacity-50 sm:text-base">{textContent(current, 'description')}</p>
        </div>

        <div className="grid gap-px bg-current/10 md:grid-cols-3">
          {options.map(({ title, text }) => (
            <article key={title} className="p-5 sm:p-7" style={{ backgroundColor: background }}>
              <h3 className="text-lg font-black tracking-[-.03em]">{title}</h3>
              <p className="mt-3 text-sm leading-7 opacity-45">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: `${accent}55` }}>
          <div><b className="text-lg">{textContent(current, 'ctaTitle')}</b><p className="mt-1 text-xs leading-5 opacity-45">{textContent(current, 'ctaText')}</p></div>
          <Link href={textContent(current, 'ctaHref', '/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-xs font-black text-[#08090A] transition hover:brightness-110 sm:min-h-12 sm:text-sm" style={{ backgroundColor: accent }}>
            {textContent(current, 'ctaLabel', 'Armar mi presupuesto')}
          </Link>
        </div>
      </div>
    </section>
  );
}
