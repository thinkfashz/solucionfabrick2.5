'use client';
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { ArrowRight, Minus, PackageCheck, Plus, ShieldCheck, ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import type { CartItem } from '@/context/CartContext';
import { formatCLP } from '@/hooks/useCart';

interface Props { open:boolean; items:CartItem[]; onClose:()=>void; onUpdateQuantity:(id:string,q:number)=>void; onRemoveItem:(id:string)=>void; onCheckout:()=>void }
const unit=(i:CartItem)=>Math.round(i.product.price*(1-Number(i.product.discount_percentage||0)/100));

export default function CartDrawer({open,items,onClose,onUpdateQuantity,onRemoveItem,onCheckout}:Props){
  if(!open)return null;
  const subtotal=items.reduce((s,i)=>s+unit(i)*i.quantity,0);
  const original=items.reduce((s,i)=>s+i.product.price*i.quantity,0);
  const saved=Math.max(0,original-subtotal);
  const count=items.reduce((s,i)=>s+i.quantity,0);

  return <div className="fixed inset-0 z-[320]">
    <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 h-full w-full bg-black/72 backdrop-blur-[5px]"/>
    <aside className="absolute inset-x-0 bottom-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-white/10 bg-[#080D11] text-white shadow-[0_-28px_90px_rgba(0,0,0,.7)] md:inset-y-0 md:left-auto md:max-h-none md:max-w-[500px] md:rounded-none md:border-l md:border-t-0">
      <header className="shrink-0 border-b border-white/[.08] bg-[#080D11]/98 px-4 pb-4 pt-2.5 sm:px-5 md:pt-5">
        <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/18 md:hidden"/>
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Tu selección</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Carrito <span className="text-white/30">{count}</span></h2></div>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/75" aria-label="Cerrar carrito"><X size={20}/></button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#080D11,#06090C)]">
        {!items.length?<div className="grid min-h-[58dvh] place-items-center p-8 text-center"><div><span className="mx-auto grid h-20 w-20 place-items-center rounded-[1.6rem] border border-[#F6C64A]/20 bg-[#F6C64A]/10 text-[#F6C64A]"><ShoppingCart size={32}/></span><h3 className="mt-5 text-2xl font-black tracking-[-.04em]">Tu carrito está vacío</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/42">Explora la tienda y agrega los productos que necesitas para tu proyecto.</p><button onClick={onClose} className="mt-6 min-h-12 rounded-full bg-[#F6C64A] px-8 text-sm font-black text-[#090B0D] shadow-[0_10px_30px_rgba(246,198,74,.18)]">Ver productos</button></div></div>:
          <div className="space-y-2 p-3 sm:p-4">{items.map(i=>{const p=unit(i),discount=Number(i.product.discount_percentage||0),lineTotal=p*i.quantity;return <article key={i.product.id} className="rounded-[1.35rem] border border-white/[.08] bg-[#0C1216] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,.16)]">
            <div className="flex gap-3.5">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.1rem] border border-white/[.07] bg-[#10171C] p-2 sm:h-28 sm:w-28">{i.product.image_url?<img src={i.product.image_url} alt={i.product.name} className="h-full w-full object-contain"/>:<ShoppingCart className="text-white/15"/>}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black leading-5">{i.product.name}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-[#57D4FF]">{i.product.category_name||i.product.category_id||'Producto Fabrick'}</p>{i.product.tagline||i.product.description?<p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/35">{i.product.tagline||i.product.description}</p>:null}</div><button onClick={()=>onRemoveItem(i.product.id)} aria-label="Eliminar" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.06] text-white/36 hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"><Trash2 size={15}/></button></div>
                <div className="mt-3 flex items-end justify-between gap-2"><div>{discount>0?<p className="text-[10px] text-white/28 line-through">{formatCLP(i.product.price)}</p>:null}<p className="text-xl font-black tracking-[-.04em]">{formatCLP(p)}</p>{discount>0?<span className="text-[9px] font-black text-emerald-400">{discount}% OFF</span>:null}</div><div className="flex h-10 items-center overflow-hidden rounded-xl border border-white/10 bg-black/25"><button disabled={i.quantity<=1} onClick={()=>onUpdateQuantity(i.product.id,i.quantity-1)} className="grid h-10 w-10 place-items-center text-white/70 disabled:opacity-20"><Minus size={14}/></button><span className="min-w-8 text-center text-sm font-black">{i.quantity}</span><button onClick={()=>onUpdateQuantity(i.product.id,i.quantity+1)} className="grid h-10 w-10 place-items-center text-white/80"><Plus size={14}/></button></div></div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[.07] pt-2 text-[9px]"><span className="text-white/32">Total del producto</span><b className="text-[#F6C64A]">{formatCLP(lineTotal)}</b></div>
              </div>
            </div>
          </article>})}</div>}
      </div>

      {items.length>0?<footer className="shrink-0 border-t border-white/[.08] bg-[#090E12]/98 p-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-5">
        <div className="mb-3 flex items-start gap-3 rounded-[1.1rem] border border-emerald-400/15 bg-emerald-400/[.055] p-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/><div><b className="text-[11px] text-emerald-300">Despacho transparente</b><p className="mt-0.5 text-[9px] leading-4 text-white/38">El costo final de entrega se informa según tu región antes de pagar.</p></div></div>
        <div className="space-y-1.5 text-xs"><div className="flex justify-between text-white/45"><span>Productos ({count})</span><span>{formatCLP(subtotal)}</span></div>{saved>0?<div className="flex justify-between font-bold text-emerald-400"><span>Ahorras</span><span>-{formatCLP(saved)}</span></div>:null}<div className="mt-2 flex items-end justify-between border-t border-white/[.08] pt-3"><span className="font-bold text-white/70">Total productos</span><strong className="text-2xl tracking-[-.045em] text-[#F6C64A]">{formatCLP(subtotal)}</strong></div><p className="text-right text-[8px] font-black uppercase tracking-[.12em] text-white/28">IVA incluido</p></div>
        <button onClick={onCheckout} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-5 text-sm font-black text-[#080A0D] shadow-[0_12px_35px_rgba(246,198,74,.18)]">Continuar compra <ArrowRight size={18}/></button>
        <button onClick={onClose} className="mt-1.5 min-h-10 w-full text-xs font-bold text-[#F6C64A]">Seguir comprando</button>
        <div className="mt-2.5 flex items-center justify-center gap-4 border-t border-white/[.07] pt-2.5 text-[8px] font-bold text-white/34"><span className="flex items-center gap-1"><ShieldCheck size={13}/>Compra protegida</span><span className="flex items-center gap-1"><PackageCheck size={13}/>Orden trazable</span></div>
      </footer>:null}
    </aside>
  </div>;
}
