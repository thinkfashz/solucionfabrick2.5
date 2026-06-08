'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PublicHomeSection } from '@/lib/cms';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';
import ScrollReveal, { ScrollRevealGroup, ScrollRevealItem } from './ScrollReveal';

interface Props {
  sections: PublicHomeSection[];
}

/**
 * Renders dynamic editor-managed sections (home or tienda).
 *
 * Each section is rendered with a layout chosen by `kind`. Unknown kinds use
 * the default banner-style layout. Sections without any visible content are
 * skipped so an accidentally empty row doesn't break the page.
 *
 * Specialized fields per kind live under the JSONB `data` column and are
 * read defensively so older rows missing keys still render with reasonable
 * defaults.
 *
 * Visual language mirrors `LandingSections`/`/tienda`: Playfair display
 * headings, yellow-electric accents, glass cards and `ScrollReveal`
 * fade+slide-in-view entrances — so CMS-authored sections feel native to
 * the rest of the home page rather than bolted on.
 */
export default function HomeDynamicSections({ sections }: Props) {
  if (!sections || sections.length === 0) return null;
  const renderable = sections.filter(
    (s) => s.title || s.subtitle || s.body || s.image_url || hasGalleryImages(s) || hasCustomHtml(s),
  );
  if (renderable.length === 0) return null;

  return (
    <div className="space-y-0">
      {renderable.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </div>
  );
}

function getString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function hasGalleryImages(s: PublicHomeSection): boolean {
  if (s.kind !== 'galeria') return false;
  const imgs = (s.data?.images as Array<{ url?: string }> | undefined) ?? [];
  return Array.isArray(imgs) && imgs.some((i) => i && typeof i.url === 'string' && i.url.length > 0);
}

function hasCustomHtml(s: PublicHomeSection): boolean {
  if (s.kind !== 'custom') return false;
  const html = getString(s.data ?? {}, 'html');
  return html.trim().length > 0;
}

/** Small uppercase eyebrow label — consistent with the rest of the home page. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-yellow-400 font-bold tracking-[0.4em] text-[10px] uppercase block mb-2">
      {children}
    </span>
  );
}

function SectionRenderer({ section }: { section: PublicHomeSection }) {
  // Build primary CTA. Allow `data.cta_label` / `data.cta_url` to override
  // the legacy top-level `link_*` fields so the specialized editor's input
  // wins.
  const data = section.data ?? {};
  const ctaUrl = getString(data, 'cta_url') || section.link_url || '';
  const ctaLabel = getString(data, 'cta_label') || section.link_label || 'Ver más';
  const ctaStyle = getString(data, 'cta_style') === 'outline' ? 'outline' : 'solid';
  const customClasses = getString(data, 'custom_classes');

  const cta = ctaUrl ? (
    <Link
      href={ctaUrl}
      className={
        ctaStyle === 'outline'
          ? 'group mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-yellow-400 transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:shadow-yellow-sm'
          : 'group mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-yellow-300 hover:shadow-yellow-md'
      }
    >
      {ctaLabel}
      <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
    </Link>
  ) : null;

  if (section.kind === 'galeria') {
    const imgs = (data.images as Array<{ url?: string; alt?: string }> | undefined) ?? [];
    const cols = Number(data.columns ?? 3);
    const validCols = cols === 2 || cols === 3 || cols === 4 ? cols : 3;
    const grid =
      validCols === 2 ? 'md:grid-cols-2' : validCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
    return (
      <section className={`bg-black py-16 md:py-24 px-4 md:px-12 border-t border-white/5 ${customClasses || ''}`.trim()} data-cms-id={section.id}>
        <div className="mx-auto max-w-7xl">
          <ScrollReveal className="text-center mb-10 md:mb-14">
            {section.subtitle && <Eyebrow>{section.subtitle}</Eyebrow>}
            {section.title && (
              <h2 className="font-playfair text-2xl font-black leading-tight text-white md:text-4xl">
                {section.title}
              </h2>
            )}
          </ScrollReveal>
          <ScrollRevealGroup className={`grid gap-3 md:gap-4 grid-cols-2 ${grid}`} stagger={0.06}>
            {imgs.map((img, idx) =>
              img && img.url ? (
                <ScrollRevealItem key={idx}>
                  <div className="group aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                    <img
                      src={cloudinaryUrl(img.url, { width: 600, quality: 70 })}
                      alt={img.alt ?? ''}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </ScrollRevealItem>
              ) : null,
            )}
          </ScrollRevealGroup>
          {cta && <div className="text-center mt-10 md:mt-12">{cta}</div>}
        </div>
      </section>
    );
  }

  if (section.kind === 'custom') {
    const html = getString(data, 'html');
    if (html) {
      return (
        <section className={`bg-black py-16 md:py-24 px-4 md:px-12 border-t border-white/5 ${customClasses || ''}`.trim()} data-cms-id={section.id}>
          <ScrollReveal className="mx-auto max-w-5xl text-zinc-200 prose prose-invert prose-headings:font-playfair prose-a:text-yellow-400 prose-strong:text-white">
            {/* Editor-controlled HTML; only superadmin can write here. Keep
                this isolated from user-generated content. */}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </ScrollReveal>
        </section>
      );
    }
  }

  if (section.kind === 'banner' && section.image_url) {
    const bg = getString(data, 'bg_color');
    return (
      <section
        className={`relative isolate w-full overflow-hidden py-20 md:py-28 px-4 md:px-12 ${customClasses || ''}`.trim()}
        style={{ background: bg || 'black' }}
        data-cms-id={section.id}
      >
        <img
          src={cloudinaryUrl(section.image_url, { width: 1600, quality: 65 })}
          alt={section.title ?? ''}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/20" />
        <ScrollReveal className="relative z-10 mx-auto max-w-4xl text-center text-white">
          {section.subtitle && <Eyebrow>{section.subtitle}</Eyebrow>}
          {section.title && (
            <h2 className="font-playfair text-3xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              {section.title}
            </h2>
          )}
          {section.body && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 md:text-base">
              {section.body}
            </p>
          )}
          {cta && <div className="flex justify-center">{cta}</div>}
        </ScrollReveal>
      </section>
    );
  }

  if (section.kind === 'cta') {
    return (
      <section className={`bg-zinc-950 py-16 md:py-24 px-4 md:px-12 border-t border-white/5 ${customClasses || ''}`.trim()} data-cms-id={section.id}>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          {section.subtitle && <Eyebrow>{section.subtitle}</Eyebrow>}
          {section.title && (
            <h2 className="font-playfair text-2xl font-black leading-tight text-yellow-400 md:text-4xl">
              {section.title}
            </h2>
          )}
          {section.body && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-300 md:text-base">{section.body}</p>
          )}
          {cta && <div className="flex justify-center">{cta}</div>}
        </ScrollReveal>
      </section>
    );
  }

  // Default / hero / custom layout — split copy + image, image right on
  // desktop. Aspect ratio is fixed so CMS images never distort the grid.
  const badge = getString(data, 'badge');
  return (
    <section className={`bg-black py-16 md:py-24 px-4 md:px-12 border-t border-white/5 ${customClasses || ''}`.trim()} data-cms-id={section.id}>
      <div className="mx-auto max-w-6xl">
        <div className={section.image_url ? 'grid gap-8 md:grid-cols-2 md:gap-14 md:items-center' : ''}>
          <ScrollReveal direction="left" className="text-center md:text-left">
            {badge && (
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-black/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-yellow-400/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                {badge}
              </span>
            )}
            {section.subtitle && <Eyebrow>{section.subtitle}</Eyebrow>}
            {section.title && (
              <h2 className="font-playfair text-2xl font-black leading-tight text-white md:text-4xl">
                {section.title}
              </h2>
            )}
            {section.body && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300 md:text-base">
                {section.body}
              </p>
            )}
            {cta}
          </ScrollReveal>
          {section.image_url && (
            <ScrollReveal direction="right" delay={0.1}>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={cloudinaryUrl(section.image_url, { width: 800, quality: 70 })}
                  alt={section.title ?? ''}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>
    </section>
  );
}
