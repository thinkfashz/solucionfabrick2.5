'use client';

import { useState, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, TrendingUp } from 'lucide-react';
import { formatCLP } from '@/lib/budgetMath';

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

export default function TiendaMercadoLibre({
  products,
  onAddToQuote,
  onCheckout,
  compact = false,
}: TiendaMercadoLibreProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))),
  );
  const filtered = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const handleAddToCart = useCallback((product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      );
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Quick view */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 6).map((product) => (
            <ProductCardCompact
              key={product.id}
              product={product}
              inCart={cart.some((item) => item.productId === product.id)}
              quantity={cart.find((item) => item.productId === product.id)?.quantity || 0}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>

        {/* Mini cart */}
        {cart.length > 0 && (
          <button
            onClick={() => onAddToQuote?.(cart)}
            className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-6 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/15"
          >
            <ShoppingCart className="h-4 w-4" />
            Añadir al presupuesto ({cartCount})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Tienda Mercado Libre</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {products.length} productos disponibles
          </p>
        </div>
        {cart.length > 0 && (
          <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-2">
            <p className="text-[11px] uppercase tracking-wider text-yellow-300">Carrito</p>
            <p className="mt-1 text-2xl font-black text-yellow-200">{cartCount}</p>
          </div>
        )}
      </div>

      {/* Filtros */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-yellow-400 text-zinc-950'
                : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-yellow-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Productos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            cartItem={cart.find((item) => item.productId === product.id)}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveFromCart}
          />
        ))}
      </div>

      {/* Carrito */}
      {cart.length > 0 && (
        <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <h4 className="text-sm font-bold text-white">Detalle del Carrito</h4>

          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-lg bg-white/5 p-3"
              >
                <div className="flex-1">
                  <p className="font-semibold text-white">{item.product.name}</p>
                  <p className="text-sm text-zinc-400">
                    {item.quantity}x {formatCLP(item.product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-right font-bold text-yellow-300">
                    {formatCLP(item.product.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => handleRemoveFromCart(item.productId)}
                    className="text-zinc-400 hover:text-red-400"
                    title="Eliminar del carrito"
                    aria-label="Eliminar del carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-400">Subtotal</span>
              <span className="text-lg font-bold text-white">{formatCLP(cartTotal)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-400">Total</span>
              <span className="text-2xl font-black text-yellow-300">{formatCLP(Math.round(cartTotal * 1.19))}</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAddToQuote?.(cart)}
              className="flex-1 rounded-lg border border-yellow-400/30 bg-yellow-400/10 py-3 font-semibold text-yellow-200 hover:bg-yellow-400/15"
            >
              Añadir a presupuesto
            </button>
            <button
              onClick={() => onCheckout?.(cart)}
              className="flex-1 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 py-3 font-semibold text-zinc-950 hover:from-yellow-300 hover:to-orange-300"
            >
              Finalizar compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  cartItem,
  onAddToCart,
  onUpdateQuantity,
  onRemove,
}: {
  product: StoreProduct;
  cartItem?: CartItem;
  onAddToCart: (product: StoreProduct) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10">
      {/* Imagen */}
      {product.image && (
        <div className="aspect-square overflow-hidden bg-white/5">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Nombre y rating */}
        <div>
          <h4 className="font-bold text-white">{product.name}</h4>
          {product.rating && (
            <p className="mt-1 text-sm text-zinc-400">
              ⭐ {product.rating.toFixed(1)} ({product.reviews} reseñas)
            </p>
          )}
        </div>

        {/* Descripción */}
        {product.description && (
          <p className="text-sm text-zinc-400 line-clamp-2">{product.description}</p>
        )}

        {/* Precio y stock */}
        <div>
          <p className="text-lg font-black text-yellow-300">{formatCLP(product.price)}</p>
          <p className={`text-xs ${isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
            {isOutOfStock
              ? 'Sin stock'
              : `${product.stock} disponibles`}
          </p>
        </div>

        {/* Acciones */}
        {cartItem ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
            <button
              onClick={() => onUpdateQuantity(product.id, cartItem.quantity - 1)}
              className="flex-1 p-1 text-zinc-400 hover:text-yellow-400"
              title="Reducir cantidad"
              aria-label="Reducir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-bold text-white">{cartItem.quantity}</span>
            <button
              onClick={() =>
                onUpdateQuantity(product.id, Math.min(cartItem.quantity + 1, product.stock))
              }
              className="flex-1 p-1 text-zinc-400 hover:text-yellow-400"
              disabled={cartItem.quantity >= product.stock}
              title="Aumentar cantidad"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRemove(product.id)}
              className="p-1 text-zinc-400 hover:text-red-400"
              title="Eliminar del carrito"
              aria-label="Eliminar del carrito"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 py-2 font-semibold text-zinc-950 hover:from-yellow-300 hover:to-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="inline-block h-4 w-4 mr-2" />
            Agregar
          </button>
        )}
      </div>
    </div>
  );
}

function ProductCardCompact({
  product,
  inCart,
  quantity,
  onAddToCart,
}: {
  product: StoreProduct;
  inCart: boolean;
  quantity: number;
  onAddToCart: (product: StoreProduct) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{product.name}</h4>
          <p className="mt-1 text-lg font-black text-yellow-300">{formatCLP(product.price)}</p>
        </div>
        {inCart && (
          <div className="rounded bg-yellow-400/20 px-2 py-1 text-xs font-bold text-yellow-300">
            {quantity}
          </div>
        )}
      </div>
      {!inCart && (
        <button
          onClick={() => onAddToCart(product)}
          className="mt-3 w-full rounded px-2 py-1 text-xs font-semibold bg-yellow-400/10 text-yellow-200 hover:bg-yellow-400/20"
        >
          +
        </button>
      )}
    </div>
  );
}
