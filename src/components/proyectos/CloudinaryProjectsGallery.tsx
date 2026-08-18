'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FolderOpen, Images, Loader2, MessageCircle, Search, Sparkles } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import InterestStars from '@/components/proyectos/InterestStars';

export type InspirationAsset = {
  id: string;
  public_id: string;
  title: string;
  description?: string;
  alt?: string;
  category: string;
  album: string;
  album_title: string;
  album_description?: string;
  album_hashtags?: string[];
  album_keywords?: string[];
  album_primary_keyword?: string;
  album_seo_title?: string;
  album_seo_description?: string;
  album_image_caption?: string;
  album_interest_score?: number;
  album_interest_label?: string;
  album_organization?: string;
  album_cover?: boolean;
  sort_order?: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  tags?: string[];
  created_at?: string;
  fallback?: boolean;
};

type InspirationAlbum = {
  key: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  count: number;
  hashtags?: string[];
  keywords?: string[];
  primaryKeyword?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageSearchCaption?: string;
  interestScore?: number;
  interestLabel?: string;
  organizationSummary?: string;
};

type ApiResponse = {
  assets: InspirationAsset[];
  albums?: InspirationAlbum[];
  categories: Array<{ key: string; label: string }>;
  source?: string;
  warning?: string;
  error?: string;
};

const WHATSAPP_PHONE = '56930121625';
const DEFAULT_CATEGORIES = [
  { key: 'ideas', label: 'Todas las ideas' },
  { key: 'cocinas', label: 'Cocinas' },
  { key: 'casas', label: 'Casas' },
  { key: 'planos', label: 'Planos' },
  { key: 'banos', label: 'Baños' },
  { key: 'muebles', label: 'Muebles' },
  { key: 'piscinas', label: 'Piscinas' },
  { key: 'quinchos', label: 'Quinchos' },
  { key: 'terrazas', label: 'Terrazas' },
];

function quoteUrl(album?: InspirationAlbum) {
  const reference = album ? `el álbum ${album.title}` : 'el catálogo de Inspiraciones';
  const text = `Hola Soluciones Fabrick, vi ${reference} y quiero conversar sobre una solución parecida para mi espacio. Necesito orientación sobre medidas, materiales y rango de inversión.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function buildAlbums(assets: InspirationAsset[]): InspirationAlbum[] {
  const map = new Map<string, InspirationAlbum>();
  for (const asset of assets) {
    const current = map.get(asset.album);
    const tags = asset.album_hashtags?.length ? asset.album_hashtags : asset.tags || [];
    const keywords = asset.album_keywords?.length ? asset.album_keywords : tags.map((tag) => tag.replace(/-/g, ' '));
    if (current) {
      current.count += 1;
      current.hashtags = Array.from(new Set([...(current.hashtags || []), ...tags])).slice(0, 18);
      current.keywords = Array.from(new Set([...(current.keywords || []), ...keywords])).slice(0, 18);
      if (asset.album_cover) current.cover = asset.thumb;
    } else {
      map.set(asset.album, {
        key: asset.album,
        title: asset.album_title || asset.album.replace(/-/g, ' '),
        category: asset.category,
        description: asset.album_description || asset.description || 'Colección visual para comparar distribución, materiales, colores y terminaciones.',
        cover: asset.thumb,
        count: 1,
        hashtags: tags.slice(0, 18),
        keywords: keywords.slice(0, 18),
        primaryKeyword: asset.album_primary_keyword || keywords[0] || '',
        seoTitle: asset.album_seo_title || '',
        seoDescription: asset.album_seo_description || '',
        imageSearchCaption: asset.album_image_caption || '',
        interestScore: asset.album_interest_score || 0,
        interestLabel: asset.album_interest_label || '',
        organizationSummary: asset.album_organization || '',
      });
    }
  }
  return Array.from(map.values()).sort((left, right) => Number(right.interestScore || 0) - Number(left.interestScore || 0) || left.title.localeCompare(right.title));
}

function catalogJsonLd(albums: InspirationAlbum[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Inspiraciones para construcción y remodelación | Soluciones Fabrick',
    description: 'Álbumes visuales de cocinas, casas, baños, muebles, piscinas, quinchos, terrazas y remodelaciones.',
    url: 'https://www.solucionesfabrick.com/proyectos',
    inLanguage: 'es-CL',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: albums.map((album, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://www.solucionesfabrick.com/inspiraciones/${album.key}`,
        name: album.title,
        item: {
          '@type': 'ImageGallery',
          name: album.title,
          description: album.description,
          keywords: [album.primaryKeyword, ...(album.keywords || [])].filter(Boolean).join(', '),
          image: {
            '@type': 'ImageObject',
            contentUrl: album.cover,
            thumbnailUrl: album.cover,
            caption: album.imageSearchCaption || album.description,
            name: album.title,
          },
        },
      })),
    },
  };
}

