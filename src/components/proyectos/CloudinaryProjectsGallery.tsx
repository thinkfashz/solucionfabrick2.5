'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, FolderOpen, Images, Loader2, MessageCircle, Search, Sparkles } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import StoreFooter from '@/components/store/StoreFooter';
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
  { key: 'ideas', label: 'Todo' },
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
  const reference = album ? `el álbum ${album.title}` : 'la biblioteca de Inspiraciones';
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
      if (asset.album_cover) current.cover = asset.thumb || asset.url;
    } else {
      map.set(asset.album, {
        key: asset.album,
        title: asset.album_title || asset.album.replace(/-/g, ' '),
        category: asset.category,
        description: asset.album_description || asset.description || 'Colección visual para comparar distribución, materiales, colores y terminaciones.',
        cover: asset.thumb || asset.url,
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
  return Array.from(map.values()).sort((a, b) => Number(b.interestScore || 0) - Number(a.interestScore || 0) || a.title.localeCompare(b.title));
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
        const nextAssets = (json.assets || []).sort((a, b) => a.album.localeCompare(b.album) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
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
    const q = query.trim().toLowerCase();
    return albums.filter((album) => {
      const categoryOk = activeCategory === 'ideas' || album.category === activeCategory;
      const searchable = `${album.title} ${album.description} ${album.category} ${album.primaryKeyword || ''} ${(album.keywords || []).join(' ')} ${(album.hashtags || []).join(' ')}`.toLowerCase();
      return categoryOk && (!q || searchable.includes(q));
    });
  }, [activeCategory, albums, query]);

  const albumAssets = useMemo(() => {
    const map = new Map<string, InspirationAsset[]>();
    for (const asset of assets) {
      const list = map.get(asset.album) || [];
      list.push(asset);
      map.set(asset.album, list);
    }
    return map;
  }, [assets]);

  const previewAssets = useMemo(() => {
    const allowed = new Set(filteredAlbums.map((album) => album.key));
    return assets.filter((asset) => allowed.has(asset.album)).slice(0, 14);
  }, [assets, filteredAlbums]);

  const jsonLd = useMemo(() => catalogJsonLd(albums), [albums]);
  const heroAlbums = albums.slice(0, 4);

  return (
    <div className="sf-inspirations min-h-screen overflow-x-hidden bg-[#F4EFE6] text-[#111214]">
      <style>{`
        @media(max-width:767px){
          .sf-inspirations > nav label{display:none!important}
          .sf-inspirations > nav > div{padding-bottom:.45rem!important}
        }
        .sf-album-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:1rem .7rem!important}
        .sf-album-grid>*{min-width:0!important;max-width:none!important}
        @media(min-width:720px){.sf-album-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1.4rem!important}}
        @media(min-width:1180px){.sf-album-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1.6rem!important}}
      `}</style>
      <StorefrontHeader />
      {albums.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}

      <main className="pb-24 md:pb-0">
        <section className="relative overflow-hidden bg-[#111214] text-white">
          {heroAlbums[0]?.cover ? <img src={heroAlbums[0].cover} alt="Inspiraciones Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover opacity-20" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,20,.98)_0%,rgba(17,18,20,.88)_48%,rgba(17,18,20,.55)_100%)]" />
          <div className="relative mx-auto grid max-w-[1380px] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_.85fr] lg:items-end lg:px-8 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]"><Sparkles className="h-3.5 w-3.5"/> Inspiraciones Fabrick</span>
              <h1 className="mt-5 max-w-[11ch] text-5xl font-black leading-[.88] tracking-[-.065em] sm:text-7xl lg:text-[5.8rem]">Ideas que puedes recorrer antes de construir.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">Explora álbumes de casas, cocinas, baños, terrazas, quinchos, piscinas y detalles constructivos. Mira referencias en línea, abre la galería completa y usa una idea como punto de partida para cotizar.</p>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#albumes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black text-black">Ver álbumes <ArrowRight className="h-4 w-4"/></a><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-black">Tengo una idea <MessageCircle className="h-4 w-4"/></a></div>
              <div className="mt-8 flex gap-7 border-t border-white/10 pt-5 text-xs"><div><b className="block text-2xl text-[#FFB000]">{albums.length}</b><span className="text-white/40">álbumes</span></div><div><b className="block text-2xl text-[#FFB000]">{assets.length}</b><span className="text-white/40">referencias</span></div><div><b className="block text-2xl text-[#FFB000]">{categories.length - 1}</b><span className="text-white/40">categorías</span></div></div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {heroAlbums.map((album, index) => <Link key={album.key} href={`/inspiraciones/${album.key}`} className={`group relative overflow-hidden rounded-2xl bg-white/5 ${index === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-[4/3]'}`}><img src={album.cover} alt={album.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent"/><span className="absolute inset-x-3 bottom-3"><span className="text-[8px] font-black uppercase tracking-[.13em] text-[#FFB000]">{album.count} imágenes</span><b className="mt-1 block text-sm leading-tight text-white sm:text-lg">{album.title}</b></span></Link>)}
            </div>
          </div>
        </section>

        <section id="albumes" className="scroll-mt-20 px-3 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[1380px]">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96F00]">Biblioteca visual</p><h2 className="mt-2 text-4xl font-black leading-[.92] tracking-[-.055em] sm:text-6xl">Encuentra una idea y ábrela.</h2></div><p className="max-w-xl text-sm leading-6 text-black/45">Dos álbumes por fila en móvil y hasta cuatro en escritorio. Cada tarjeta deja ver varias imágenes antes de entrar.</p></div>

            <div className="sticky top-[64px] z-30 -mx-3 mt-5 border-y border-black/10 bg-[#F4EFE6]/96 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 shadow-sm ring-1 ring-black/5"><Search className="h-4 w-4 text-[#F5871F]"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar casa, cocina, quincho, piscina…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-black/30"/><span className="text-[10px] font-black text-black/35">{filteredAlbums.length}</span></label>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((item)=><button key={item.key} onClick={()=>setActiveCategory(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.08em] ${activeCategory===item.key?'bg-black text-white':'bg-white text-black/48'}`}>{item.label}</button>)}</div>
            </div>

            {notice ? <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-xs text-amber-900">{notice}</div> : null}
            {loading ? <div className="mt-6 grid min-h-[40vh] place-items-center rounded-2xl bg-white"><div className="flex items-center gap-3 text-sm text-black/45"><Loader2 className="h-5 w-5 animate-spin text-[#F5871F]"/>Preparando álbumes…</div></div> : null}

            {!loading && previewAssets.length ? <section className="mt-7"><div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">Vista rápida</p><h3 className="mt-1 text-2xl font-black tracking-[-.04em]">Mira referencias sin salir de la página.</h3></div><Eye className="hidden h-5 w-5 text-black/25 sm:block"/></div><div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{previewAssets.map((asset)=><Link key={asset.id} href={`/inspiraciones/${asset.album}`} className="group relative min-w-[42%] snap-start overflow-hidden rounded-xl bg-white sm:min-w-[190px] lg:min-w-[220px]"><div className="aspect-[4/3] overflow-hidden"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/></div><div className="p-3"><p className="line-clamp-1 text-[9px] font-black uppercase tracking-[.1em] text-[#B96F00]">{asset.album_title}</p><p className="mt-1 line-clamp-2 text-xs font-bold leading-4">{asset.title}</p></div></Link>)}</div></section> : null}

            {!loading && filteredAlbums.length ? <div className="sf-album-grid mt-8">{filteredAlbums.map((album)=><AlbumCard key={album.key} album={album} assets={albumAssets.get(album.key) || []}/>)}</div> : null}
            {!loading && !filteredAlbums.length ? <EmptyState title="No encontramos álbumes" text="Prueba otra categoría o cambia la búsqueda."/> : null}
          </div>
        </section>

        <section className="bg-[#E9DDCA] px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><span className="grid h-12 w-12 place-items-center rounded-xl bg-black text-[#FFB000]"><FolderOpen className="h-5 w-5"/></span><h2 className="mt-5 max-w-[12ch] text-4xl font-black leading-[.95] tracking-[-.05em] sm:text-5xl">De una referencia visual a una solución construible.</h2></div><div><p className="max-w-2xl text-sm leading-7 text-black/50">Una imagen inspira, pero el proyecto final depende de medidas, estructura existente, instalaciones, materiales y terminaciones. Usa el álbum como referencia y luego aterrizamos contigo lo que realmente se puede ejecutar.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/presupuesto" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white">Calcular mi proyecto <ArrowRight className="h-4 w-4"/></Link><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-black">Hablar por WhatsApp <MessageCircle className="h-4 w-4"/></a></div></div></div></section>
      </main>

      <div className="bg-[#111214] pb-24 text-white md:pb-0"><StoreFooter/></div>
      <StoreBottomNav/>
    </div>
  );
}

function AlbumCard({ album, assets }: { album: InspirationAlbum; assets: InspirationAsset[] }) {
  const thumbs = assets.slice(0, 3);
  return <article className="group overflow-hidden rounded-2xl bg-white shadow-[0_10px_35px_rgba(20,15,10,.06)] ring-1 ring-black/5">
    <Link href={`/inspiraciones/${album.key}`} className="block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#E8E1D5]"><img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"/><span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"/><span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-black"><Images className="mr-1 inline h-3 w-3"/>{album.count}</span><span className="absolute inset-x-3 bottom-3"><InterestStars score={album.interestScore} label={album.interestLabel} compact tone="dark"/></span></div>
      <div className="p-3 sm:p-4"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#B96F00]">{album.category}</p><h3 className="mt-1 line-clamp-2 min-h-[2.4rem] text-sm font-black leading-[1.05] sm:text-lg">{album.title}</h3><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-black/42 sm:text-xs sm:leading-5">{album.description}</p>
      {thumbs.length ? <div className="mt-3 grid grid-cols-3 gap-1">{thumbs.map((asset)=><div key={asset.id} className="aspect-square overflow-hidden rounded-md bg-[#F2EEE7]"><img src={asset.thumb || asset.url} alt="" className="h-full w-full object-cover"/></div>)}</div>:null}
      <div className="mt-3 flex items-center justify-between border-t border-black/8 pt-3"><span className="text-[10px] font-black text-black/45">Abrir álbum</span><ArrowRight className="h-4 w-4 text-[#F5871F] transition group-hover:translate-x-1"/></div></div>
    </Link>
  </article>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="mt-7 grid min-h-[32vh] place-items-center rounded-2xl bg-white p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-[#F5871F]"/><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-black/45">{text}</p></div></div>;
}
