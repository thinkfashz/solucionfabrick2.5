'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CartDrawer from '@/components/store/CartDrawer';
import type { Product } from '@/hooks/useRealtimeProducts';

export interface CartItem { product: Product; quantity: number; }
const CART_STORAGE_KEY = 'fabrick.cart.v2';
export const CART_SESSION_KEY = 'fabrick.cart.session.v2';
const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  cartOpen: boolean;
  addToCart: (product: Product | undefined | null, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  goToCheckout: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function maxAvailable(product: Product) {
  const value = Number(product.stock);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function clampQuantity(product: Product, quantity: number) {
  const requested = Math.max(1, Math.floor(quantity || 1));
  const max = maxAvailable(product);
  if (max === null) return requested;
  return Math.min(requested, max);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: CartItem[] };
        if (parsed?.data && Array.isArray(parsed.data) && Date.now() - parsed.ts < CART_TTL_MS) {
          const normalized = parsed.data.flatMap((item) => {
            if (!item?.product?.id) return [];
            const max = maxAvailable(item.product);
            if (max === 0) return [];
            return [{ ...item, quantity: clampQuantity(item.product, item.quantity) }];
          });
          setItems(normalized);
        }
      }
    } catch {}
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ ts: Date.now(), data: items })); } catch {}
  }, [items]);

  const addToCart = useCallback((product: Product | undefined | null, qty = 1) => {
    if (!product?.id || qty < 1 || maxAvailable(product) === 0) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx !== -1) {
        const updated = [...prev];
        const mergedProduct = { ...updated[idx].product, ...product };
        updated[idx] = {
          product: mergedProduct,
          quantity: clampQuantity(mergedProduct, updated[idx].quantity + qty),
        };
        return updated;
      }
      return [...prev, { product, quantity: clampQuantity(product, qty) }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.product.id !== productId)), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) => prev.map((item) => item.product.id === productId ? { ...item, quantity: clampQuantity(item.product, quantity) } : item));
  }, []);
  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const goToCheckout = useCallback(() => {
    if (items.length === 0) return;
    try { sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(items)); } catch {}
    setCartOpen(false);
    router.push('/checkout?cart=1');
  }, [items, router]);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((s, i) => {
    const discount = i.product.discount_percentage || 0;
    return s + i.product.price * (1 - discount / 100) * i.quantity;
  }, 0), [items]);

  const value = useMemo<CartContextValue>(() => ({ items, totalItems, totalPrice, cartOpen, addToCart, removeFromCart, updateQuantity, clearCart, openCart, closeCart, goToCheckout }), [items, totalItems, totalPrice, cartOpen, addToCart, removeFromCart, updateQuantity, clearCart, openCart, closeCart, goToCheckout]);

  return <CartContext.Provider value={value}>{children}<CartDrawer open={cartOpen} items={items} onClose={closeCart} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onCheckout={goToCheckout} /></CartContext.Provider>;
}

export function useCartContext(): CartContextValue { const ctx = useContext(CartContext); if (!ctx) throw new Error('useCartContext must be used within CartProvider'); return ctx; }
export function useCartContextSafe(): CartContextValue | null { return useContext(CartContext); }
export const CART_SESSION_KEY_EXPORT = CART_SESSION_KEY;