export default function CloudinaryProjectsGallery() {
  const [assets, setAssets] = useState<InspirationAsset[]>([]);
  const [albums, setAlbums] = useState<InspirationAlbum[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('ideas');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
        const json = await response.json() as ApiResponse;
        if (!mounted) return;
        const nextAssets = (json.assets || []).sort((left, right) => left.album.localeCompare(right.album) || Number(left.sort_order || 0) - Number(right.sort_order || 0));
        setAssets(nextAssets);
        setAlbums(json.albums?.length ? json.albums : buildAlbums(nextAssets));
        setCategories(json.categories?.length ? json.categories : DEFAULT_CATEGORIES);
        setNotice(json.warning || json.error || '');
      } catch (error) {
        if (mounted) setNotice(error instanceof Error ? error.message : 'No se pudo cargar Inspiraciones.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const filteredAlbums = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return albums.filter((album) => {
      const categoryOk = activeCategory === 'ideas' || album.category === activeCategory;
      const searchable = `${album.title} ${album.description} ${album.category} ${album.primaryKeyword || ''} ${(album.keywords || []).join(' ')} ${(album.hashtags || []).join(' ')}`.toLowerCase();
      return categoryOk && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeCategory, albums, query]);

  const jsonLd = useMemo(() => catalogJsonLd(albums), [albums]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9EE] text-[#08090A]">
      <StorefrontHeader />
      {albums.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}

      <section className="relative overflow-hidden bg-[#08090A] px-4 pb-12 pt-12 text-[#FFF9EE] sm:px-6 lg:px-10 lg:pb-16 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(204,177,150,.23),transparent_30rem),radial-gradient(circle_at_88%_18%,rgba(182,144,108,.16),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.28em] text-[#F2DFBB]"><Sparkles className="h-3.5 w-3.5" /> Biblioteca visual Fabrick</span>
          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.06fr)_minmax(360px,.94fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[.91] tracking-[-.07em] sm:text-7xl lg:text-8xl">Ideas de construcción y remodelación organizadas por álbum.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#D5C9C0] sm:text-lg">Explora colecciones de cocinas, casas, planos, baños, muebles, piscinas, terrazas y quinchos. Cada álbum incluye palabras clave, descripciones visibles y una página propia preparada para buscadores y asistentes de IA.</p>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#albumes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A]">Explorar álbumes <ArrowRight className="h-4 w-4" /></a><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/7 px-6 text-sm font-black text-[#FFF9EE]">Contar mi idea <MessageCircle className="h-4 w-4" /></a></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {albums.slice(0, 3).map((album, index) => <Link key={album.key} href={`/inspiraciones/${album.key}`} className={`group relative overflow-hidden rounded-[1.7rem] text-left ${index === 0 ? 'col-span-2 h-56' : 'h-40'}`}><img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-[#08090A]/92 via-[#08090A]/12 to-transparent" /><span className="absolute inset-x-4 bottom-4"><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#FFB000]">{album.count} imágenes agrupadas</span><b className="mt-1 block text-lg text-white">{album.title}</b></span></Link>)}
            </div>
          </div>
        </div>
      </section>

      <section id="albumes" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#F5871F]">Álbumes de ideas</p><h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">Busca por espacio, estilo o palabra clave.</h2></div><p className="max-w-2xl text-sm leading-7 text-[#BFB8AC]">Cada portada abre una página semántica con carrusel 3D, galería completa, textos descriptivos, palabras relacionadas y metadata de imagen.</p></div>

          <div className="sticky top-[68px] z-20 -mx-4 mt-7 border-y border-[#08090A]/8 bg-[#FFF9EE]/94 px-4 py-3 backdrop-blur-2xl md:mx-0 md:rounded-[1.6rem] md:border">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#08090A]/8"><Search className="h-4 w-4 text-[#F5871F]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cocina mediterránea, quincho, piscina…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#9B8E84]" /></label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((item) => <button key={item.key} type="button" onClick={() => setActiveCategory(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${activeCategory === item.key ? 'bg-[#08090A] text-[#FFF9EE]' : 'bg-white text-[#BFB8AC] ring-1 ring-[#08090A]/7'}`}>{item.label}</button>)}</div>
          </div>

          {notice ? <div className="mt-5 rounded-2xl bg-[#F2DFBB] p-4 text-sm text-[#BFB8AC]">{notice}</div> : null}
          {loading ? <div className="mt-6 grid min-h-[42vh] place-items-center rounded-[2rem] bg-white"><div className="flex items-center gap-3 text-[#BFB8AC]"><Loader2 className="h-5 w-5 animate-spin text-[#F5871F]" /> Preparando álbumes desde Cloudinary…</div></div> : null}
          {!loading && filteredAlbums.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredAlbums.map((album, index) => <AlbumCard key={album.key} album={album} index={index} />)}</div> : null}
          {!loading && !filteredAlbums.length ? <EmptyState title="No encontramos álbumes" text="Prueba otra categoría o cambia la búsqueda." /> : null}
          <p className="sr-only">{assets.map((asset) => `${asset.title}. ${asset.alt || ''}. ${asset.description || ''}`).join(' ')}</p>
        </div>
      </section>

      <section className="bg-[#F2DFBB] px-4 py-14 sm:px-6 lg:px-10"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.78fr_1.22fr] lg:items-center"><div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><FolderOpen className="h-6 w-6" /></span><h2 className="mt-5 text-4xl font-black leading-[.96] tracking-[-.05em]">Guarda la idea. Nosotros aterrizamos la solución.</h2></div><div><p className="text-sm leading-7 text-[#BFB8AC]">Una referencia visual no define por sí sola el costo ni la factibilidad. Para convertirla en propuesta revisamos medidas, estructura existente, instalaciones, materiales, permisos y nivel de terminación.</p><a href="/presupuesto" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#08090A] px-6 text-sm font-black text-[#FFF9EE]">Abrir calculadoras de servicios <ArrowRight className="h-4 w-4" /></a></div></div></section>
      <StoreBottomNav />
    </div>
  );
}

