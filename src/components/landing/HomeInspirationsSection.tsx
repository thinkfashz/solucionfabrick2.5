'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Images, Loader2 } from 'lucide-react';
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

  const featuredAlbums = useMemo(() => albums.slice(0, 5), [albums]);
  const serviceReferences = useMemo(() => matchServicesToAlbums(albums), [albums]);
  const colors = useMemo(() => ({
    backgroundColor: section.style.background || '#111214',
    color: section.style.textColor || '#FFF9EE',
    '--inspiration-accent': section.style.accent || '#FFB000',
  }) as CSSProperties, [section.style.accent, section.style.background, section.style.textColor]);

  const backgroundImage = cleanImage(section.style.backgroundImage || '');

  return (
    <section
      data-cms-section="home-inspiration"
      className="relative isolate overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28"
      style={{
        ...colors,
        ...(backgroundImage ? { backgroundImage: `linear-gradient(rgba(8,9,10,.78),rgba(8,9,10,.9)),url("${backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,color-mix(in_srgb,var(--inspiration-accent)_18%,transparent),transparent_34%)]" />
      <div className="relative mx-auto max-w-[1380px]">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.62fr)] lg:items-end">
          <div>
            <p data-cms-field="eyebrow" className="text-[10px] font-black uppercase tracking-[.22em] text-[var(--inspiration-accent)]">{text(section, 'eyebrow', 'Inspiración Fabrick')}</p>
            <h2 data-cms-field="title" className="mt-4 max-w-[14ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-5xl lg:text-7xl">{text(section, 'title', 'Encuentra una idea y conviértela en tu proyecto.')}</h2>
          </div>
          <div className="lg:pb-2">
            <p data-cms-field="description" className="max-w-xl text-sm leading-7 opacity-55 sm:text-base">{text(section, 'description', 'Explora proyectos, ambientes y terminaciones relacionadas con nuestros servicios.')}</p>
            <Link data-cms-field="ctaLabel" href={text(section, 'ctaHref', '/proyectos')} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--inspiration-accent)] px-5 text-xs font-black text-black transition hover:brightness-110">
              {text(section, 'ctaLabel', 'Ver todas las inspiraciones')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mt-10 flex min-h-56 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[.03]"><Loader2 className="h-5 w-5 animate-spin text-[var(--inspiration-accent)]" /><span className="ml-2 text-xs font-bold opacity-45">Cargando inspiraciones…</span></div>
        ) : featuredAlbums.length ? (
          <div className="mt-10 grid auto-rows-[170px] grid-cols-2 gap-2 sm:auto-rows-[230px] sm:gap-3 lg:grid-cols-4 lg:grid-rows-2">
            {featuredAlbums.map((album, index) => (
              <Link
                key={album.key}
                href={`/inspiraciones/${encodeURIComponent(album.key)}`}
                data-cms-container={`inspiration-${index}`}
                className={`group relative isolate min-w-0 overflow-hidden rounded-[1.25rem] bg-white/5 ${index === 0 ? 'col-span-2 row-span-2' : ''} ${index === 1 && featuredAlbums.length < 5 ? 'col-span-2' : ''}`}
              >
                <img data-cms-field={`inspiration-${index}-image`} src={album.cover} alt={`${album.title}, inspiración para proyectos Soluciones Fabrick`} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-5">
                  <span className="text-[8px] font-black uppercase tracking-[.16em] text-[var(--inspiration-accent)]">{album.category} · {album.count} imágenes</span>
                  <strong data-cms-field={`inspiration-${index}-title`} className={`mt-1 block font-black leading-tight tracking-[-.03em] ${index === 0 ? 'text-xl sm:text-3xl' : 'text-sm sm:text-lg'}`}>{album.title}</strong>
                  {index === 0 && album.description ? <span className="mt-2 hidden max-w-xl text-xs leading-5 text-white/60 sm:line-clamp-2">{album.description}</span> : null}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex min-h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/[.03] px-6 text-center">
            <Images className="h-7 w-7 text-[var(--inspiration-accent)]" />
            <p data-cms-field="emptyText" className="mt-3 max-w-md text-sm leading-6 opacity-50">{text(section, 'emptyText', 'Sube imágenes desde Proyectos en el administrador para mostrarlas automáticamente aquí.')}</p>
          </div>
        )}

        <div className="mt-16 border-t border-white/10 pt-10 sm:mt-20 sm:pt-12">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,.72fr)_minmax(320px,1.28fr)] lg:items-end">
            <div>
              <p data-cms-field="servicesEyebrow" className="text-[10px] font-black uppercase tracking-[.22em] text-[var(--inspiration-accent)]">{text(section, 'servicesEyebrow', 'Servicios + referencias visuales')}</p>
              <h3 data-cms-field="servicesTitle" className="mt-3 max-w-[12ch] text-3xl font-black leading-[.96] tracking-[-.045em] sm:text-4xl lg:text-5xl">{text(section, 'servicesTitle', 'Mira una idea y reconoce qué podemos construir o transformar.')}</h3>
            </div>
            <p data-cms-field="servicesDescription" className="max-w-2xl text-sm leading-7 opacity-50 sm:text-base">{text(section, 'servicesDescription', 'Las imágenes se reutilizan automáticamente desde la biblioteca de Inspiración para relacionar cada servicio con una referencia visual realmente compatible.')}</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {serviceReferences.map(({ service, album }, index) => (
              <article key={service.key} data-cms-container={`service-reference-${index}`} className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[.035]">
                <Link
                  href={album ? `/inspiraciones/${encodeURIComponent(album.key)}` : service.href}
                  className="group relative block aspect-[4/3] overflow-hidden bg-white/5"
                  aria-label={album ? `Ver inspiración ${album.title}` : `Ver ${service.title}`}
                >
                  {album?.cover ? (
                    <img
                      data-cms-field={`service-reference-${index}-image`}
                      src={album.cover}
                      alt={`${service.title}: referencia visual ${album.title}`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_srgb,var(--inspiration-accent)_28%,transparent),transparent_40%),linear-gradient(135deg,#191b1f,#090a0c)]" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-white/75 backdrop-blur-md">{album ? 'Referencia visual' : 'Sin referencia aún'}</span>
                  <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <span className="block text-[8px] font-black uppercase tracking-[.14em] text-[var(--inspiration-accent)]">{album ? 'Abrir inspiración' : 'Ver servicio'}</span>
                    <strong className="mt-1 line-clamp-2 block text-sm leading-tight">{album?.title || service.title}</strong>
                  </span>
                </Link>
                <div className="p-4 sm:p-5">
                  <span className="text-[9px] font-black uppercase tracking-[.16em] opacity-35">Servicio {String(index + 1).padStart(2, '0')}</span>
                  <h4 className="mt-2 text-lg font-black leading-tight tracking-[-.03em]">{service.title}</h4>
                  <p className="mt-2 text-xs leading-6 opacity-50">{service.description}</p>
                  <Link href={service.href} className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[var(--inspiration-accent)] transition hover:gap-2.5">
                    Ver servicio <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}