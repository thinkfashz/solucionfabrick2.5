'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Images, Loader2 } from 'lucide-react';
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

type ServiceReference = {
  key: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
};

const SERVICE_REFERENCES: ServiceReference[] = [
  {
    key: 'construction',
    title: 'Construcción y ampliaciones',
    description: 'Casas, ampliaciones, estructuras Metalcon, radier y partidas para crear o abrir nuevos espacios.',
    href: '/servicios/ampliaciones',
    keywords: ['casa', 'casas', 'construccion', 'ampliacion', 'estructura', 'metalcon', 'prefabricada', 'radier', 'fundacion', 'espacios abiertos'],
  },
  {
    key: 'kitchens',
    title: 'Cocinas y remodelación',
    description: 'Transformación de cocinas, distribución, revestimientos, mobiliario y terminaciones para renovar el espacio.',
    href: '/servicios',
    keywords: ['cocina', 'cocinas', 'remodelacion', 'transformacion', 'culinario', 'culinarios', 'revestimiento'],
  },
  {
    key: 'exterior',
    title: 'Terrazas y exterior',
    description: 'Terrazas, patios, quinchos, techumbres, siding, fachadas y soluciones para mejorar espacios exteriores.',
    href: '/servicios',
    keywords: ['terraza', 'terrazas', 'patio', 'exterior', 'quincho', 'techumbre', 'techo', 'siding', 'fachada', 'cubierta', 'jardin'],
  },
  {
    key: 'finishes',
    title: 'Terminaciones y mobiliario',
    description: 'Carpintería, estanterías, revestimientos, pintura y detalles interiores que terminan de definir cada ambiente.',
    href: '/servicios',
    keywords: ['estanteria', 'estanterias', 'mueble', 'muebles', 'mobiliario', 'madera', 'interior', 'interiores', 'terminacion', 'revestimiento', 'remodelacion'],
  },
];

