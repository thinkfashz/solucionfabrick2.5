'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Images, Loader2 } from 'lucide-react';
import type { HomeVisualSection } from '@/lib/homeVisualCms';

type Album = {
  key: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  count: number;
  hashtags?: string[];
  keywords?: string[];
  primaryKeyword?: string;
};

type CatalogResponse = { albums?: Album[]; error?: string; warning?: string };

function text(section: HomeVisualSection, key: string, fallback: string) {
  const value = section.content[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function cleanImage(value: string) {
  return value.trim().replace(/["'\\\n\r<>]/g, '');
}

export default function HomeInspirationsSection({ section }: { section: HomeVisualSection }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({})) as CatalogResponse;
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        setAlbums(Array.isArray(body.albums) ? body.albums.filter((album) => album?.key && album?.cover) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setAlbums([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const featuredAlbums = useMemo(() => albums.slice(0, 8), [albums]);
  const colors = useMemo(() => ({
    backgroundColor: section.style.background || '#121315',
    color: section.style.textColor || '#F6F1E8',
    '--inspiration-accent': section.style.accent || '#D77A2D',
  }) as CSSProperties, [section.style.accent, section.style.background, section.style.textColor]);
  const backgroundImage = cleanImage(section.style.backgroundImage || '');

  const move = (direction: -1 | 1) => {
    const node = carouselRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <section
      data-cms-section="home-inspiration"
      className="relative isolate overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      style={{
        ...colors,
        ...(backgroundImage ? { backgroundImage: `linear-gradient(rgba(10,11,13,.88),rgba(10,11,13,.94)),url("${backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_4%,color-mix(in_srgb,var(--inspiration-accent)_10%,transparent),transparent_30rem)]" />
      <div className="relative mx-auto max-w-[1320px]">
        <header className="flex flex-col gap-6 border-b border-white/[.08] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--inspiration-accent)]">{text(section, 'eyebrow', 'Ideas para empezar')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[15ch] text-3xl font-black leading-[.98] tracking-[-.05em] sm:text-5xl">{text(section, 'title', 'Encuentra una dirección visual para tu proyecto.')}</h2>
            <p data-cms-field="description" className="mt-4 max-w-2xl text-xs leading-6 opacity-48 sm:text-sm sm:leading-7">{text(section, 'description', 'Desliza entre referencias y abre solo las ideas que quieras explorar con más detalle.')}</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <div className="flex gap-2">
              <button type="button" onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/[.1] bg-white/[.025] text-white/70 transition hover:bg-white/[.07] hover:text-white" aria-label="Inspiración anterior"><ArrowLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/[.1] bg-white/[.025] text-white/70 transition hover:bg-white/[.07] hover:text-white" aria-label="Siguiente inspiración"><ArrowRight className="h-4 w-4" /></button>
            </div>
            <Link data-cms-field="ctaLabel" href={text(section, 'ctaHref', '/proyectos')} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[var(--inspiration-accent)] transition hover:gap-2.5 sm:text-[10px]">
              {text(section, 'ctaLabel', 'Explorar todas')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mt-7 flex min-h-52 items-center justify-center rounded-[1.5rem] border border-white/[.08] bg-white/[.02]"><Loader2 className="h-5 w-5 animate-spin text-[var(--inspiration-accent)]" /><span className="ml-2 text-xs font-bold opacity-40">Cargando inspiraciones…</span></div>
        ) : featuredAlbums.length ? (
          <div ref={carouselRef} className="-mx-4 mt-7 grid snap-x snap-mandatory auto-cols-[82vw] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:auto-cols-[46%] sm:px-0 lg:auto-cols-[31%] xl:auto-cols-[27%]">
            {featuredAlbums.map((album, index) => (
              <Link
                key={album.key}
                href={`/inspiraciones/${encodeURIComponent(album.key)}`}
                data-cms-container={`inspiration-${index}`}
                className="group relative min-w-0 snap-start overflow-hidden rounded-[1.55rem] bg-white/[.04]"
              >
                <figure className="relative aspect-[4/5] overflow-hidden">
                  <img data-cms-field={`inspiration-${index}-image`} src={album.cover} alt={`${album.title}, inspiración para proyectos Soluciones Fabrick`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/22 to-black/5" />
                  <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-black/20 text-white/70 backdrop-blur-md transition group-hover:bg-[var(--inspiration-accent)] group-hover:text-black"><ArrowUpRight className="h-4 w-4" /></span>
                  <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <span className="text-[8px] font-black uppercase tracking-[.15em] text-[var(--inspiration-accent)]">{album.category} · {album.count} imágenes</span>
                    <strong data-cms-field={`inspiration-${index}-title`} className="mt-2 line-clamp-2 block max-w-[18ch] text-xl font-black leading-tight tracking-[-.035em] text-white sm:text-2xl">{album.title}</strong>
                    <span className="mt-4 inline-flex text-[9px] font-black uppercase tracking-[.12em] text-white/58">Abrir idea →</span>
                  </figcaption>
                </figure>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-7 flex min-h-52 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.02] px-6 text-center">
            <Images className="h-7 w-7 text-[var(--inspiration-accent)]" />
            <p data-cms-field="emptyText" className="mt-3 max-w-md text-sm leading-6 opacity-45">{text(section, 'emptyText', 'Sube imágenes desde Proyectos en el administrador para mostrarlas automáticamente aquí.')}</p>
          </div>
        )}

        <p className="mt-2 text-[9px] uppercase tracking-[.12em] text-white/28 sm:hidden">Desliza para ver más ideas →</p>
      </div>
    </section>
  );
}
