import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import type { PublicHomeSection } from '@/lib/cms';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

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

function SectionRenderer({ section }: { section: PublicHomeSection }) {
  // Build primary CTA. Allow `data.cta_label` / `data.cta_url` to override
  // the legacy top-level `link_*` fields so the specialized editor's input
  // wins.
  const data = section.data ?? {};
  const ctaUrl = getString(data, 'cta_url') || section.link_url || '';
  const ctaLabel = getString(data, 'cta_label') || section.link_label || 'Ver más';
  const ctaStyle = getString(data, 'cta_style') === 'outline' ? 'outline' : 'solid';

  const cta = ctaUrl ? (
    <Link
      href={ctaUrl}
      className={
        ctaStyle === 'outline'
          ? 'mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-yellow-400 transition hover:bg-yellow-400 hover:text-black'
          : 'mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-white'
      }
    >
      {ctaLabel}
    </Link>
  ) : null;

  if (section.kind === 'galeria') {
    const imgs = (data.images as Array<{ url?: string; alt?: string }> | undefined) ?? [];
    const cols = Number(data.columns ?? 3);
    const validCols = cols === 2 || cols === 3 || cols === 4 ? cols : 3;
    const grid =
      validCols === 2 ? 'md:grid-cols-2' : validCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
    return (
      <section className="bg-black py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          {section.title && <h2 className="font-playfair text-2xl font-black text-white md:text-4xl">{section.title}</h2>}
          {section.subtitle && <p className="mt-2 text-xs uppercase tracking-[0.3em] text-yellow-400">{section.subtitle}</p>}
          <div className={`mt-6 grid gap-4 grid-cols-2 ${grid}`}>
            {imgs.map((img, idx) =>
              img && img.url ? (
                <img
                  key={idx}
                  src={cloudinaryUrl(img.url, { width: 600, quality: 70 })}
                  alt={img.alt ?? ''}
                  className="aspect-square w-full rounded-2xl border border-white/10 object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : null,
            )}
          </div>
          {cta}
        </div>
      </section>
    );
  }

  if (section.kind === 'custom') {
    const html = getString(data, 'html');
    if (html) {
      return (
        <section className="bg-black py-12 md:py-16">
          <div
            className="mx-auto max-w-5xl px-6 text-zinc-200 prose prose-invert"
            // Editor-controlled HTML; only superadmin can write here. Keep
            // this isolated from user-generated content.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>
      );
    }
  }

  if (section.kind === 'banner' && section.image_url) {
    const bg = getString(data, 'bg_color');
    return (
      <section
        className="relative w-full overflow-hidden py-12 md:py-20"
        style={{ background: bg || 'black' }}
      >
        <img src={cloudinaryUrl(section.image_url, { width: 1600, quality: 65 })} alt={section.title ?? ''} className="absolute inset-0 h-full w-full object-cover opacity-50" loading="lazy" decoding="async" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center text-white">
          {section.title && <h2 className="font-playfair text-3xl font-black tracking-tight md:text-5xl">{section.title}</h2>}
          {section.subtitle && <p className="mt-3 text-sm uppercase tracking-[0.3em] text-yellow-400">{section.subtitle}</p>}
          {section.body && <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-200 md:text-base">{section.body}</p>}
          {cta}
        </div>
      </section>
    );
  }

  if (section.kind === 'cta') {
    return (
      <section className="bg-zinc-950 py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          {section.title && <h2 className="font-playfair text-2xl font-black text-yellow-400 md:text-4xl">{section.title}</h2>}
          {section.body && <p className="mt-3 text-sm text-zinc-300 md:text-base">{section.body}</p>}
          {cta}
        </div>
      </section>
    );
  }

  // Default / hero / custom layout
  const badge = getString(data, 'badge');
  return (
    <section className="bg-black py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className={section.image_url ? 'grid gap-8 md:grid-cols-2 md:items-center' : ''}>
          <div>
            {badge && (
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-black/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-yellow-400/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                {badge}
              </span>
            )}
            {section.title && <h2 className="font-playfair text-2xl font-black text-white md:text-4xl">{section.title}</h2>}
            {section.subtitle && <p className="mt-2 text-xs uppercase tracking-[0.3em] text-yellow-400">{section.subtitle}</p>}
            {section.body && <p className="mt-3 text-sm text-zinc-300 md:text-base whitespace-pre-line">{section.body}</p>}
            {cta}
          </div>
          {section.image_url && (
            <img src={cloudinaryUrl(section.image_url, { width: 800, quality: 70 })} alt={section.title ?? ''} className="rounded-2xl border border-white/10 object-cover" loading="lazy" decoding="async" />
          )}
        </div>
      </div>
    </section>
  );
}
