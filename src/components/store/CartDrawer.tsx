'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/hooks/useCart';
import { formatCLP } from '@/hooks/useCart';
import SilverGoldButton from './SilverGoldButton';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ open, items, onClose, onUpdateQuantity, onRemoveItem, onCheckout }: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((s, i) => {
    const discount = i.product.discount_percentage || 0;
    const price = i.product.price * (1 - discount / 100);
    return s + price * i.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-[220]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-black/95 border-l border-yellow-400/10 flex flex-col cart-border-run">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="font-playfair text-lg text-white">Tu Carrito</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <p className="text-sm">Tu carrito está vacío</p>
              <p className="text-xs mt-1">Explora nuestra boutique</p>
            </div>
          ) : (
            items.map((item) => {
              const discount = item.product.discount_percentage || 0;
              const unitPrice = item.product.price * (1 - discount / 100);
              return (
                <div key={item.product.id} className="flex gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">N/A</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.product.name}</p>
                    <p className="text-yellow-400/70 text-xs mt-1">{formatCLP(unitPrice)}</p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-white text-xs w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button onClick={() => onRemoveItem(item.product.id)} className="self-start text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Subtotal</span>
              <span className="text-white">{formatCLP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-white/60 font-medium">Total</span>
              <span className="text-yellow-400 font-playfair">{formatCLP(subtotal)}</span>
            </div>
            <SilverGoldButton onClick={onCheckout} className="w-full py-4">
              Finalizar Compra
            </SilverGoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