function text(section: HomeVisualSection, key: string, fallback: string) {
  const value = section.content[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function cleanImage(value: string) {
  return value.trim().replace(/["'\\\n\r<>]/g, '');
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function albumSearchText(album: Album) {
  return normalizeSearch([
    album.title,
    album.category,
    album.description,
    album.primaryKeyword || '',
    ...(album.keywords || []),
    ...(album.hashtags || []),
  ].join(' '));
}

function scoreAlbum(album: Album, service: ServiceReference) {
  const haystack = albumSearchText(album);
  return service.keywords.reduce((score, keyword) => score + (haystack.includes(normalizeSearch(keyword)) ? 1 : 0), 0);
}

function matchServicesToAlbums(albums: Album[]) {
  const used = new Set<string>();
  return SERVICE_REFERENCES.map((service) => {
    const ranked = albums
      .filter((album) => !used.has(album.key))
      .map((album) => ({ album, score: scoreAlbum(album, service) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || right.album.count - left.album.count);
    const matched = ranked[0]?.album || null;
    if (matched?.key) used.add(matched.key);
    return { service, album: matched };
  });
}

export default function HomeInspirationsSection({ section }: { section: HomeVisualSection }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

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

  const featuredAlbums = useMemo(() => albums.slice(0, 6), [albums]);
  const serviceReferences = useMemo(() => matchServicesToAlbums(albums), [albums]);
  const colors = useMemo(() => ({
    backgroundColor: section.style.background || '#111316',
    color: section.style.textColor || '#F7F4EE',
    '--inspiration-accent': section.style.accent || '#F5A13D',
  }) as CSSProperties, [section.style.accent, section.style.background, section.style.textColor]);

  const backgroundImage = cleanImage(section.style.backgroundImage || '');

  return (
    <section
      data-cms-section="home-inspiration"
      className="relative isolate overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      style={{
        ...colors,
        ...(backgroundImage ? { backgroundImage: `linear-gradient(rgba(10,11,13,.84),rgba(10,11,13,.94)),url("${backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_4%,color-mix(in_srgb,var(--inspiration-accent)_12%,transparent),transparent_32rem)]" />
      <div className="relative mx-auto max-w-[1320px]">
        <header className="grid gap-7 border-b border-white/[.08] pb-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--inspiration-accent)]">{text(section, 'eyebrow', 'Inspiración Fabrick')}</p>
            <h2 data-cms-field="title" className="mt-3 max-w-[13ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{text(section, 'title', 'Encuentra una idea y conviértela en tu proyecto.')}</h2>
          </div>
          <div className="lg:pb-1">
            <p data-cms-field="description" className="max-w-xl text-sm leading-7 opacity-52 sm:text-base">{text(section, 'description', 'Explora proyectos, ambientes y terminaciones relacionadas con nuestros servicios.')}</p>
            <Link data-cms-field="ctaLabel" href={text(section, 'ctaHref', '/proyectos')} className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[var(--inspiration-accent)] transition hover:gap-2.5">
              {text(section, 'ctaLabel', 'Ver todas las inspiraciones')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mt-8 flex min-h-56 items-center justify-center rounded-[1.6rem] border border-white/[.08] bg-white/[.025]"><Loader2 className="h-5 w-5 animate-spin text-[var(--inspiration-accent)]" /><span className="ml-2 text-xs font-bold opacity-40">Cargando inspiraciones…</span></div>
        ) : featuredAlbums.length ? (
          <div className="-mx-4 mt-8 grid auto-cols-[minmax(270px,82vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {featuredAlbums.map((album, index) => (
              <Link
                key={album.key}
                href={`/inspiraciones/${encodeURIComponent(album.key)}`}
                data-cms-container={`inspiration-${index}`}
                className="group min-w-0"
              >
                <figure className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] bg-white/[.04]">
                  <img data-cms-field={`inspiration-${index}-image`} src={album.cover} alt={`${album.title}, inspiración para proyectos Soluciones Fabrick`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" />
                  <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white opacity-70 backdrop-blur-md transition group-hover:bg-[var(--inspiration-accent)] group-hover:text-black group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
                </figure>
                <div className="px-1 pt-3.5">
                  <span className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--inspiration-accent)]">{album.category} · {album.count} imágenes</span>
                  <strong data-cms-field={`inspiration-${index}-title`} className="mt-1.5 line-clamp-2 block text-base font-black leading-tight tracking-[-.03em] sm:text-lg">{album.title}</strong>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex min-h-56 flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-white/15 bg-white/[.025] px-6 text-center">
            <Images className="h-7 w-7 text-[var(--inspiration-accent)]" />
            <p data-cms-field="emptyText" className="mt-3 max-w-md text-sm leading-6 opacity-45">{text(section, 'emptyText', 'Sube imágenes desde Proyectos en el administrador para mostrarlas automáticamente aquí.')}</p>
          </div>
        )}

        <div className="mt-14 border-t border-white/[.08] pt-9 sm:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p data-cms-field="servicesEyebrow" className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--inspiration-accent)]">{text(section, 'servicesEyebrow', 'Servicios + referencias visuales')}</p>
              <h3 data-cms-field="servicesTitle" className="mt-2 max-w-[20ch] text-2xl font-black leading-tight tracking-[-.04em] sm:text-3xl">{text(section, 'servicesTitle', 'Mira una idea y reconoce qué podemos construir o transformar.')}</h3>
            </div>
            <p data-cms-field="servicesDescription" className="max-w-xl text-xs leading-6 opacity-42 sm:text-sm">{text(section, 'servicesDescription', 'Las imágenes se reutilizan desde Inspiración para relacionar cada servicio con una referencia visual compatible.')}</p>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {serviceReferences.map(({ service, album }, index) => (
              <article key={service.key} data-cms-container={`service-reference-${index}`} className="group rounded-[1.25rem] border border-white/[.08] bg-white/[.025] p-2 transition hover:bg-white/[.045]">
                <Link href={album ? `/inspiraciones/${encodeURIComponent(album.key)}` : service.href} className="flex min-h-[92px] items-center gap-3" aria-label={album ? `Ver inspiración ${album.title}` : `Ver ${service.title}`}>
                  <span className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[1rem] bg-white/[.04]">
                    {album?.cover ? <img data-cms-field={`service-reference-${index}-image`} src={album.cover} alt={`${service.title}: referencia visual ${album.title}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /> : <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,color-mix(in_srgb,var(--inspiration-accent)_22%,transparent),transparent_45%),#181A1E]" />}
                  </span>
                  <span className="min-w-0 flex-1 pr-1">
                    <span className="text-[8px] font-black uppercase tracking-[.13em] text-[var(--inspiration-accent)]">{album ? 'Ver referencia' : 'Servicio'}</span>
                    <strong className="mt-1 block text-sm leading-tight">{service.title}</strong>
                    <span className="mt-1 line-clamp-1 block text-[10px] opacity-38">{album?.title || service.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-35 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}