'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, MessageCircle } from 'lucide-react';

export type SpinAlbumAsset = {
  id: string;
  title: string;
  description?: string;
  alt?: string;
  category: string;
  album_title: string;
  url: string;
  thumb: string;
  tags?: string[];
};

type Props = {
  assets: SpinAlbumAsset[];
  onOpen: (asset: SpinAlbumAsset) => void;
  quoteHref: (asset: SpinAlbumAsset) => string;
};

function clampIndex(index: number, count: number) {
  if (!count) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

export default function AlbumSpinViewer({ assets, onOpen, quoteHref }: Props) {
  const featured = useMemo(() => assets.slice(0, 14), [assets]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(390);
  const count = featured.length;
  const step = count > 0 ? 360 / count : 0;
  const active = featured[clampIndex(activeIndex, count)] || featured[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [assets]);

  useEffect(() => {
    function updateRadius() {
      const width = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const next = Math.min(500, Math.max(300, Math.min(width * 0.27, viewportHeight * 0.48)));
      setRadius(Math.round(next));
    }
    updateRadius();
    window.addEventListener('resize', updateRadius, { passive: true });
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') setActiveIndex((current) => clampIndex(current - 1, count));
      if (event.key === 'ArrowRight') setActiveIndex((current) => clampIndex(current + 1, count));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count]);

  function goTo(index: number) {
    setActiveIndex(clampIndex(index, count));
  }

  if (!active || count === 0) return null;

  const stageRotation = -activeIndex * step;

  return (
    <>
      <section className="relative mt-7 hidden lg:block" aria-label={`Carrusel 3D del álbum ${active.album_title}`}>
        <div className="h-[clamp(640px,calc(100vh-112px),820px)] overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_38%_42%,rgba(246,198,74,.10),transparent_28rem),linear-gradient(145deg,#0B1014,#11161A)] text-white shadow-[0_32px_100px_rgba(0,0,0,.34)]">
          <div className="grid h-full grid-cols-[minmax(0,1fr)_350px] gap-0 xl:grid-cols-[minmax(0,1fr)_410px]">
            <div className="relative min-w-0 overflow-hidden border-r border-white/8">
              <div className="absolute left-5 top-5 z-30 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[9px] font-black uppercase tracking-[.16em] text-white/62 backdrop-blur-xl">
                Vista 3D · botones y miniaturas
              </div>
              <div className="absolute right-5 top-5 z-30 rounded-full bg-[#F6C64A] px-4 py-2 text-[10px] font-black text-black">
                {activeIndex + 1} / {count}
              </div>

              <div className="absolute inset-x-0 bottom-20 top-14 grid place-items-center" style={{ perspective: '1500px' }}>
                <div
                  className="relative h-[clamp(360px,52vh,520px)] w-[clamp(260px,28vw,360px)] transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: `rotateX(-3deg) rotateY(${stageRotation}deg)` }}
                >
                  {featured.map((asset, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={asset.id}
                        className="absolute inset-0 [transform-style:preserve-3d] [backface-visibility:hidden]"
                        style={{ transform: `rotateY(${index * step}deg) translateZ(${radius}px)` }}
                      >
                        <button
                          type="button"
                          onClick={() => onOpen(asset)}
                          className={`group relative h-full w-full overflow-hidden rounded-[1.65rem] text-left shadow-[0_28px_80px_rgba(0,0,0,.50)] ring-1 transition duration-300 ${isActive ? 'scale-100 ring-[#F6C64A]/75' : 'scale-[.87] ring-white/10 opacity-42 hover:opacity-85'}`}
                          aria-label={`Abrir ${asset.title}`}
                        >
                          <img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/6 to-transparent" />
                          <span className="absolute inset-x-5 bottom-5">
                            <span className="text-[8px] font-black uppercase tracking-[.17em] text-[#57D4FF]">{asset.category}</span>
                            <strong className="mt-2 block text-xl font-black leading-[1.02] text-white xl:text-2xl">{asset.title}</strong>
                            <span className="mt-3 inline-flex items-center gap-2 text-[9px] font-black text-white/60"><Maximize2 className="h-3.5 w-3.5" /> Ver detalle</span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute inset-x-5 bottom-5 z-30 flex items-center justify-between gap-4">
                <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.055] text-white transition hover:border-[#F6C64A]/45 hover:bg-[#F6C64A] hover:text-black disabled:opacity-20" aria-label="Imagen anterior"><ChevronLeft className="h-5 w-5" /></button>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full origin-left rounded-full bg-[#F6C64A] transition-transform duration-300" style={{ transform: `scaleX(${count > 1 ? activeIndex / (count - 1) : 1})` }} /></div>
                <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === count - 1} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.055] text-white transition hover:border-[#F6C64A]/45 hover:bg-[#F6C64A] hover:text-black disabled:opacity-20" aria-label="Imagen siguiente"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col bg-[#F4F0E8] p-6 text-[#111416] xl:p-7">
              <div className="flex items-center justify-between gap-3 border-b border-black/8 pb-4">
                <span className="text-[9px] font-black uppercase tracking-[.16em] text-black/38">Referencia activa</span>
                <span className="text-[10px] font-black text-[#B97800]">{activeIndex + 1} de {count}</span>
              </div>
              <div className="min-h-0 overflow-y-auto pr-1 [scrollbar-width:thin]">
                <p className="mt-5 text-[9px] font-black uppercase tracking-[.18em] text-[#B97800]">{active.album_title}</p>
                <h3 className="mt-3 text-3xl font-black leading-[.96] tracking-[-.045em] xl:text-4xl">{active.title}</h3>
                <p className="mt-4 text-sm leading-7 text-black/50">{active.description || 'Referencia visual para comparar estilo, distribución, materialidad y nivel de terminación.'}</p>
                {active.tags?.length ? <div className="mt-5 flex flex-wrap gap-1.5">{active.tags.slice(0, 7).map((tag) => <span key={tag} className="rounded-full border border-black/7 bg-white/60 px-2.5 py-1.5 text-[9px] font-black text-black/44">#{tag}</span>)}</div> : null}
              </div>

              <div className="mt-auto border-t border-black/8 pt-5">
                <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featured.map((asset, index) => <button key={asset.id} type="button" onClick={() => goTo(index)} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 transition ${index === activeIndex ? 'ring-[#F6C64A] opacity-100' : 'ring-transparent opacity-45 hover:opacity-100'}`} aria-label={`Ir a imagen ${index + 1}`}><img src={asset.thumb || asset.url} alt="" className="h-full w-full object-cover" /></button>)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onOpen(active)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-4 text-[10px] font-black text-black"><Maximize2 className="h-4 w-4" /> Ver grande</button>
                  <a href={quoteHref(active)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111416] px-4 text-[10px] font-black text-white"><MessageCircle className="h-4 w-4" /> Cotizar</a>
                </div>
                <p className="mt-3 text-[9px] leading-4 text-black/35">No necesitas desplazarte varios largos de pantalla: cambia de referencia con flechas, teclado o miniaturas.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mt-6 lg:hidden" aria-label={`Carrusel móvil del álbum ${active.album_title}`}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {assets.map((asset, index) => (
            <article key={asset.id} className="w-[84vw] max-w-[390px] shrink-0 snap-center overflow-hidden rounded-[1.55rem] border border-white/8 bg-[#0A0F13] text-white shadow-[0_20px_60px_rgba(0,0,0,.22)]">
              <button type="button" onClick={() => onOpen(asset)} className="relative block h-[min(58vh,470px)] min-h-[360px] w-full overflow-hidden text-left">
                <img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/94 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[9px] font-black text-black">{index + 1} / {assets.length}</span>
                <span className="absolute inset-x-4 bottom-4"><span className="text-[8px] font-black uppercase tracking-[.17em] text-[#57D4FF]">{asset.category}</span><strong className="mt-2 block text-xl font-black leading-tight">{asset.title}</strong></span>
              </button>
              <div className="p-4">
                <p className="line-clamp-3 text-[11px] leading-5 text-white/45">{asset.description || 'Referencia visual para adaptar al espacio, materiales y nivel de terminación.'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => onOpen(asset)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[.04] text-[10px] font-black"><Maximize2 className="h-3.5 w-3.5" /> Ampliar</button><a href={quoteHref(asset)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-3 text-[10px] font-black text-black"><MessageCircle className="h-3.5 w-3.5" /> Cotizar</a></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
