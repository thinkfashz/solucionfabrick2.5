'use client';

import { useCallback, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, TrendingUp } from 'lucide-react';
import { formatCLP } from '@/lib/budgetMath';
import GlobeLive from '@/components/store/GlobeLive';

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
  mlItemId?: string;
  category?: string;
  rating?: number;
  reviews?: number;
}

export interface CartItem {
  productId: string;
  product: StoreProduct;
  quantity: number;
}

interface TiendaMercadoLibreProps {
  products: StoreProduct[];
  onAddToQuote?: (items: CartItem[]) => void;
  onCheckout?: (items: CartItem[]) => void;
  compact?: boolean;
}

const markerSets = [
  [{ id: 'cl', location: [-35.84, -71.54] as [number, number] }, { id: 'stgo', location: [-33.45, -70.66] as [number, number] }, { id: 'usa', location: [37.78, -122.44] as [number, number] }],
  [{ id: 'lin', location: [-35.85, -71.60] as [number, number] }, { id: 'mad', location: [40.41, -3.70] as [number, number] }, { id: 'tok', location: [35.68, 139.65] as [number, number] }],
  [{ id: 'tal', location: [-35.42, -71.66] as [number, number] }, { id: 'nyc', location: [40.71, -74.01] as [number, number] }, { id: 'lon', location: [51.51, -0.13] as [number, number] }],
];

function productMarkers(product: StoreProduct) {
  const seed = product.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return markerSets[seed % markerSets.length];
}

