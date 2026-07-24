'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Images,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';

export type InspirationAsset = {
  id: string;
  public_id: string;
  title: string;
  description?: string;
  alt?: string;
  category: string;
  album: string;
  album_title: string;
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

function quoteUrl(asset?: InspirationAsset, album?: InspirationAlbum) {
  const reference = asset
    ? `${asset.title} · álbum ${asset.album_title} · ${asset.public_id}`
    : album
      ? `álbum ${album.title}`
      : 'catálogo de Inspiraciones';
  const text = `Hola Soluciones Fabrick, vi ${reference} y quiero conversar sobre una solución parecida para mi espacio. Necesito orientación sobre medidas, materiales y rango de inversión.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function buildAlbums(assets: InspirationAsset[]): InspirationAlbum[] {
  const map = new Map<string, InspirationAlbum>();
  for (const asset of assets) {
    const current = map.get(asset.album);
    if (current) current.count += 1;
    else map.set(asset.album, {
      key: asset.album,
      title: asset.album_title || asset.album.replace(/-/g, ' '),
      category: asset.category,
      description: asset.description || 'Colección visual para comparar distribución, materiales, colores y terminaciones.',
      cover: asset.thumb,
      count: 1,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export default function CloudinaryProjectsGallery() {
  const [assets, setAssets] = useState<InspirationAsset[]>([]);
  const [albums, setAlbums] = useState<InspirationAlbum[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('ideas');
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<InspirationAsset | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
        const json = await response.json() as ApiResponse;
        if (!mounted) return;
        const nextAssets = json.assets || [];
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
      const queryOk = !q || `${album.title} ${album.description} ${album.category}`.toLowerCase().includes(q);
      return categoryOk && queryOk;
    });
  }, [activeCategory, albums, query]);

  const activeAlbumData = albums.find((album) => album.key === activeAlbum) || null;
  const activeAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const albumOk = !activeAlbum || asset.album === activeAlbum;
      const categoryOk = activeCategory === 'ideas' || asset.category === activeCategory;
      const queryOk = !q || `${asset.title} ${asset.description || ''} ${asset.album_title} ${(asset.tags || []).join(' ')}`.toLowerCase().includes(q);
      return albumOk && categoryOk && queryOk;
    });
  }, [activeAlbum, activeCategory, assets, query]);

  function openAlbum(key: string) {
    setActiveAlbum(key);
    window.setTimeout(() => document.getElementById('galeria-inspiraciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8F0E9] text-[#171820]">
      <StorefrontHeader />

      <section className="relative overflow-hidden bg-[#171820] px-4 pb-12 pt-12 text-[#F8F0E9] sm:px-6 lg:px-10 lg:pb-16 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(204,177,150,.23),transparent_30rem),radial-gradient(circle_at_88%_18%,rgba(182,144,108,.16),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.28em] text-[#E5CFBA]"><Sparkles className="h-3.5 w-3.5" /> Biblioteca visual Fabrick</span>
          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.06fr)_minmax(360px,.94fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[.91] tracking-[-.07em] sm:text-7xl lg:text-8xl">Inspiraciones para imaginar antes de construir.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#D5C9C0] sm:text-lg">Explora álbumes de cocinas, casas, planos, baños, muebles, piscinas, terrazas y quinchos. Cada imagen funciona como referencia para adaptar una idea a tus medidas, terreno y presupuesto.</p>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#albumes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820]">Explorar álbumes <ArrowRight className="h-4 w-4" /></a><a href={quoteUrl()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/7 px-6 text-sm font-black text-[#F8F0E9]">Contar mi idea <MessageCircle className="h-4 w-4" /></a></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {albums.slice(0, 3).map((album, index) => <button key={album.key} type="button" onClick={() => openAlbum(album.key)} className={`group relative overflow-hidden rounded-[1.7rem] text-left ${index === 0 ? 'col-span-2 h-56' : 'h-40'}`}><img src={album.cover} alt={album.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-[#171820]/92 via-[#171820]/12 to-transparent" /><span className="absolute inset-x-4 bottom-4"><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#CCB196]">{album.count} imágenes</span><b className="mt-1 block text-lg text-white">{album.title}</b></span></button>)}
            </div>
          </div>
        </div>
      </section>

      <section id="albumes" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#895E3D]">Álbumes de ideas</p><h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">Encuentra una dirección visual para tu proyecto.</h2></div><p className="max-w-2xl text-sm leading-7 text-[#685D55]">No presentamos estas imágenes como obras ejecutadas. Son referencias para conversar sobre estilo, distribución, materiales y viabilidad.</p></div>

          <div className="sticky top-[68px] z-20 -mx-4 mt-7 border-y border-[#171820]/8 bg-[#F8F0E9]/94 px-4 py-3 backdrop-blur-2xl md:mx-0 md:rounded-[1.6rem] md:border">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#171820]/8"><Search className="h-4 w-4 text-[#895E3D]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cocina mediterránea, quincho, piscina…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#9B8E84]" /></label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((category) => <button key={category.key} type="button" onClick={() => { setActiveCategory(category.key); setActiveAlbum(null); }} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${activeCategory === category.key ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-white text-[#685D55] ring-1 ring-[#171820]/7'}`}>{category.label}</button>)}</div>
          </div>

          {notice ? <div className="mt-5 rounded-2xl bg-[#E6D4C3] p-4 text-sm text-[#5E5148]">{notice}</div> : null}
          {loading ? <div className="mt-6 grid min-h-[42vh] place-items-center rounded-[2rem] bg-white"><div className="flex items-center gap-3 text-[#685D55]"><Loader2 className="h-5 w-5 animate-spin text-[#895E3D]" /> Preparando álbumes desde Cloudinary…</div></div> : null}

          {!loading && !activeAlbum ? (
            filteredAlbums.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredAlbums.map((album, index) => <AlbumCard key={album.key} album={album} index={index} onOpen={() => openAlbum(album.key)} />)}</div> : <EmptyState title="No encontramos álbumes" text="Prueba otra categoría o cambia la búsqueda." />
          ) : null}

          {!loading && activeAlbumData ? (
            <section id="galeria-inspiraciones" className="scroll-mt-36 pt-10">
              <button type="button" onClick={() => setActiveAlbum(null)} className="inline-flex items-center gap-2 text-xs font-black text-[#895E3D]"><ArrowLeft className="h-4 w-4" /> Volver a los álbumes</button>
              <div className="mt-5 grid gap-5 rounded-[2.2rem] bg-[#171820] p-6 text-[#F8F0E9] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#CCB196]">{activeAlbumData.category}</p><h2 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">{activeAlbumData.title}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-[#D1C5BC]">{activeAlbumData.description}</p></div><a href={quoteUrl(undefined, activeAlbumData)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820]">Cotizar desde este álbum <MessageCircle className="h-4 w-4" /></a></div>
              {activeAssets.length ? <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">{activeAssets.map((asset, index) => <InspirationCard key={asset.id} asset={asset} index={index} onOpen={() => setSelected(asset)} />)}</div> : <EmptyState title="Este álbum todavía no tiene imágenes visibles" text="Puedes regresar a los álbumes y explorar otra colección." />}
            </section>
          ) : null}
        </div>
      </section>

      <section className="bg-[#E6D4C3] px-4 py-14 sm:px-6 lg:px-10"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.78fr_1.22fr] lg:items-center"><div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><FolderOpen className="h-6 w-6" /></span><h2 className="mt-5 text-4xl font-black leading-[.96] tracking-[-.05em]">Guarda la idea. Nosotros aterrizamos la solución.</h2></div><div><p className="text-sm leading-7 text-[#5E5148]">Una referencia visual no define por sí sola el costo ni la factibilidad. Para convertirla en propuesta revisamos medidas, estructura existente, instalaciones, materiales, permisos y nivel de terminación.</p><a href="/presupuesto" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#171820] px-6 text-sm font-black text-[#F8F0E9]">Abrir calculadoras de servicios <ArrowRight className="h-4 w-4" /></a></div></div></section>

      <Lightbox asset={selected} assets={activeAssets} onSelect={setSelected} onClose={() => setSelected(null)} />
      <StoreBottomNav />
    </div>
  );
}

