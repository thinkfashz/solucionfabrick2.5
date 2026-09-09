'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ImageOff, Images, Loader2, MessageCircle, Search } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import InspirationFooter from '@/components/proyectos/InspirationFooter';
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
const PREMIUM_KITCHEN_PUBLIC_ID = 'fabrick/inspiraciones/estilos-de-cocinas-para-cada-gusto/cctdsbifgfg5ca9edgbq';
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

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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

function heroScore(asset: InspirationAsset) {
  if (asset.public_id === PREMIUM_KITCHEN_PUBLIC_ID) return 1000;
  const text = normalize(`${asset.title} ${asset.description || ''} ${asset.alt || ''} ${(asset.tags || []).join(' ')} ${asset.category}`);
  let score = 0;
  if (normalize(asset.category).includes('cocina')) score += 30;
  if (text.includes('minimal')) score += 18;
  if (text.includes('sofistic')) score += 16;
  if (text.includes('elegant')) score += 14;
  if (text.includes('moderna')) score += 10;
  if (text.includes('marmol')) score += 8;
  if (text.includes('madera')) score += 5;
  const ratio = asset.height ? asset.width / asset.height : 1;
  if (ratio >= 0.7 && ratio <= 1.6) score += 3;
  return score;
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
      itemListElement: albums.map((album, index) => ({ '@type': 'ListItem', position: index + 1, url: `https://www.solucionesfabrick.com/inspiraciones/${album.key}`, name: album.title })),
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
        const nextAssets = (json.assets || []).filter((asset) => !asset.fallback).sort((a, b) => a.album.localeCompare(b.album) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
        const nextAlbums = json.albums?.length ? json.albums.filter((album) => nextAssets.some((asset) => asset.album === album.key)) : buildAlbums(nextAssets);
        setAssets(nextAssets);
        setAlbums(nextAlbums);
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

  const featuredHeroAsset = useMemo(() => [...assets].sort((a, b) => heroScore(b) - heroScore(a))[0], [assets]);
  const featuredHeroAlbum = useMemo(() => albums.find((album) => album.key === featuredHeroAsset?.album) || albums.find((album) => normalize(album.category).includes('cocina')) || albums[0], [albums, featuredHeroAsset]);
  const heroAlbums = useMemo(() => {
    const ordered: InspirationAlbum[] = [];
    if (featuredHeroAlbum) ordered.push(featuredHeroAlbum);
    for (const album of albums) if (!ordered.some((item) => item.key === album.key)) ordered.push(album);
    return ordered.slice(0, 4);
  }, [albums, featuredHeroAlbum]);
  const heroImage = featuredHeroAsset?.url || featuredHeroAlbum?.cover || '';
  const jsonLd = useMemo(() => catalogJsonLd(albums), [albums]);

  return (
    <div className="sf-inspirations min-h-screen overflow-x-hidden bg-[#05090C] text-white">
      <style>{`
        @media(max-width:767px){.sf-inspirations > nav label{display:none!important}.sf-inspirations > nav > div{padding-bottom:.45rem!important}}
        .sf-album-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.8rem!important}
        .sf-album-grid>*{min-width:0!important;max-width:none!important}
        @media(min-width:720px){.sf-album-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important}}
        @media(min-width:1180px){.sf-album-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1.15rem!important}}
      `}</style>
      <StorefrontHeader />
      {albums.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}

      <main className="pb-24 md:pb-0">
        <section className="relative isolate min-h-[720px] overflow-hidden border-b border-white/8 bg-[#05090C] sm:min-h-[760px] lg:min-h-[690px]">
          {heroImage ? <img src={heroImage} alt={featuredHeroAsset?.alt || featuredHeroAsset?.title || 'Cocina moderna de Inspiraciones Soluciones Fabrick'} className="absolute inset-0 h-full w-full object-cover object-[center_52%] opacity-55" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,10,.22)_0%,rgba(3,7,10,.66)_40%,rgba(3,7,10,.98)_82%)] lg:bg-[linear-gradient(90deg,rgba(3,7,10,.99)_0%,rgba(3,7,10,.88)_42%,rgba(3,7,10,.38)_78%,rgba(3,7,10,.62)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(246,198,74,.12),transparent_26%)]" />
          <div className="relative mx-auto grid min-h-[720px] max-w-[1460px] gap-8 px-4 py-12 sm:min-h-[760px] sm:px-6 sm:py-16 lg:min-h-[690px] lg:grid-cols-[.9fr_1.1fr] lg:items-end lg:px-8 lg:py-20">
            <div>
              <span className="inline-flex rounded-full border border-[#F6C64A]/25 bg-black/28 px-4 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A] backdrop-blur-md">Inspiraciones Soluciones Fabrick</span>
              <h1 className="mt-5 max-w-[10ch] text-5xl font-black leading-[.86] tracking-[-.07em] sm:text-7xl lg:text-[6rem]">Mira la idea. Recorre el álbum. Hazla tuya.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">Una biblioteca conectada a tus proyectos: referencias reales agrupadas por álbum, categoría y estilo para decidir antes de cotizar, remodelar o construir.</p>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#albumes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-sm font-black text-black">Explorar álbumes <ArrowRight className="h-4 w-4"/></a><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 bg-black/20 px-5 text-sm font-black backdrop-blur-md">Cotizar desde una idea <MessageCircle className="h-4 w-4"/></a></div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-2 border-t border-white/12 pt-5"><Metric value={albums.length} label="álbumes"/><Metric value={assets.length} label="referencias"/><Metric value={Math.max(0, categories.length - 1)} label="categorías"/></div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {heroAlbums.length ? heroAlbums.map((album, index) => <Link key={album.key} href={`/inspiraciones/${album.key}`} className={`group relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/[.035] shadow-[0_18px_60px_rgba(0,0,0,.28)] ${index === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-[4/3]'}`}><img src={index === 0 && featuredHeroAsset?.album === album.key ? (featuredHeroAsset.thumb || featuredHeroAsset.url) : album.cover} alt={album.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/10 to-transparent"/><span className="absolute inset-x-3 bottom-3"><span className="text-[8px] font-black uppercase tracking-[.13em] text-[#57D4FF]">{album.category} · {album.count} imágenes</span><b className="mt-1 block text-sm leading-tight text-white sm:text-lg">{album.title}</b></span></Link>) : <NoImageHero />}
            </div>
          </div>
        </section>

        <section className="border-b border-white/8 bg-[#080D10] px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-[1380px] gap-2 md:grid-cols-4"><Journey number="01" title="Encuentra" text="Filtra el álbum por espacio o estilo."/><Journey number="02" title="Recorre" text="Abre las referencias y compáralas."/><Journey number="03" title="Comenta" text="Deja preguntas o sugerencias dentro del álbum."/><Journey number="04" title="Cotiza" text="Usa esa referencia como punto de partida."/></div></section>

        <section id="albumes" className="scroll-mt-20 px-3 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[1380px]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Biblioteca visual</p><h2 className="mt-2 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">Álbumes que sí muestran lo que contienen.</h2></div><p className="max-w-xl text-sm leading-6 text-white/42">Cada tarjeta usa su portada y miniaturas del mismo álbum. Si un álbum no tiene imágenes publicadas, no lo reemplazamos por una foto genérica.</p></div>

            <div className="sticky top-[64px] z-30 -mx-3 mt-5 border-y border-white/8 bg-[#05090C]/95 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="mx-auto max-w-[1380px]">
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] px-4"><Search className="h-4 w-4 text-[#F6C64A]"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar casa, cocina, quincho, piscina…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/28"/><span className="text-[10px] font-black text-white/35">{filteredAlbums.length}</span></label>
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{categories.map((category)=><button key={category.key} onClick={()=>setActiveCategory(category.key)} className={`shrink-0 rounded-full px-3 py-2 text-[9px] font-black transition ${activeCategory===category.key?'bg-[#F6C64A] text-black':'border border-white/10 bg-white/[.025] text-white/48'}`}>{category.label}</button>)}</div>
              </div>
            </div>

            {notice ? <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-xs text-amber-100/70">{notice}</div> : null}
            {loading ? <div className="grid min-h-[36vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#F6C64A]"/></div> : filteredAlbums.length ? <div className="sf-album-grid mt-7">{filteredAlbums.map((album)=><AlbumCard key={album.key} album={album} assets={albumAssets.get(album.key) || []}/>)}</div> : <EmptyState />}
          </div>
        </section>

        <section className="border-y border-white/8 bg-[#081015] px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-[1380px] gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F6C64A]">De referencia a proyecto</p><h2 className="mt-2 max-w-3xl text-3xl font-black tracking-[-.05em] sm:text-5xl">¿Encontraste una idea que calza contigo?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Ábrela, comenta lo que cambiarías y envíanos la referencia. Podemos conversar sobre medidas, materiales, alcance y presupuesto.</p></div><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-6 text-sm font-black text-black">Quiero cotizar una idea <MessageCircle className="h-4 w-4"/></a></div></section>
      </main>

      <InspirationFooter />
      <StoreBottomNav/>
    </div>
  );
}

function AlbumCard({ album, assets }: { album: InspirationAlbum; assets: InspirationAsset[] }) {
  const thumbs = assets.slice(0, 3);
  const hasImage = Boolean(album.cover && assets.length);
  return <article className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0A0F13] shadow-[0_20px_60px_rgba(0,0,0,.18)] transition hover:-translate-y-1 hover:border-[#F6C64A]/25">
    <Link href={`/inspiraciones/${album.key}`} className="block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#081015]">{hasImage ? <img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"/> : <div className="grid h-full place-items-center text-center"><div><ImageOff className="mx-auto h-7 w-7 text-white/20"/><p className="mt-2 text-[9px] text-white/30">Sin imágenes publicadas</p></div></div>}<span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent"/><span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-white"><Images className="mr-1 inline h-3 w-3 text-[#57D4FF]"/>{album.count}</span><span className="absolute inset-x-3 bottom-3"><InterestStars score={album.interestScore} label={album.interestLabel} compact tone="dark"/></span></div>
    </Link>
    <div className="p-3 sm:p-4"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#57D4FF]">{album.category}</p><Link href={`/inspiraciones/${album.key}`}><h3 className="mt-1 line-clamp-2 min-h-[2.4rem] text-sm font-black leading-[1.05] sm:text-lg">{album.title}</h3></Link><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/38 sm:text-xs sm:leading-5">{album.description}</p>
      {thumbs.length ? <div className="mt-3 grid grid-cols-3 gap-1">{thumbs.map((asset)=><div key={asset.id} className="aspect-square overflow-hidden rounded-md border border-white/8 bg-[#081015]"><img src={asset.thumb || asset.url} alt="" className="h-full w-full object-cover"/></div>)}</div>:<div className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-center text-[8px] text-white/25">Este álbum todavía no tiene referencias visibles.</div>}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3"><Link href={`/inspiraciones/${album.key}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-white/[.055] px-2 text-[9px] font-black text-white">Abrir álbum <ArrowRight className="h-3.5 w-3.5 text-[#F6C64A]"/></Link><a href={quoteUrl(album)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#F6C64A] px-2 text-[9px] font-black text-black">Cotizar idea</a></div>
    </div>
  </article>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div><b className="block text-3xl font-black tracking-[-.05em] text-[#F6C64A]">{value}</b><span className="mt-1 block text-[9px] text-white/36">{label}</span></div>; }
function Journey({ number, title, text }: { number: string; title: string; text: string }) { return <article className="rounded-xl border border-white/8 bg-white/[.025] p-3"><span className="text-[8px] font-black text-[#F6C64A]">{number}</span><h3 className="mt-2 text-xs font-black">{title}</h3><p className="mt-1 text-[9px] leading-4 text-white/34">{text}</p></article>; }
function EmptyState() { return <div className="mt-7 grid min-h-[30vh] place-items-center rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center"><div><ImageOff className="mx-auto h-8 w-8 text-white/18"/><h3 className="mt-3 text-lg font-black">No hay álbumes para este filtro.</h3><p className="mt-2 text-xs text-white/35">Prueba otra categoría o cambia la búsqueda.</p></div></div>; }
function NoImageHero() { return <div className="col-span-2 grid aspect-[2/1] place-items-center rounded-[1.35rem] border border-dashed border-white/10 bg-white/[.025] p-6 text-center"><div><ImageOff className="mx-auto h-7 w-7 text-white/20"/><p className="mt-2 text-xs text-white/35">Las portadas aparecerán cuando existan referencias publicadas.</p></div></div>; }
