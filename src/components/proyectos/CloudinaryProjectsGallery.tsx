'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ExternalLink, Loader2, Search, Sparkles, X } from 'lucide-react';

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
  const { ref, visible } = useReveal<HTMLDivElement>();
  const ratio = asset.width && asset.height ? asset.height / asset.width : index % 3 === 0 ? 1.25 : .85;
  const tall = ratio > 1.15;
  const wide = ratio < .75;

  return <article ref={ref} className={`group mb-4 break-inside-avoid overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#111] shadow-2xl shadow-black/30 transition-all duration-700 ${visible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-sm'}`} style={{ transitionDelay: `${Math.min(index % 8, 5) * 55}ms` }}>
    <button type="button" onClick={() => onOpen(asset)} className="block w-full text-left">
      <div className="relative overflow-hidden bg-black">
        <img src={asset.thumb || asset.url} alt={asset.title} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${tall ? 'h-[420px]' : wide ? 'h-[230px]' : 'h-[320px]'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-85" />
        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[.22em] text-amber-200 backdrop-blur-xl">{asset.category}</div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-black leading-tight text-white drop-shadow-lg">{asset.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-300">{asset.public_id}</p>
        </div>
      </div>
    </button>
    <div className="grid grid-cols-[1fr_auto] gap-2 p-3">
      <a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="rounded-2xl bg-amber-400 px-4 py-3 text-center text-sm font-black text-black">Cotizar algo parecido</a>
      <button type="button" onClick={() => onOpen(asset)} className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white"><ExternalLink className="h-4 w-4" /></button>
    </div>
  </article>;
}

function Lightbox({ asset, onClose }: { asset: ProjectAsset | null; onClose: () => void }) {
  if (!asset) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-3 backdrop-blur-xl" role="dialog" aria-modal="true">
    <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-white"><X className="h-5 w-5" /></button>
    <div className="grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] shadow-2xl lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-h-0 bg-black"><img src={asset.url} alt={asset.title} className="h-full max-h-[92vh] w-full object-contain" /></div>
      <aside className="grid content-between gap-5 p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Inspiración</p>
          <h2 className="mt-2 text-3xl font-black text-white">{asset.title}</h2>
          <p className="mt-3 break-all text-sm leading-6 text-zinc-400">{asset.public_id}</p>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">{asset.category}</span>{asset.tags?.slice(0, 5).map((tag) => <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">{tag}</span>)}</div>
        </div>
        <a href={quoteUrl(asset)} target="_blank" rel="noreferrer" className="rounded-2xl bg-amber-400 px-5 py-4 text-center text-sm font-black text-black">Quiero cotizar algo parecido</a>
      </aside>
    </div>
  </div>;
}

export default function CloudinaryProjectsGallery() {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [active, setActive] = useState('todo');
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const byCategory = active === 'todo' || active === asset.category;
      const byQuery = !q || `${asset.title} ${asset.public_id} ${(asset.tags || []).join(' ')}`.toLowerCase().includes(q);
      return byCategory && byQuery;
    });
  }, [active, assets, query]);

  const visibleCategories = useMemo(() => [{ key: 'todo', label: 'Todo' }, ...categories].filter((cat, index, arr) => arr.findIndex((item) => item.key === cat.key) === index), [categories]);

  return <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
    <section className="relative overflow-hidden border-b border-white/10 px-4 pb-10 pt-16 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,.22),transparent_28rem),radial-gradient(circle_at_90%_20%,rgba(255,255,255,.08),transparent_24rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.32em] text-amber-200"><Sparkles className="mr-2 h-3.5 w-3.5" /> Catálogo visual</p>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-5xl font-black leading-[.92] tracking-[-.07em] sm:text-7xl lg:text-8xl">Ideas para remodelar, construir y mejorar tu espacio.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">Explora materiales, puertas, terminaciones, muebles, cocinas, baños y referencias. Toca una imagen y pide una cotización parecida.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[.055] p-4 backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-zinc-500">Cómo usarlo</p>
            <p className="mt-2 text-sm leading-7 text-zinc-300">El cliente baja, mira ideas, guarda una referencia visual y cotiza. Menos texto, más impacto visual.</p>
            <a href={quoteUrl()} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-black">Cotizar proyecto</a>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-2 text-sm text-zinc-400"><ArrowDown className="h-4 w-4 animate-bounce text-amber-300" /> Desliza para ver referencias</div>
      </div>
    </section>

    <section className="sticky top-0 z-20 border-b border-white/10 bg-[#050505]/86 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleCategories.map((cat) => <button key={cat.key} type="button" onClick={() => setActive(cat.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${active === cat.key ? 'bg-amber-400 text-black' : 'border border-white/10 bg-white/[.055] text-zinc-300'}`}>{cat.label}</button>)}
        </div>
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-4 py-2 text-sm text-zinc-300"><Search className="h-4 w-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar puerta, madera, baño..." className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-600" /></label>
      </div>
    </section>

    <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
      {notice && <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{notice}</div>}
      {loading ? <div className="grid min-h-[45vh] place-items-center rounded-[2rem] border border-white/10 bg-white/[.035]"><div className="flex items-center gap-3 text-zinc-300"><Loader2 className="h-5 w-5 animate-spin text-amber-300" /> Cargando catálogo desde Cloudinary…</div></div> : filtered.length ? <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">{filtered.map((asset, index) => <GalleryCard key={asset.id} asset={asset} index={index} onOpen={setSelected} />)}</div> : <div className="grid min-h-[40vh] place-items-center rounded-[2rem] border border-white/10 bg-white/[.035] p-8 text-center"><div><h2 className="text-2xl font-black">No encontré imágenes en esta categoría</h2><p className="mt-2 text-zinc-400">Prueba con “Todo” o sube imágenes a la carpeta Cloudinary configurada.</p></div></div>}
    </main>

    <Lightbox asset={selected} onClose={() => setSelected(null)} />
  </div>;
}