function AlbumCard({ album, index, onOpen }: { album: InspirationAlbum; index: number; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className={`group relative overflow-hidden rounded-[2rem] bg-[#171820] text-left shadow-[0_20px_70px_rgba(23,24,32,.12)] ${index % 5 === 0 ? 'sm:row-span-2' : ''}`}><div className={index % 5 === 0 ? 'h-[520px]' : 'h-[360px]'}><img src={album.cover} alt={album.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" /></div><span className="absolute inset-0 bg-gradient-to-t from-[#171820]/96 via-[#171820]/12 to-transparent" /><span className="absolute inset-x-5 bottom-5"><span className="inline-flex items-center gap-2 rounded-full bg-[#F8F0E9]/92 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#171820]"><Images className="h-3 w-3" /> {album.count} referencias</span><h3 className="mt-3 text-2xl font-black text-white">{album.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#D2C6BD]">{album.description}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#E5CFBA]">Abrir álbum <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></span></button>;
}

function InspirationCard({ asset, index, onOpen }: { asset: InspirationAsset; index: number; onOpen: () => void }) {
  const ratio = asset.width && asset.height ? asset.height / asset.width : 1;
  const height = ratio > 1.2 ? 'h-[430px]' : ratio < .75 ? 'h-[250px]' : 'h-[340px]';
  return <article className="group mb-4 break-inside-avoid overflow-hidden rounded-[1.7rem] bg-white shadow-[0_18px_55px_rgba(23,24,32,.08)]"><button type="button" onClick={onOpen} className="relative block w-full overflow-hidden text-left"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${height}`} /><span className="absolute inset-0 bg-gradient-to-t from-[#171820]/70 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 right-4"><span className="text-[9px] font-black uppercase tracking-[.18em] text-[#E5CFBA]">{asset.category}</span><h3 className="mt-1 text-xl font-black leading-tight text-white">{asset.title}</h3></span></button><div className="p-4"><p className="line-clamp-3 text-xs leading-5 text-[#685D55]">{asset.description || 'Referencia visual para adaptar a tus medidas, materialidad y nivel de terminación.'}</p><a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-[#B6906C] px-4 text-xs font-black text-[#171820]">Usar como referencia <MessageCircle className="h-4 w-4" /></a></div></article>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="mt-7 grid min-h-[32vh] place-items-center rounded-[2rem] bg-white p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-[#B6906C]" /><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-[#756B63]">{text}</p></div></div>;
}

function Lightbox({ asset, assets, onSelect, onClose }: { asset: InspirationAsset | null; assets: InspirationAsset[]; onSelect: (asset: InspirationAsset) => void; onClose: () => void }) {
  if (!asset) return null;
  const index = assets.findIndex((item) => item.id === asset.id);
  const prev = index > 0 ? assets[index - 1] : null;
  const next = index >= 0 && index < assets.length - 1 ? assets[index + 1] : null;
  return <div className="fixed inset-0 z-[500] grid place-items-center bg-[#171820]/92 p-3 backdrop-blur-xl" role="dialog" aria-modal="true"><button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-[#F8F0E9] text-[#171820]" aria-label="Cerrar"><X className="h-5 w-5" /></button><button type="button" disabled={!prev} onClick={() => prev && onSelect(prev)} className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#F8F0E9]/92 text-[#171820] disabled:hidden"><ChevronLeft className="h-5 w-5" /></button><button type="button" disabled={!next} onClick={() => next && onSelect(next)} className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#F8F0E9]/92 text-[#171820] disabled:hidden"><ChevronRight className="h-5 w-5" /></button><div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#F8F0E9] shadow-2xl lg:grid-cols-[minmax(0,1fr)_360px]"><div className="min-h-0 bg-[#101117]"><img src={asset.url} alt={asset.alt || asset.title} className="h-full max-h-[94vh] w-full object-contain" /></div><aside className="grid content-between gap-6 overflow-y-auto p-6 text-[#171820]"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#895E3D]">{asset.album_title}</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em]">{asset.title}</h2><p className="mt-4 text-sm leading-7 text-[#685D55]">{asset.description || 'Referencia visual para analizar estilo, distribución, materiales y terminaciones.'}</p><div className="mt-5 flex flex-wrap gap-2">{asset.tags?.slice(0, 8).map((tag) => <span key={tag} className="rounded-full bg-[#E6D4C3] px-3 py-1.5 text-[10px] font-black text-[#5E5148]">#{tag}</span>)}</div></div><a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#171820] px-5 text-sm font-black text-[#F8F0E9]">Cotizar una idea parecida <MessageCircle className="h-4 w-4" /></a></aside></div></div>;
}
