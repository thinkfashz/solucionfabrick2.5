'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { ArrowRight, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import type { CartItem } from '@/context/CartContext';
import { formatCLP } from '@/hooks/useCart';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

function getUnitPrice(item: CartItem) {
  const discount = item.product.discount_percentage || 0;
  return Math.round(item.product.price * (1 - discount / 100));
}

export default function CartDrawer({ open, items, onClose, onUpdateQuantity, onRemoveItem, onCheckout }: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((s, item) => s + getUnitPrice(item) * item.quantity, 0);
  const originalTotal = items.reduce((s, item) => s + item.product.price * item.quantity, 0);
  const savings = Math.max(0, originalTotal - subtotal);
  const itemCount = items.reduce((s, item) => s + item.quantity, 0);
  const shippingGoal = 300000;
  const shippingPct = Math.min(100, Math.round((subtotal / shippingGoal) * 100));
  const missingForShipping = Math.max(0, shippingGoal - subtotal);

  return (
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-md" onClick={onClose} />

      <aside className="absolute bottom-0 left-0 right-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#060504]/98 text-white shadow-[0_-28px_100px_rgba(0,0,0,.62)] md:inset-y-0 md:left-auto md:h-full md:max-h-none md:w-full md:max-w-[460px] md:rounded-none md:border-l md:border-r-0 md:shadow-[0_0_120px_rgba(0,0,0,.75)]">
        <div className="relative overflow-hidden border-b border-white/10 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(250,204,21,.2),transparent_18rem)]" />
          <div className="relative mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/14 md:hidden" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.22em] text-yellow-100"><ShoppingBag className="h-3.5 w-3.5" /> Bolso activo</p>
              <h3 className="mt-4 text-3xl font-black tracking-[-.055em]">Tu compra</h3>
              <p className="mt-1 text-sm text-zinc-400">{itemCount} producto(s). Revisa y pasa a checkout en un toque.</p>
            </div>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition hover:bg-white hover:text-black" aria-label="Cerrar carrito">
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-yellow-300 text-black"><ShoppingBag className="h-8 w-8" /></div>
              <p className="mt-5 text-xl font-black">Tu bolso está vacío</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Agrega productos desde la tienda para activar el checkout rápido.</p>
              <button onClick={onClose} className="mt-6 rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-black">Seguir comprando</button>
            </div>
          ) : (
            items.map((item) => {
              const unitPrice = getUnitPrice(item);
              const discount = item.product.discount_percentage || 0;
              const lineTotal = unitPrice * item.quantity;
              return (
                <article key={item.product.id} className="rounded-[1.55rem] border border-white/10 bg-white/[0.045] p-3 transition hover:border-yellow-300/25 hover:bg-yellow-300/[0.055]">
                  <div className="flex gap-3">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[1.15rem] bg-white/5">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-white/15">Sin imagen</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-black leading-5 text-white">{item.product.name}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[.18em] text-yellow-300/80">{item.product.category_id || 'Producto'}</p>
                        </div>
                        <button onClick={() => onRemoveItem(item.product.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/25 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-300" aria-label="Eliminar producto">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-yellow-300">{formatCLP(unitPrice)}</p>
                          {discount > 0 && <p className="text-xs text-zinc-600 line-through">{formatCLP(item.product.price)}</p>}
                        </div>
                        <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/35 p-1">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                            disabled={item.quantity <= 1}
                            aria-label="Restar cantidad"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="grid h-8 min-w-8 place-items-center px-2 text-sm font-black">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
                            aria-label="Sumar cantidad"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                        <span className="text-zinc-500">Subtotal línea</span>
                        <b className="text-white">{formatCLP(lineTotal)}</b>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 bg-black/55 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-5">
            <div className="grid gap-2 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-xs text-emerald-200"><Truck className="h-4 w-4" />Despacho coordinado después de confirmar disponibilidad.</div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300 transition-all duration-700" style={{ width: `${shippingPct}%` }} /></div>
              <p className="text-[11px] text-zinc-500">{missingForShipping > 0 ? `Agrega ${formatCLP(missingForShipping)} para priorizar despacho coordinado.` : 'Compra lista para despacho coordinado prioritario.'}</p>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/45">Subtotal</span><span className="text-white">{formatCLP(subtotal)}</span></div>
              {savings > 0 && <div className="flex justify-between"><span className="text-emerald-300/75">Ahorro aplicado</span><span className="text-emerald-300">-{formatCLP(savings)}</span></div>}
              <div className="flex justify-between border-t border-white/10 pt-3 text-lg"><span className="font-black text-white">Total</span><span className="font-black text-yellow-300">{formatCLP(subtotal)}</span></div>
            </div>

            <div className="mt-5 grid gap-2">
              <button onClick={onCheckout} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 text-sm font-black text-black shadow-[0_20px_70px_rgba(250,204,21,.18)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
                Ir a checkout seguro <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-xs font-black text-white/75 transition hover:bg-white hover:text-black">
                Seguir comprando
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-zinc-500">
              <span className="inline-flex items-center justify-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Seguro</span>
              <span className="inline-flex items-center justify-center gap-1"><PackageCheck className="h-3.5 w-3.5 text-yellow-300" />Orden</span>
              <span className="inline-flex items-center justify-center gap-1"><Truck className="h-3.5 w-3.5 text-zinc-300" />Despacho</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
