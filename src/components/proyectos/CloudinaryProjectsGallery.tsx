'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ExternalLink,
  Heart,
  Images,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

type ProjectAsset = {
  id: string;
  public_id: string;
  title: string;
  category: string;
  url: string;
  thumb: string;
  width: number;
  height: number;
  tags?: string[];
  story?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  social?: Record<string, string>;
  is_favorite?: boolean;
  sort_order?: number;
  created_at?: string;
  fallback?: boolean;
};

type ApiResponse = {
  assets: ProjectAsset[];
  categories: Array<{ key: string; label: string }>;
  source?: string;
  warning?: string;
  error?: string;
};

type SortOption = 'recent' | 'title' | 'category';

const WHATSAPP_PHONE = '56930121625';
const DEFAULT_CATEGORIES = [
  { key: 'ideas', label: 'Ideas' },
  { key: 'remodelacion', label: 'Remodelación' },
  { key: 'materiales', label: 'Materiales' },
  { key: 'puertas', label: 'Puertas' },
  { key: 'cocinas', label: 'Cocinas' },
  { key: 'banos', label: 'Baños' },
  { key: 'muebles', label: 'Muebles' },
  { key: 'terrazas', label: 'Terrazas' },
  { key: 'aire', label: 'Aire' },
];

function quoteUrl(asset?: ProjectAsset) {
  const text = asset
    ? `Hola, vi esta idea en el catálogo de proyectos y quiero cotizar algo parecido: ${asset.title} (${asset.public_id})`
    : 'Hola, vi el catálogo de proyectos y quiero cotizar una remodelación o instalación.';
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { rootMargin: '90px 0px', threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function GalleryCard({ asset, index, onOpen }: { asset: ProjectAsset; index: number; onOpen: (asset: ProjectAsset) => void }) {
  const { ref, visible } = useReveal<HTMLElement>();
  const tag = asset.tags?.find(Boolean);

  return (
    <article
      ref={ref}
      className={`group overflow-hidden rounded-[1.55rem] bg-[#17120b]/88 shadow-[0_18px_46px_rgba(0,0,0,.28)] transition duration-700 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
      style={{ transitionDelay: `${Math.min(index % 8, 5) * 55}ms` }}
    >
      <button type="button" onClick={() => onOpen(asset)} className="relative block aspect-[4/5] w-full overflow-hidden text-left">
        <img
          src={asset.thumb || asset.url}
          alt={asset.title}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.055]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,4,.06),rgba(5,5,4,.08)_34%,rgba(5,5,4,.90))]" />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2">
          <span className="truncate rounded-full bg-[#090806]/70 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-yellow-100 backdrop-blur-xl">{asset.category}</span>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-yellow-300 text-black">{asset.is_favorite ? <Heart className="h-3.5 w-3.5 fill-current" /> : <ArrowUpRight className="h-3.5 w-3.5" />}</span>
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <p className="line-clamp-2 text-sm font-black leading-4 tracking-[-.025em] text-white sm:text-base">{asset.title}</p>
          {tag ? <p className="mt-1 truncate text-[10px] font-semibold text-yellow-100/72">{tag}</p> : null}
        </div>
      </button>
      <div className="grid grid-cols-[1fr_auto] gap-2 p-2.5">
        <button type="button" onClick={() => onOpen(asset)} className="min-w-0 rounded-xl bg-white/[.06] px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.11em] text-[#fff7e8] transition hover:bg-white hover:text-black">Ver idea</button>
        <a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-300 text-black transition hover:bg-white" aria-label={`Cotizar un proyecto inspirado en ${asset.title}`}><ExternalLink className="h-4 w-4" /></a>
      </div>
    </article>
  );
}

function Lightbox({ asset, onClose }: { asset: ProjectAsset | null; onClose: () => void }) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-[350] grid place-items-center bg-black/88 p-3 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Detalle de inspiración">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white hover:text-black" aria-label="Cerrar"><X className="h-5 w-5" /></button>
      <div className="grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#15110b] shadow-[0_34px_100px_rgba(0,0,0,.7)] lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-h-0 bg-black"><img src={asset.url} alt={asset.title} className="h-full max-h-[92vh] w-full object-contain" /></div>
        <aside className="grid content-between gap-6 p-5 sm:p-7">
          <div>
            <p className="inline-flex rounded-full bg-yellow-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-yellow-200">Referencia de inspiración</p>
            <h2 className="mt-4 text-3xl font-black leading-[.95] tracking-[-.055em] text-white">{asset.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#f6ecd9]/68">{asset.description || asset.story || 'Usa esta imagen como punto de partida. El equipo confirma medidas, materiales, acceso y alcance antes de cotizar.'}</p>
            {asset.story ? <div className="mt-5 bg-white/[.055] p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-yellow-200">La historia detrás</p><p className="mt-2 text-xs leading-5 text-[#fff7e8]/65">{asset.story}</p></div> : null}
            <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/[.08] px-3 py-1.5 text-xs font-bold text-white">{asset.category}</span>{asset.tags?.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white/[.045] px-3 py-1.5 text-xs text-[#f5ead5]/72">{tag}</span>)}</div>
          </div>
          <div className="grid gap-2"><a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="rounded-2xl bg-[linear-gradient(90deg,#fde047,#fb923c)] px-5 py-4 text-center text-sm font-black text-black transition hover:brightness-110">Quiero cotizar algo parecido</a>{asset.social?.instagram || asset.social?.facebook ? <div className="grid grid-cols-2 gap-2">{asset.social.instagram ? <a href={asset.social.instagram} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/[.07] px-3 py-3 text-center text-xs font-black text-white/75 transition hover:bg-white hover:text-black">Ver Instagram</a> : null}{asset.social.facebook ? <a href={asset.social.facebook} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/[.07] px-3 py-3 text-center text-xs font-black text-white/75 transition hover:bg-white hover:text-black">Ver Facebook</a> : null}</div> : null}<button type="button" onClick={onClose} className="rounded-2xl bg-white/[.07] px-5 py-3 text-xs font-black text-white/75 transition hover:bg-white hover:text-black">Seguir explorando</button></div>
        </aside>
      </div>
    </div>
  );
}

export default function CloudinaryProjectsGallery() {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [active, setActive] = useState('todo');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<ProjectAsset | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/proyectos/cloudinary?folder=fabrick&max=90', { cache: 'no-store' });
        const json = await res.json() as ApiResponse;
        if (!mounted) return;
        setAssets(json.assets || []);
        setCategories(json.categories?.length ? json.categories : DEFAULT_CATEGORIES);
        setNotice(json.warning || json.error || '');
      } catch (err) {
        if (mounted) setNotice((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const visibleCategories = useMemo(() => [{ key: 'todo', label: 'Todo' }, ...categories].filter((cat, index, arr) => arr.findIndex((item) => item.key === cat.key) === index), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return assets
      .filter((asset) => {
        const byCategory = active === 'todo' || active === asset.category;
        const searchable = `${asset.title} ${asset.category} ${asset.public_id} ${asset.description || ''} ${asset.story || ''} ${asset.seo_title || ''} ${(asset.tags || []).join(' ')}`.toLocaleLowerCase('es');
        return byCategory && (!q || searchable.includes(q));
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title, 'es');
        if (sortBy === 'category') return a.category.localeCompare(b.category, 'es') || a.title.localeCompare(b.title, 'es');
        const aDate = Date.parse(a.created_at || '') || 0;
        const bDate = Date.parse(b.created_at || '') || 0;
        return bDate - aDate || a.title.localeCompare(b.title, 'es');
      });
  }, [active, assets, query, sortBy]);

  const hasFilters = active !== 'todo' || Boolean(query) || sortBy !== 'recent';
  const resetFilters = () => { setActive('todo'); setQuery(''); setSortBy('recent'); };

  return (
    <div className="min-h-screen overflow-hidden bg-[#070604] pb-[calc(7rem+env(safe-area-inset-bottom))] text-white md:pb-12">
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pb-14">
        <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_13%_13%,rgba(253,224,71,.22),transparent_25rem),radial-gradient(circle_at_85%_2%,rgba(251,146,60,.16),transparent_30rem),linear-gradient(180deg,#1a140a_0%,#070604_88%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[.18] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(180deg,black,transparent)]" />
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-yellow-300/[.11] px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-yellow-100 ring-1 ring-yellow-200/25"><Sparkles className="h-3.5 w-3.5" /> Biblioteca de inspiración</p>
          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black leading-[.92] tracking-[-.07em] sm:text-6xl lg:text-7xl">Encuentra una idea. Hazla posible en tu espacio.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#f7efdf]/70 sm:text-base">Explora terminaciones, cocinas, baños, puertas, muebles y remodelaciones. Abre una referencia para verla con calma y pedir un proyecto parecido.</p>
            </div>
            <div className="rounded-[1.7rem] bg-[#fff4dc]/[.09] p-4 shadow-[0_22px_65px_rgba(0,0,0,.24)] backdrop-blur-xl sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-100">Comienza por una idea</p>
              <label className="mt-3 flex items-center gap-3 rounded-2xl bg-black/35 px-4 py-3 text-[#fff7e8] ring-1 ring-white/10 focus-within:ring-yellow-300/70"><Search className="h-4 w-4 shrink-0 text-yellow-200" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. cocina, puerta, baño, terraza…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40" /></label>
              <a href={quoteUrl()} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black transition hover:bg-white">Tengo una idea para cotizar <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="mt-7 flex items-center gap-2 text-xs font-bold text-[#f7ead4]/58"><ArrowDown className="h-4 w-4 animate-bounce text-yellow-200" /> Desliza, filtra y abre las imágenes que te inspiren.</div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-y border-white/[.07] bg-[#0d0a06]/90 px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,.22)] backdrop-blur-2xl sm:px-6 lg:top-[76px] lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="fabrick-project-scroll flex gap-2 overflow-x-auto pb-1">
            <span className="inline-flex shrink-0 items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[.18em] text-white/44"><SlidersHorizontal className="h-3.5 w-3.5 text-yellow-200" /> Filtros</span>
            {visibleCategories.map((cat) => <button key={cat.key} type="button" onClick={() => setActive(cat.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${active === cat.key ? 'bg-yellow-300 text-black shadow-[0_8px_22px_rgba(250,204,21,.22)]' : 'bg-white/[.06] text-[#fff7e8]/72 hover:bg-white/[.12] hover:text-white'}`}>{cat.label}</button>)}
          </div>
          <label className="relative flex items-center gap-2 rounded-xl bg-white/[.06] px-3 text-sm text-[#fff7e8]/78 ring-1 ring-white/[.08] focus-within:ring-yellow-300/55"><span className="shrink-0 text-[10px] font-black uppercase tracking-[.13em] text-yellow-100">Orden</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="h-10 min-w-0 flex-1 appearance-none bg-transparent pr-6 text-right text-xs font-black text-white outline-none"><option value="recent" className="bg-[#17120b]">Más recientes</option><option value="title" className="bg-[#17120b]">Nombre A–Z</option><option value="category" className="bg-[#17120b]">Por categoría</option></select><ArrowDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-yellow-200" /></label>
        </div>
      </section>

      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <div className="mb-5 flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#f7ead4]/62"><b className="text-yellow-200">{filtered.length}</b> {filtered.length === 1 ? 'referencia encontrada' : 'referencias para explorar'}</p>{hasFilters ? <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-200 transition hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Limpiar filtros</button> : null}</div>
        {notice ? <div className="mb-5 rounded-2xl bg-yellow-300/10 p-4 text-sm text-yellow-50 ring-1 ring-yellow-300/20">{notice}</div> : null}
        {loading ? (
          <div className="grid min-h-[42vh] place-items-center rounded-[2rem] bg-white/[.035] text-[#fff7e8]/72 ring-1 ring-white/[.08]"><div className="flex items-center gap-3 text-sm font-bold"><Loader2 className="h-5 w-5 animate-spin text-yellow-300" /> Cargando referencias de inspiración…</div></div>
        ) : filtered.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((asset, index) => <GalleryCard key={asset.id} asset={asset} index={index} onOpen={setSelected} />)}
          </div>
        ) : (
          <div className="grid min-h-[40vh] place-items-center rounded-[2rem] bg-white/[.035] p-8 text-center ring-1 ring-white/[.08]"><div><Images className="mx-auto h-8 w-8 text-yellow-200" /><h2 className="mt-4 text-2xl font-black">No encontramos esa inspiración</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#f7ead4]/60">Prueba con otra palabra, cambia de categoría o vuelve a ver todas las referencias.</p><button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-yellow-300 px-4 py-3 text-xs font-black text-black">Ver todas las imágenes</button></div></div>
        )}
      </main>

      <Lightbox asset={selected} onClose={() => setSelected(null)} />
      <style jsx>{'.fabrick-project-scroll::-webkit-scrollbar{display:none}.fabrick-project-scroll{scrollbar-width:none}'}</style>
    </div>
  );
}
