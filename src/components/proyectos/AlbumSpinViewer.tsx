'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, Maximize2, MessageCircle, MousePointer2 } from 'lucide-react';

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

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export default function AlbumSpinViewer({ assets, onOpen, quoteHref }: Props) {
  const featured = useMemo(() => assets.slice(0, 14), [assets]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(430);
  const count = featured.length;
  const step = count > 0 ? 360 / count : 0;
  const trackHeight = Math.max(185, 128 + Math.max(0, count - 1) * 25);
  const active = featured[Math.min(activeIndex, Math.max(0, count - 1))] || featured[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [assets]);

  useEffect(() => {
    function updateRadius() {
      setRadius(Math.round(clamp(window.innerWidth * 0.31, 330, 530)));
    }
    updateRadius();
    window.addEventListener('resize', updateRadius, { passive: true });
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !stageRef.current || count < 2) return;
    const sectionElement = sectionRef.current;
    const stageElement = stageRef.current;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function render() {
      frameRef.current = null;
      if (!desktop.matches || reducedMotion.matches) {
        stageElement.style.transform = 'rotateX(-4deg) rotateY(0deg)';
        return;
      }
      const rect = sectionElement.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const start = absoluteTop - 72;
      const end = Math.max(start + 1, absoluteTop + sectionElement.offsetHeight - window.innerHeight);
      const progress = clamp((window.scrollY - start) / (end - start));
      const exactIndex = progress * (count - 1);
      const nextIndex = Math.round(exactIndex);
      const rotation = exactIndex * step;
      stageElement.style.transform = `rotateX(-4deg) rotateY(${-rotation}deg)`;
      setActiveIndex((current) => current === nextIndex ? current : nextIndex);
    }

    function requestRender() {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(render);
    }

    render();
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender, { passive: true });
    return () => {
      window.removeEventListener('scroll', requestRender);
      window.removeEventListener('resize', requestRender);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [count, step]);

  function scrollToIndex(index: number) {
    const nextIndex = Math.max(0, Math.min(count - 1, index));
    setActiveIndex(nextIndex);
    const section = sectionRef.current;
    if (!section || count < 2 || !window.matchMedia('(min-width: 1024px)').matches) return;
    const rect = section.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const start = absoluteTop - 72;
    const end = Math.max(start + 1, absoluteTop + section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: start + (nextIndex / (count - 1)) * (end - start), behavior: 'smooth' });
  }

  if (!active || count === 0) return null;

  return (
    <>
      <section
        ref={sectionRef}
        className="relative mt-7 hidden lg:block"
        style={{ height: `${trackHeight}vh` }}
        aria-label={`Carrusel 3D del álbum ${active.album_title}`}
      >
        <div className="sticky top-[88px] h-[calc(100vh-104px)] min-h-[620px] overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_45%,rgba(204,177,150,.18),transparent_23rem),linear-gradient(145deg,#1A1B1F,#111218)] text-[#FFF9EE] shadow-[0_34px_110px_rgba(23,24,32,.24)] ring-1 ring-white/8">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative grid h-full grid-cols-[minmax(0,1fr)_360px] gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_410px] xl:p-8">
            <div className="relative min-w-0 overflow-hidden rounded-[2rem] bg-black/15">
              <div className="absolute left-5 top-5 z-30 inline-flex items-center gap-2 rounded-full bg-[#08090A]/82 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#F2DFBB] backdrop-blur-xl">
                <MousePointer2 className="h-3.5 w-3.5" /> Desplázate para girar
              </div>
              <div className="absolute right-5 top-5 z-30 rounded-full bg-[#FFF9EE]/92 px-4 py-2 text-[10px] font-black text-[#08090A] backdrop-blur-xl">
                {activeIndex + 1} / {count}
              </div>

              <div className="absolute inset-0 grid place-items-center" style={{ perspective: '1500px' }}>
                <div
                  ref={stageRef}
                  className="relative h-[420px] w-[300px] transition-[transform] duration-100 ease-out xl:h-[480px] xl:w-[340px]"
                  style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-4deg) rotateY(0deg)' }}
                >
                  {featured.map((asset, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={asset.id}
                        className="absolute inset-0"
                        style={{ transform: `rotateY(${index * step}deg) translateZ(${radius}px)`, transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                      >
                        <button
                          type="button"
                          onClick={() => onOpen(asset)}
                          className={`group relative h-full w-full overflow-hidden rounded-[2rem] text-left shadow-[0_28px_75px_rgba(0,0,0,.42)] ring-1 transition duration-300 ${isActive ? 'scale-100 ring-[#FFB000]/70' : 'scale-[.88] ring-white/10 opacity-55 hover:opacity-90'}`}
                          aria-label={`Abrir ${asset.title}`}
                        >
                          <img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-gradient-to-t from-[#111218]/94 via-[#111218]/8 to-transparent" />
                          <span className="absolute inset-x-5 bottom-5">
                            <span className="text-[9px] font-black uppercase tracking-[.18em] text-[#F2DFBB]">{asset.category}</span>
                            <strong className="mt-2 block text-2xl font-black leading-[1.02] text-white">{asset.title}</strong>
                            <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-black text-white/70"><Maximize2 className="h-3.5 w-3.5" /> Abrir imagen</span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute inset-x-5 bottom-5 z-30">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full origin-left rounded-full bg-[linear-gradient(90deg,#F5871F,#FFF9EE)]" style={{ transform: `scaleX(${count > 1 ? activeIndex / (count - 1) : 1})` }} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0} className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition hover:bg-[#F5871F] hover:text-[#08090A] disabled:opacity-25"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/42">Carrusel sincronizado con el scroll</span>
                  <button type="button" onClick={() => scrollToIndex(activeIndex + 1)} disabled={activeIndex === count - 1} className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition hover:bg-[#F5871F] hover:text-[#08090A] disabled:opacity-25"><ChevronRight className="h-5 w-5" /></button>
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col rounded-[2rem] bg-[#FFF9EE] p-6 text-[#08090A] shadow-2xl xl:p-7">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#F2DFBB] px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#BFB8AC]"><Images className="h-3.5 w-3.5" /> Álbum agrupado</span>
                  <span className="text-[10px] font-black text-[#F5871F]">{activeIndex + 1} de {count}</span>
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[.22em] text-[#F5871F]">{active.album_title}</p>
                <h3 className="mt-3 text-3xl font-black leading-[.98] tracking-[-.045em] xl:text-4xl">{active.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#BFB8AC]">{active.description || 'Referencia visual para comparar estilo, distribución, materialidad y nivel de terminación.'}</p>
                <div className="mt-5 flex flex-wrap gap-2">{active.tags?.slice(0, 7).map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#BFB8AC] ring-1 ring-[#08090A]/7">#{tag}</span>)}</div>
              </div>

              <div className="mt-auto pt-6">
                <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featured.map((asset, index) => <button key={asset.id} type="button" onClick={() => scrollToIndex(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 transition ${index === activeIndex ? 'ring-[#F5871F]' : 'ring-transparent opacity-55 hover:opacity-100'}`} aria-label={`Ir a imagen ${index + 1}`}><img src={asset.thumb || asset.url} alt="" className="h-full w-full object-cover" /></button>)}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <button type="button" onClick={() => onOpen(active)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F2DFBB] px-4 text-xs font-black text-[#08090A]"><Maximize2 className="h-4 w-4" /> Ver en grande</button>
                  <a href={quoteHref(active)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#08090A] px-4 text-xs font-black text-[#FFF9EE]"><MessageCircle className="h-4 w-4" /> Cotizar referencia</a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mt-7 lg:hidden" aria-label={`Carrusel móvil del álbum ${active.album_title}`}>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {assets.map((asset, index) => (
            <article key={asset.id} className="w-[86vw] max-w-[410px] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-[#08090A] text-[#FFF9EE] shadow-[0_20px_70px_rgba(23,24,32,.18)]">
              <button type="button" onClick={() => onOpen(asset)} className="relative block h-[430px] w-full overflow-hidden text-left">
                <img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#08090A]/94 via-transparent to-transparent" />
                <span className="absolute left-5 top-5 rounded-full bg-[#FFF9EE]/92 px-3 py-1.5 text-[9px] font-black text-[#08090A]">{index + 1} / {assets.length}</span>
                <span className="absolute inset-x-5 bottom-5"><span className="text-[9px] font-black uppercase tracking-[.18em] text-[#F2DFBB]">{asset.category}</span><strong className="mt-2 block text-2xl font-black leading-tight">{asset.title}</strong></span>
              </button>
              <div className="p-5">
                <p className="line-clamp-3 text-xs leading-6 text-[#D2C6BD]">{asset.description || 'Referencia visual para adaptar al espacio, materiales y nivel de terminación.'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => onOpen(asset)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/8 text-xs font-black"><Maximize2 className="h-4 w-4" /> Ampliar</button><a href={quoteHref(asset)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F5871F] px-3 text-xs font-black text-[#08090A]"><MessageCircle className="h-4 w-4" /> Cotizar</a></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
