'use client';

import Link from 'next/link';
import { useState } from 'react';
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

/**
 * A responsive recommendation selector. It deliberately avoids a scroll-bound
 * 3D carousel so product selection stays smooth on compact devices.
 */
export default function FeaturedProductsCarousel({ products, title, description, ctaHref, ctaLabel, addedProductId, onAdd, onBuy }: FeaturedProductsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(products.length - 1, 0));
  const activeProduct = products[safeIndex];

  if (!activeProduct) return null;

  const select = (index: number) => setActiveIndex(Math.max(0, Math.min(products.length - 1, index)));

  return (
    <section aria-labelledby="featured-products-title" className="relative">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFB000]/32 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-[#825300] ring-1 ring-[#F5871F]/35"><Sparkles className="h-3.5 w-3.5" /> Recomendados para tu proyecto</div>
          <h2 id="featured-products-title" className="mt-4 text-4xl font-black leading-[.94] tracking-[-.055em] text-[#08090A] sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5E5853] sm:text-base">{description}</p>
        </div>
        <Link href={ctaHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#08090A] px-6 text-sm font-black text-[#FFF9EE] transition hover:-translate-y-0.5 hover:bg-[#2A2C37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5871F] focus-visible:ring-offset-2">{ctaLabel} <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(360px,.96fr)] xl:items-stretch">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 xl:hidden">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#825300]">Producto destacado · {safeIndex + 1} de {products.length}</p>
            <RecommendationControls index={safeIndex} total={products.length} onSelect={select} />
          </div>
          <FeaturedProductFocus product={activeProduct} added={addedProductId === activeProduct.id} onAdd={() => onAdd(activeProduct)} onBuy={() => onBuy(activeProduct)} />
        </div>

        <aside aria-label="Opciones recomendadas" className="overflow-hidden rounded-[2rem] border border-[#08090A]/10 bg-[#EDE2D7] p-4 shadow-[0_24px_70px_rgba(23,24,32,.10)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.21em] text-[#B56D00]">Elige y compara</p>
              <h3 className="mt-2 text-2xl font-black leading-[1.02] tracking-[-.045em] text-[#08090A]">Opciones que complementan tu obra.</h3>
            </div>
            <div className="hidden xl:block"><RecommendationControls index={safeIndex} total={products.length} onSelect={select} /></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#665C55]">Toca una tarjeta para verla en detalle, revisar su disponibilidad o añadirla al carrito.</p>

          <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
            {products.map((product, index) => (
              <RecommendationCard key={product.id} product={product} selected={index === safeIndex} onSelect={() => select(index)} />
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#08090A]/10 bg-[#FFF9EE]/80 p-3.5 text-xs leading-5 text-[#5F5751]">
            <b className="text-[#08090A]">Recomendación orientativa.</b> Confirma compatibilidad, medidas y stock antes de comprar o instalar.
          </div>
        </aside>
      </div>
    </section>
  );
}

function RecommendationControls({ index, total, onSelect }: { index: number; total: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" aria-label="Ver producto recomendado anterior" className="grid h-10 w-10 place-items-center rounded-full border border-[#08090A]/10 bg-[#FFF9EE] text-[#08090A] transition hover:border-[#F5871F] hover:bg-[#F5871F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5871F] disabled:cursor-not-allowed disabled:opacity-35" disabled={index === 0} onClick={() => onSelect(index - 1)}><ChevronLeft className="h-4 w-4" /></button>
      <button type="button" aria-label="Ver siguiente producto recomendado" className="grid h-10 w-10 place-items-center rounded-full bg-[#08090A] text-[#FFF9EE] transition hover:bg-[#F5871F] hover:text-[#08090A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5871F] disabled:cursor-not-allowed disabled:opacity-35" disabled={index === total - 1} onClick={() => onSelect(index + 1)}><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function RecommendationCard({ product, selected, onSelect }: { product: CatalogProduct; selected: boolean; onSelect: () => void }) {
  const discount = product.discountPercentage ?? product.discount_percentage ?? 0;
  const name = displayProductName(product.name);

  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} onMouseEnter={onSelect} onFocus={onSelect} className={`group w-[72vw] max-w-[280px] shrink-0 snap-center overflow-hidden rounded-[1.45rem] border bg-[#FFF9EE] text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5871F] sm:w-auto sm:max-w-none ${selected ? 'border-[#F5871F] shadow-[0_16px_34px_rgba(245,135,31,.20)]' : 'border-[#08090A]/10 hover:-translate-y-0.5 hover:border-[#B56D00]/50'}`}>
      <span className="relative block h-32 overflow-hidden bg-[#DACABE] sm:h-36">
        {product.img ? <img src={product.img} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-500 ${selected ? 'scale-105' : 'group-hover:scale-105'}`} /> : <span className="block h-full bg-[linear-gradient(135deg,#DACABE,#FFB000)]" />}
        <span className="absolute inset-0 bg-gradient-to-t from-[#08090A]/45 to-transparent" />
        {discount > 0 ? <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#08090A] px-2 py-1 text-[8px] font-black text-[#FFF9EE]"><BadgePercent className="h-3 w-3" /> -{discount}%</span> : null}
        {selected ? <span className="absolute bottom-2 left-2 rounded-full bg-[#F5871F] px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#08090A]">Seleccionado</span> : null}
      </span>
      <span className="block p-3.5"><span className="block text-[8px] font-black uppercase tracking-[.15em] text-[#B56D00]">{product.category}</span><strong className="mt-1.5 line-clamp-2 block min-h-10 text-sm leading-5 text-[#08090A]">{name}</strong><span className="mt-2 block text-base font-black text-[#9A5C00]">{CLP(finalProductPrice(product))}</span><span className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[#6B635D]">Ver recomendación <ArrowRight className="h-3.5 w-3.5" /></span></span>
    </button>
  );
}
