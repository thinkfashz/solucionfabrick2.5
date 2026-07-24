'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgePercent, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { CatalogProduct } from '@/hooks/useCatalogProducts';
import FeaturedProductFocus from './FeaturedProductFocus';
import { CLP, displayProductName, finalProductPrice } from './featuredProducts';

interface FeaturedProductsCarouselProps {
  products: CatalogProduct[];
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  addedProductId: string | null;
  onAdd: (product: CatalogProduct) => void;
  onBuy: (product: CatalogProduct) => void;
}

export default function FeaturedProductsCarousel({ products, title, description, ctaHref, ctaLabel, addedProductId, onAdd, onBuy }: FeaturedProductsCarouselProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const mobileFrame = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const safeIndex = Math.min(activeIndex, Math.max(products.length - 1, 0));
  const activeProduct = products[safeIndex];
  const angleStep = products.length > 0 ? 360 / products.length : 0;

  useEffect(() => {
    if (products.length < 2) return;
    let frame = 0;
    const sync = () => {
      if (window.innerWidth < 1024 || hoverIndex !== null || !sectionRef.current) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
        const progress = Math.max(0, Math.min(1, -rect.top / travel));
        setActiveIndex(Math.round(progress * (products.length - 1)));
      });
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [hoverIndex, products.length]);

  useEffect(() => () => {
    if (mobileFrame.current) window.cancelAnimationFrame(mobileFrame.current);
  }, []);

  const scrollMobileTo = (index: number) => {
    const track = mobileTrackRef.current;
    const child = track?.children.item(index) as HTMLElement | null;
    if (!track || !child) return;
    child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setActiveIndex(index);
  };

  const onMobileScroll = () => {
    const track = mobileTrackRef.current;
    if (!track) return;
    if (mobileFrame.current) window.cancelAnimationFrame(mobileFrame.current);
    mobileFrame.current = window.requestAnimationFrame(() => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      Array.from(track.children).forEach((child, index) => {
        const element = child as HTMLElement;
        const current = Math.abs(center - (element.offsetLeft + element.offsetWidth / 2));
        if (current < distance) {
          distance = current;
          nearest = index;
        }
      });
      setActiveIndex(nearest);
    });
  };

  if (!activeProduct) return null;
  const rotation = safeIndex * -angleStep;

  return (
    <div ref={sectionRef} className="relative lg:min-h-[1000px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ccb196]/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-[#765438] ring-1 ring-[#b6906c]/35"><Sparkles className="h-3.5 w-3.5" /> Selección de la tienda</div>
          <h2 className="mt-4 text-4xl font-black leading-[.94] tracking-[-.055em] text-[#171820] sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#675f59] sm:text-base">{description}</p>
        </div>
        <Link href={ctaHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#171820] px-6 text-sm font-black text-[#f8f0e9] transition hover:bg-[#2a2c37]">{ctaLabel} <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="mt-8 lg:sticky lg:top-24">
        <div className="hidden items-center gap-8 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,.95fr)]">
          <FeaturedProductFocus product={activeProduct} added={addedProductId === activeProduct.id} onAdd={() => onAdd(activeProduct)} onBuy={() => onBuy(activeProduct)} />
          <div className="relative h-[620px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_45%,rgba(182,144,108,.22),transparent_30%),linear-gradient(145deg,#efe4da,#dcc8b8)] shadow-[0_28px_90px_rgba(23,24,32,.14)] ring-1 ring-[#171820]/10 [perspective:1300px]">
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-44 -translate-y-1/2 rounded-[50%] ring-1 ring-[#171820]/10" />
            <div className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={{ transform: `rotateY(${rotation}deg)` }}>
              {products.map((product, index) => {
                const selected = index === safeIndex;
                const discount = product.discountPercentage ?? product.discount_percentage ?? 0;
                return (
                  <button key={product.id} type="button" onMouseEnter={() => { setHoverIndex(index); setActiveIndex(index); }} onMouseLeave={() => setHoverIndex(null)} onFocus={() => { setHoverIndex(index); setActiveIndex(index); }} onBlur={() => setHoverIndex(null)} onClick={() => setActiveIndex(index)} className="absolute left-0 top-0 h-[250px] w-[190px] text-left [backface-visibility:hidden]" style={{ transform: `translate(-50%, -50%) rotateY(${index * angleStep}deg) translateZ(315px)` }} aria-label={`Seleccionar ${displayProductName(product.name)}`}>
                    <span className={`group block h-full overflow-hidden rounded-[1.5rem] bg-[#fffaf5] shadow-[0_24px_70px_rgba(23,24,32,.2)] ring-1 transition duration-500 ${selected ? 'scale-110 opacity-100 ring-[#b6906c]' : 'scale-90 opacity-55 ring-[#171820]/10 hover:opacity-100'}`}>
                      <span className="relative block h-[154px] overflow-hidden bg-[#e7d9cf]">
                        {product.img ? <img src={product.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : null}
                        <span className="absolute inset-0 bg-gradient-to-t from-[#171820]/45 via-transparent to-transparent" />
                        {discount > 0 ? <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#171820] px-2 py-1 text-[8px] font-black text-[#f8f0e9]"><BadgePercent className="h-3 w-3" /> -{discount}%</span> : null}
                      </span>
                      <span className="block p-3.5"><span className="block text-[8px] font-black uppercase tracking-[.16em] text-[#9a6f4f]">{product.category}</span><strong className="mt-2 line-clamp-2 block text-sm leading-5 text-[#171820]">{displayProductName(product.name)}</strong><span className="mt-2 block text-sm font-black text-[#765438]">{CLP(finalProductPrice(product))}</span></span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-5 text-center"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#765438]">Desplázate o pasa el cursor</p><p className="mt-1 text-xs text-[#766d67]">El producto seleccionado se proyecta al frente.</p></div>
          </div>
        </div>

        <div className="pb-[calc(10rem+env(safe-area-inset-bottom))] lg:hidden">
          <FeaturedProductFocus product={activeProduct} added={addedProductId === activeProduct.id} onAdd={() => onAdd(activeProduct)} onBuy={() => onBuy(activeProduct)} mobile />
          <div className="mt-5 flex items-center justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#765438]">Desliza para cambiar</p><p className="mt-1 text-xs text-[#766d67]">{safeIndex + 1} de {products.length}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => scrollMobileTo(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0} aria-label="Producto anterior" className="grid h-11 w-11 place-items-center rounded-full bg-[#fffaf5] text-[#171820] shadow-sm ring-1 ring-[#171820]/10 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => scrollMobileTo(Math.min(products.length - 1, safeIndex + 1))} disabled={safeIndex === products.length - 1} aria-label="Producto siguiente" className="grid h-11 w-11 place-items-center rounded-full bg-[#171820] text-[#f8f0e9] disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button></div>
          </div>
          <div ref={mobileTrackRef} onScroll={onMobileScroll} className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pr-[18vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((product, index) => {
              const selected = index === safeIndex;
              return <button key={product.id} type="button" onClick={() => scrollMobileTo(index)} className={`w-[47vw] max-w-[190px] shrink-0 snap-center overflow-hidden rounded-[1.3rem] bg-[#fffaf5] text-left shadow-sm ring-1 transition ${selected ? 'ring-[#b6906c]' : 'ring-[#171820]/10'}`}><span className="relative block h-32 overflow-hidden bg-[#e7d9cf]">{product.img ? <img src={product.img} alt="" className={`h-full w-full object-cover transition duration-500 ${selected ? 'scale-105' : ''}`} /> : null}<span className="absolute inset-0 bg-gradient-to-t from-[#171820]/35 to-transparent" /></span><span className="block p-3"><span className="block text-[8px] font-black uppercase tracking-[.15em] text-[#9a6f4f]">{product.category}</span><strong className="mt-1.5 line-clamp-2 block text-xs leading-5 text-[#171820]">{displayProductName(product.name)}</strong><span className="mt-2 block text-sm font-black text-[#765438]">{CLP(finalProductPrice(product))}</span></span></button>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