function AlbumCard({ album, index }: { album: InspirationAlbum; index: number }) {
  return (
    <article className={`group relative overflow-hidden rounded-[2rem] bg-[#08090A] text-left shadow-[0_20px_70px_rgba(23,24,32,.12)] ${index % 5 === 0 ? 'sm:row-span-2' : ''}`}>
      <Link href={`/inspiraciones/${album.key}`} className="block" aria-label={`Abrir álbum ${album.title}`}>
        <figure>
          <div className={index % 5 === 0 ? 'h-[520px]' : 'h-[360px]'}><img src={album.cover} alt={album.imageSearchCaption || album.title} width={820} height={index % 5 === 0 ? 1100 : 760} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" /></div>
          <span className="absolute inset-0 bg-gradient-to-t from-[#08090A]/98 via-[#08090A]/18 to-transparent" />
          <figcaption className="absolute inset-x-5 bottom-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-[#FFF9EE]/92 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#08090A]"><Images className="h-3 w-3" /> {album.count} referencias</span><InterestStars score={album.interestScore} label={album.interestLabel} compact tone="dark" /></div>
            <h3 className="mt-3 text-2xl font-black text-white">{album.title}</h3>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#D2C6BD]">{album.description}</p>
            {album.primaryKeyword ? <p className="mt-3 text-[9px] font-black uppercase tracking-[.13em] text-[#FFB000]">Idea principal: {album.primaryKeyword}</p> : null}
            <div className="mt-3 flex flex-wrap gap-1">{album.hashtags?.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white/8 px-2 py-1 text-[8px] font-black text-[#F2DFBB]">#{tag}</span>)}</div>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#F2DFBB]">Abrir carrusel y galería <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </figcaption>
        </figure>
      </Link>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="mt-7 grid min-h-[32vh] place-items-center rounded-[2rem] bg-white p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-[#F5871F]" /><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-[#BFB8AC]">{text}</p></div></div>;
}