export default function TiendaMercadoLibre({ products, onAddToQuote, onCheckout, compact = false }: TiendaMercadoLibreProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))), [products]);
  const filtered = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;

  const handleAddToCart = useCallback((product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) return prev.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) => item.productId === productId ? { ...item, quantity: Math.min(quantity, item.product.stock) } : item);
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => setCart((prev) => prev.filter((item) => item.productId !== productId)), []);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (compact) {
    return <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 6).map((product) => <ProductCardCompact key={product.id} product={product} inCart={cart.some((item) => item.productId === product.id)} quantity={cart.find((item) => item.productId === product.id)?.quantity || 0} onAddToCart={handleAddToCart} />)}
      </div>
      {cart.length > 0 && <button onClick={() => onAddToQuote?.(cart)} className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/15"><ShoppingCart className="h-4 w-4" />Añadir al presupuesto ({cartCount})</button>}
    </div>;
  }

  return <div className="space-y-6 rounded-[2rem] border border-white/10 bg-zinc-950/60 p-4 backdrop-blur-sm sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Tienda conectada</p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-white">Productos en vivo</h3>
        <p className="mt-1 text-sm text-zinc-400">{products.length} productos disponibles con visual live global.</p>
      </div>
      {cart.length > 0 && <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-center"><p className="text-[11px] uppercase tracking-wider text-yellow-300">Carrito</p><p className="mt-1 text-2xl font-black text-yellow-200">{cartCount}</p></div>}
    </div>

    {categories.length > 1 && <div className="flex flex-wrap gap-2">
      <button onClick={() => setSelectedCategory(null)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedCategory === null ? 'bg-yellow-400 text-zinc-950' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>Todos</button>
      {categories.map((cat) => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-yellow-400 text-zinc-950' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>{cat}</button>)}
    </div>}

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((product) => <ProductCard key={product.id} product={product} cartItem={cart.find((item) => item.productId === product.id)} onAddToCart={handleAddToCart} onUpdateQuantity={handleUpdateQuantity} onRemove={handleRemoveFromCart} />)}
    </div>

    {cart.length > 0 && <CartPanel cart={cart} cartTotal={cartTotal} cartCount={cartCount} onRemove={handleRemoveFromCart} onAddToQuote={onAddToQuote} onCheckout={onCheckout} />}
  </div>;
}

function ProductCard({ product, cartItem, onAddToCart, onUpdateQuantity, onRemove }: { product: StoreProduct; cartItem?: CartItem; onAddToCart: (product: StoreProduct) => void; onUpdateQuantity: (productId: string, quantity: number) => void; onRemove: (productId: string) => void }) {
  const isOutOfStock = product.stock === 0;
  const markers = useMemo(() => productMarkers(product), [product]);

  return <article className="group relative min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/35 hover:bg-white/[0.07]">
    <div className="relative min-h-[280px] overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,rgba(250,204,21,.16),transparent_45%),linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.84))]" />
      {product.image ? <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-44 saturate-110 transition duration-500 group-hover:scale-105 group-hover:opacity-58" /> : null}
      <GlobeLive markers={markers} compact className="absolute right-[-18%] top-[-8%] h-[78%] w-[78%] min-w-[220px] opacity-95" speed={0.0026} />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {product.category && <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-yellow-200 backdrop-blur-xl">{product.category}</span>}
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] backdrop-blur-xl ${isOutOfStock ? 'border-red-400/35 bg-red-500/12 text-red-200' : 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'}`}>{isOutOfStock ? 'Sin stock' : `${product.stock} disponibles`}</span>
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <div className="rounded-[1.4rem] border border-white/12 bg-black/58 p-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h4 className="line-clamp-2 text-lg font-black leading-tight text-white">{product.name}</h4>{product.rating ? <p className="mt-1 text-xs text-zinc-300">⭐ {product.rating.toFixed(1)} ({product.reviews ?? 0} reseñas)</p> : null}</div>
            <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-yellow-300" />
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4 p-4">
      {product.description && <p className="line-clamp-2 text-sm leading-6 text-zinc-400">{product.description}</p>}
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">Precio</p><p className="text-2xl font-black text-yellow-300">{formatCLP(product.price)}</p></div>
        {product.mlItemId && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">ML</span>}
      </div>

      {cartItem ? <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
        <button onClick={() => onUpdateQuantity(product.id, cartItem.quantity - 1)} className="grid h-10 flex-1 place-items-center rounded-xl text-zinc-300 hover:bg-white/10 hover:text-yellow-300" title="Reducir cantidad" aria-label="Reducir cantidad"><Minus className="h-4 w-4" /></button>
        <span className="min-w-8 text-center font-black text-white">{cartItem.quantity}</span>
        <button onClick={() => onUpdateQuantity(product.id, Math.min(cartItem.quantity + 1, product.stock))} className="grid h-10 flex-1 place-items-center rounded-xl text-zinc-300 hover:bg-white/10 hover:text-yellow-300 disabled:opacity-40" disabled={cartItem.quantity >= product.stock} title="Aumentar cantidad" aria-label="Aumentar cantidad"><Plus className="h-4 w-4" /></button>
        <button onClick={() => onRemove(product.id)} className="grid h-10 w-10 place-items-center rounded-xl text-zinc-300 hover:bg-red-500/10 hover:text-red-300" title="Eliminar del carrito" aria-label="Eliminar del carrito"><Trash2 className="h-4 w-4" /></button>
      </div> : <button onClick={() => onAddToCart(product)} disabled={isOutOfStock} className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 py-3 font-black text-zinc-950 transition hover:from-yellow-300 hover:to-orange-300 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart className="mr-2 inline-block h-4 w-4" />Agregar</button>}
    </div>
  </article>;
}

function CartPanel({ cart, cartTotal, cartCount, onRemove, onAddToQuote, onCheckout }: { cart: CartItem[]; cartTotal: number; cartCount: number; onRemove: (productId: string) => void; onAddToQuote?: (items: CartItem[]) => void; onCheckout?: (items: CartItem[]) => void }) {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-white">Detalle del carrito</h4><span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-200">{cartCount} ítems</span></div>
    <div className="space-y-3">{cart.map((item) => <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{item.product.name}</p><p className="text-sm text-zinc-400">{item.quantity}x {formatCLP(item.product.price)}</p></div><div className="flex items-center gap-2"><p className="text-right font-bold text-yellow-300">{formatCLP(item.product.price * item.quantity)}</p><button onClick={() => onRemove(item.productId)} className="text-zinc-400 hover:text-red-400" title="Eliminar del carrito" aria-label="Eliminar del carrito"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
    <div className="border-t border-white/10 pt-4"><div className="flex items-baseline justify-between"><span className="text-sm font-semibold text-zinc-400">Subtotal</span><span className="text-lg font-bold text-white">{formatCLP(cartTotal)}</span></div><div className="mt-2 flex items-baseline justify-between"><span className="text-sm font-semibold text-zinc-400">Total</span><span className="text-2xl font-black text-yellow-300">{formatCLP(Math.round(cartTotal * 1.19))}</span></div></div>
    <div className="grid gap-3 pt-2 sm:grid-cols-2"><button onClick={() => onAddToQuote?.(cart)} className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 py-3 font-semibold text-yellow-200 hover:bg-yellow-400/15">Añadir a presupuesto</button><button onClick={() => onCheckout?.(cart)} className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 py-3 font-semibold text-zinc-950 hover:from-yellow-300 hover:to-orange-300">Finalizar compra</button></div>
  </div>;
}

function ProductCardCompact({ product, inCart, quantity, onAddToCart }: { product: StoreProduct; inCart: boolean; quantity: number; onAddToCart: (product: StoreProduct) => void }) {
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10">
    <div className="relative h-28 bg-black/70"><GlobeLive compact className="absolute right-2 top-2 h-24 w-24" speed={0.002} />{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover opacity-35" /> : null}</div>
    <div className="p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h4 className="line-clamp-2 text-sm font-bold text-white">{product.name}</h4><p className="mt-1 text-lg font-black text-yellow-300">{formatCLP(product.price)}</p></div>{inCart && <div className="rounded bg-yellow-400/20 px-2 py-1 text-xs font-bold text-yellow-300">{quantity}</div>}</div>{!inCart && <button onClick={() => onAddToCart(product)} className="mt-3 w-full rounded-xl bg-yellow-400/10 px-2 py-2 text-xs font-semibold text-yellow-200 hover:bg-yellow-400/20">+</button>}</div>
  </div>;
}
