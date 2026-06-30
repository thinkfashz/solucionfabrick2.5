'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatCLP } from '@/hooks/useCart';

export default function StoreQuickCartBar({
  count,
  total,
  onOpenCart,
  onCheckout,
}: {
  count: number;
  total: number;
  onOpenCart: () => void;
  onCheckout: () => void;
}) {
  if (count <= 0) return null;

  return <div className="fixed inset-x-3 bottom-[94px] z-[165] rounded-[1.6rem] border border-emerald-300/20 bg-emerald-300 p-2 text-black shadow-[0_18px_55px_rgba(16,185,129,.22)] md:hidden">
    <div className="flex items-center gap-3">
      <button onClick={onOpenCart} className="grid h-12 w-12 place-items-center rounded-[1.1rem] bg-black text-emerald-300" aria-label="Abrir bolso">
        <ShoppingBag className="h-5 w-5" />
      </button>
      <button onClick={onOpenCart} className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-black uppercase tracking-[.18em] opacity-70">{count} producto(s) en bolso</p>
        <p className="truncate text-lg font-black leading-tight">{formatCLP(total)}</p>
      </button>
      <button onClick={onCheckout} className="inline-flex h-12 items-center gap-1 rounded-[1.1rem] bg-black px-4 text-sm font-black text-white" aria-label="Ir a checkout">
        Pagar <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>;
}
