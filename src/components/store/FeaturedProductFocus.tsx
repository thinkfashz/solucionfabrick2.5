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
  const name = displayProductName(product.name);

  return (
    <article className="overflow-hidden rounded-[2rem] bg-[#FFF9EE] text-[#08090A] shadow-[0_28px_90px_rgba(23,24,32,.16)] ring-1 ring-[#08090A]/10">
      <div className={`relative overflow-hidden bg-[#e9ddd2] ${mobile ? 'h-[230px]' : 'h-[310px]'}`}>
        {product.img ? (
          <img src={product.img} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full bg-[linear-gradient(135deg,#eadfd4,#FFB000)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,24,32,.02),rgba(23,24,32,.12))]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-5 sm:top-5">
          <span className="rounded-full bg-[#FFF9EE] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-[#08090A] shadow-sm">Más vendido</span>
          {discount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#08090A] px-3 py-1.5 text-[9px] font-black text-[#FFF9EE]"><BadgePercent className="h-3 w-3" /> -{discount}%</span>
          ) : null}
        </div>
      </div>

      <div className={`p-5 sm:p-6 ${mobile ? 'pb-7' : ''}`}>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F5871F]">{product.category}</p>
        <h3 className={`${mobile ? 'text-2xl' : 'text-3xl xl:text-4xl'} mt-2 max-w-2xl font-black leading-[1.04] tracking-[-.045em] text-[#08090A]`}>{name}</h3>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#635b56]">{product.description || product.tagline || 'Producto seleccionado para complementar instalaciones, terminaciones y mejoras del hogar.'}</p>

        {features.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 rounded-xl bg-[#f4ebe3] px-3 py-2.5 text-xs leading-5 text-[#4f4945]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F5871F]" />{feature}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 border-t border-[#08090A]/10 pt-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <strong className="text-3xl font-black text-[#08090A]">{CLP(finalProductPrice(product))}</strong>
            {discount > 0 ? <span className="text-sm text-[#8c817a] line-through">{CLP(product.price)}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#766d67]">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5 text-[#F5871F]" /> {product.delivery}</span>
            <span>{soldOut ? 'Stock agotado' : product.stock != null ? `${product.stock} disponibles` : 'Stock por confirmar'}</span>
          </div>
        </div>

        <div className={`mt-5 grid gap-3 ${mobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          <button type="button" onClick={onAdd} disabled={soldOut} className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${added ? 'bg-emerald-200 text-[#08090A]' : 'bg-[#F5871F] text-[#08090A] hover:bg-[#FFB000]'}`}>
            {added ? <><Check className="h-4 w-4" /> Añadido al carrito</> : <><ShoppingCart className="h-4 w-4" /> Añadir al carrito</>}
          </button>
          <button type="button" onClick={onBuy} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-5 text-sm font-black text-[#FFF9EE] transition hover:bg-[#2a2c37]">
            Ver y comprar <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p aria-live="polite" className="sr-only">{added ? `${name} fue añadido al carrito.` : ''}</p>
      </div>
    </article>
  );
}
