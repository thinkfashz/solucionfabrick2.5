'use client';

import { ArrowRight, BadgePercent, Check, PackageCheck, ShoppingCart } from 'lucide-react';
import type { CatalogProduct } from '@/hooks/useCatalogProducts';
import { CLP, displayProductName, finalProductPrice } from './featuredProducts';

interface FeaturedProductFocusProps {
  product: CatalogProduct;
  added: boolean;
  onAdd: () => void;
  onBuy: () => void;
  mobile?: boolean;
}

export default function FeaturedProductFocus({ product, added, onAdd, onBuy, mobile = false }: FeaturedProductFocusProps) {
  const discount = product.discountPercentage ?? product.discount_percentage ?? 0;
  const soldOut = product.stock === 0;
  const features = product.features.filter(Boolean).slice(0, 3);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#11100d] shadow-[0_30px_100px_rgba(0,0,0,.32)]">
      <div className={`relative overflow-hidden bg-white/5 ${mobile ? 'h-[280px]' : 'h-[315px]'}`}>
        {product.img ? <img src={product.img} alt={displayProductName(product.name)} className="h-full w-full object-cover" /> : <div className="h-full bg-[#18140d]" />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.22)_48%,rgba(0,0,0,.88))]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-5 sm:top-5">
          <span className="rounded-full bg-yellow-300 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-black">Más vendido</span>
          {discount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-[9px] font-black text-white"><BadgePercent className="h-3 w-3" /> -{discount}%</span> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">{product.category}</p>
          <h3 className={`mt-2 max-w-2xl font-black leading-[1.04] tracking-[-.045em] text-white ${mobile ? 'text-2xl' : 'text-3xl xl:text-4xl'}`}>{displayProductName(product.name)}</h3>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{product.description || product.tagline}</p>
        {features.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {features.map((feature) => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />{feature}</li>)}
          </ul>
        ) : null}

        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <strong className="text-3xl font-black text-yellow-300">{CLP(finalProductPrice(product))}</strong>
            {discount > 0 ? <span className="text-sm text-zinc-500 line-through">{CLP(product.price)}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5 text-yellow-300" /> {product.delivery}</span>
            <span>{soldOut ? 'Stock agotado' : product.stock != null ? `${product.stock} disponibles` : 'Stock por confirmar'}</span>
          </div>
        </div>

        <div className={`mt-5 grid gap-3 ${mobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          <button type="button" onClick={onAdd} disabled={soldOut} className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${added ? 'bg-emerald-300 text-black' : 'bg-yellow-300 text-black hover:bg-white'}`}>
            {added ? <><Check className="h-4 w-4" /> Añadido al carrito</> : <><ShoppingCart className="h-4 w-4" /> Añadir al carrito</>}
          </button>
          <button type="button" onClick={onBuy} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[.045] px-5 text-sm font-black text-white transition hover:border-yellow-300/45 hover:text-yellow-200">
            Ver y comprar <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p aria-live="polite" className="sr-only">{added ? `${displayProductName(product.name)} fue añadido al carrito.` : ''}</p>
      </div>
    </article>
  );
}
