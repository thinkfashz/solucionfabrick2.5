'use client';

import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Quote, Sparkles } from 'lucide-react';
import type { HomeVisualSection } from '@/lib/homeVisualCms';

export type HomeVisualLibraryRendererId =
  | 'editorial'
  | 'info-cards'
  | 'gallery'
  | 'cta-process'
  | 'services'
  | 'testimonials';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop stop-color="%2308090A"/%3E%3Cstop offset=".55" stop-color="%23231A10"/%3E%3Cstop offset="1" stop-color="%23F5871F"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1200" height="800" fill="url(%23g)"/%3E%3Ccircle cx="980" cy="140" r="210" fill="%23FFB000" opacity=".16"/%3E%3Cpath d="M0 680 420 360l210 170 180-120 390 290v100H0Z" fill="%23FFF9EE" opacity=".09"/%3E%3C/svg%3E';

export default function HomeVisualLibraryBlock({ section, templateId }: { section: HomeVisualSection; templateId: HomeVisualLibraryRendererId }) {
  if (templateId === 'editorial') return <MediaTextBlock section={section} />;
  if (templateId === 'info-cards') return <CardsGridBlock section={section} />;
  if (templateId === 'gallery') return <GalleryBlock section={section} />;
  if (templateId === 'cta-process') return <CtaBannerBlock section={section} />;
  if (templateId === 'services') return <ServicesGridBlock section={section} />;
  if (templateId === 'testimonials') return <TestimonialsBlock section={section} />;
  return null;
}

function MediaTextBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#F5871F';
  const image = field(section, 'image');
  const imageAlt = field(section, 'imageAlt', 'Imagen de la sección');
  const imagePosition = field(section, 'imagePosition', 'right');
  const imageFirst = imagePosition === 'left';
  return (
    <section data-cms-section="cms-media-text" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(section, '#FFF9EE', '#08090A')}>
      <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[minmax(0,.92fr)_minmax(420px,1.08fr)] lg:items-center lg:gap-14">
        <div className={imageFirst ? 'lg:order-2' : ''}>
          <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
          <h2 data-cms-field="title" className="mt-3 max-w-[12ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{field(section, 'title')}</h2>
          <p data-cms-field="description" className="mt-5 max-w-2xl text-sm leading-7 opacity-60 sm:text-base">{field(section, 'description')}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ActionLink fieldName="primaryLabel" href={field(section, 'primaryHref', '/presupuesto')} accent={accent}>{field(section, 'primaryLabel', 'Continuar')}</ActionLink>
            <ActionLink fieldName="secondaryLabel" href={field(section, 'secondaryHref', '/proyectos')} secondary>{field(section, 'secondaryLabel', 'Ver más')}</ActionLink>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {items(section, 'points').map((item, index) => (
              <div data-cms-container={`points-${index}`} key={`${item.title}-${index}`} className="border-t border-current/12 pt-4">
                <p data-cms-field={`points-${index}-title`} className="text-sm font-black">{item.title}</p>
                <p data-cms-field={`points-${index}-text`} className="mt-1 text-xs leading-6 opacity-50">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <figure className={['relative min-h-[320px] overflow-hidden rounded-[2rem] bg-black/10 sm:min-h-[440px]', imageFirst ? 'lg:order-1' : ''].join(' ')}>
          <img data-cms-field="image" src={safeImage(image) || PLACEHOLDER_IMAGE} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <figcaption data-cms-field="imageCaption" className="absolute bottom-4 left-4 right-4 max-w-lg text-xs font-semibold leading-5 text-white/85 drop-shadow sm:bottom-6 sm:left-6">{field(section, 'imageCaption')}</figcaption>
        </figure>
      </div>
    </section>
  );
}

function CardsGridBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#B96F00';
  return (
    <section data-cms-section="cms-cards-grid" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(section, '#FFF9EE', '#08090A')}>
      <div className="mx-auto max-w-[1280px]">
        <header className="grid gap-5 border-b border-current/10 pb-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[12ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{field(section, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-55 sm:text-base">{field(section, 'description')}</p>
        </header>
        <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items(section, 'cards').map((item, index) => (
            <article data-cms-container={`cards-${index}`} key={`${item.title}-${index}`} className="group min-h-[230px] border border-current/10 p-5 transition hover:-translate-y-0.5 sm:p-6">
              <div className="flex items-center justify-between">
                <span data-cms-field={`cards-${index}-number`} className="text-[10px] font-black tracking-[.18em] opacity-30">{item.number || String(index + 1).padStart(2, '0')}</span>
                <Sparkles className="h-4 w-4 opacity-20 transition group-hover:opacity-60" style={{ color: accent }} />
              </div>
              <h3 data-cms-field={`cards-${index}-title`} className="mt-12 text-xl font-black tracking-[-.03em]">{item.title}</h3>
              <p data-cms-field={`cards-${index}-text`} className="mt-3 text-sm leading-7 opacity-50">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#F5871F';
  const gallery = items(section, 'gallery');
  return (
    <section data-cms-section="cms-gallery" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(section, '#08090A', '#FFF9EE')}>
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col gap-5 border-b border-current/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[13ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{field(section, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-xl text-sm leading-7 opacity-50 sm:text-base">{field(section, 'description')}</p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-12">
          {gallery.map((item, index) => {
            const wide = index % 3 === 0;
            return (
              <figure data-cms-container={`gallery-${index}`} key={`${item.title}-${index}`} className={`${wide ? 'lg:col-span-7' : 'lg:col-span-5'} group relative min-h-[300px] overflow-hidden bg-white/5 sm:min-h-[390px]`}>
                <img data-cms-field={`gallery-${index}-image`} src={safeImage(item.image) || PLACEHOLDER_IMAGE} alt={item.alt || item.title || 'Imagen de galería'} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
                  <h3 data-cms-field={`gallery-${index}-title`} className="text-xl font-black tracking-[-.03em] sm:text-2xl">{item.title}</h3>
                  <p data-cms-field={`gallery-${index}-text`} className="mt-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">{item.text}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CtaBannerBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#FFB000';
  return (
    <section data-cms-section="cms-cta-banner" className="px-4 py-10 sm:px-6 md:px-12 lg:py-16" style={sectionStyle(section, '#08090A', '#FFF9EE')}>
      <div className="mx-auto max-w-[1280px] border-y border-current/12 py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[17ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-7xl">{field(section, 'title')}</h2>
            <p data-cms-field="description" className="mt-5 max-w-2xl text-sm leading-7 opacity-55 sm:text-base">{field(section, 'description')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:min-w-[230px]">
            <ActionLink fieldName="ctaLabel" href={field(section, 'ctaHref', '/presupuesto')} accent={accent}>{field(section, 'ctaLabel', 'Continuar')}</ActionLink>
            <ActionLink fieldName="secondaryLabel" href={field(section, 'secondaryHref', '/contacto')} secondary>{field(section, 'secondaryLabel', 'Hablar con Fabrick')}</ActionLink>
          </div>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {items(section, 'highlights').map((item, index) => (
            <div data-cms-container={`highlights-${index}`} key={`${item.title}-${index}`} className="flex gap-3 border-t border-current/10 pt-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <div><b data-cms-field={`highlights-${index}-title`} className="block text-xs">{item.title}</b><p data-cms-field={`highlights-${index}-text`} className="mt-1 text-[11px] leading-5 opacity-45">{item.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesGridBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#F5871F';
  return (
    <section data-cms-section="cms-services-grid" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(section, '#FFF9EE', '#08090A')}>
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{field(section, 'title')}</h2>
          </div>
          <p data-cms-field="description" className="max-w-2xl text-sm leading-7 opacity-55 sm:text-base">{field(section, 'description')}</p>
        </div>
        <div className="mt-8 border-t border-current/10">
          {items(section, 'services').map((item, index) => (
            <article data-cms-container={`services-${index}`} key={`${item.title}-${index}`} className="grid gap-3 border-b border-current/10 py-6 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:gap-5">
              <span data-cms-field={`services-${index}-number`} className="text-xs font-black opacity-25">{item.number || String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 data-cms-field={`services-${index}-title`} className="text-xl font-black tracking-[-.03em]">{item.title}</h3>
                <p data-cms-field={`services-${index}-text`} className="mt-1 max-w-3xl text-sm leading-6 opacity-50">{item.text}</p>
              </div>
              <ActionLink fieldName={`services-${index}-label`} href={item.href || '/servicios'} compact secondary>{item.label || 'Ver servicio'}</ActionLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ section }: { section: HomeVisualSection }) {
  const accent = section.style.accent || '#FFB000';
  return (
    <section data-cms-section="cms-testimonials" className="px-4 py-16 sm:px-6 md:px-12 lg:py-24" style={sectionStyle(section, '#08090A', '#FFF9EE')}>
      <div className="mx-auto max-w-[1280px]">
        <header className="max-w-3xl">
          <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>{field(section, 'eyebrow')}</p>
          <h2 data-cms-field="title" className="mt-3 max-w-[13ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{field(section, 'title')}</h2>
          <p data-cms-field="description" className="mt-5 text-sm leading-7 opacity-50 sm:text-base">{field(section, 'description')}</p>
        </header>
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {items(section, 'testimonials').map((item, index) => (
            <figure data-cms-container={`testimonials-${index}`} key={`${item.title}-${index}`} className="flex min-h-[300px] flex-col border border-current/10 p-5 sm:p-6">
              <Quote className="h-6 w-6 opacity-20" style={{ color: accent }} />
              <blockquote data-cms-field={`testimonials-${index}-text`} className="mt-8 flex-1 text-lg font-semibold leading-8 tracking-[-.02em] opacity-80">{item.text}</blockquote>
              <figcaption className="mt-8 border-t border-current/10 pt-4">
                <b data-cms-field={`testimonials-${index}-title`} className="block text-sm">{item.title}</b>
                <span data-cms-field={`testimonials-${index}-role`} className="mt-1 block text-[10px] uppercase tracking-[.12em] opacity-35">{item.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p data-cms-field="note" className="mt-5 max-w-3xl text-[10px] leading-5 opacity-35">{field(section, 'note')}</p>
      </div>
    </section>
  );
}

function ActionLink({ href, children, fieldName, accent, secondary = false, compact = false }: { href: string; children: React.ReactNode; fieldName: string; accent?: string; secondary?: boolean; compact?: boolean }) {
  const className = `${compact ? 'min-h-10 px-4 text-[10px]' : 'min-h-12 px-6 text-sm'} inline-flex items-center justify-center gap-2 rounded-full font-black transition hover:brightness-110 ${secondary ? 'border border-current/15' : ''}`;
  const style = secondary ? undefined : { backgroundColor: accent || '#FFB000', color: '#08090A' };
  const content = <><span data-cms-field={fieldName}>{children}</span><ArrowUpRight className="h-3.5 w-3.5" /></>;
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>{content}</a>;
  return <Link href={href || '#'} className={className} style={style}>{content}</Link>;
}

function field(section: HomeVisualSection, key: string, fallback = '') {
  const value = section.content[key];
  return typeof value === 'string' ? value : fallback;
}

function items(section: HomeVisualSection, key: string): Array<Record<string, string>> {
  const value = section.content[key];
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  });
}

function sectionStyle(section: HomeVisualSection, background: string, textColor: string) {
  return { backgroundColor: section.style.background || background, color: section.style.textColor || textColor };
}

function safeImage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:image/')) return trimmed;
  return '';
}
