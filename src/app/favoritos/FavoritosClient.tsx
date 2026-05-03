'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Heart, Loader2, ShoppingCart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import ProductCard from '@/components/store/ProductCard';

export default function FavoritosClient() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favLoading, isAuthed } = useFavorites();
  const { products, loading: productsLoading } = useRealtimeProducts();
  const { addToCart, openCart } = useCartContext();

  const list = useMemo(
    () => products.filter((p) => favorites.has(p.id)),
    [products, favorites],
  );

  const loading = authLoading || favLoading || productsLoading;

  return (
    <main className="min-h-screen bg-black px-6 py-24 md:px-12 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-yellow-400/70">
              Mi cuenta
            </p>
            <h1 className="font-playfair text-3xl md:text-4xl">Mis favoritos</h1>
            <p className="mt-2 max-w-xl text-sm text-white/40">
              Productos guardados desde la tienda. Solo aparecen aquí cuando inicias
              sesión como cliente registrado.
            </p>
          </div>
          <Link
            href="/tienda"
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs uppercase tracking-widest hover:border-yellow-400/50 hover:text-yellow-300 transition"
          >
            Volver a la tienda
          </Link>
        </header>

        {!isAuthed && !loading ? (
          <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-yellow-400" />
            <h2 className="mt-3 font-playfair text-xl">Inicia sesión para ver tus favoritos</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
              Los favoritos se guardan asociados a tu cuenta para que los recuperes desde
              cualquier dispositivo.
            </p>
            <Link
              href="/login?redirect=/favoritos"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-yellow-300"
            >
              Iniciar sesión
            </Link>
          </section>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-white/40">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando tus favoritos…
          </div>
        ) : list.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-white/30" />
            <h2 className="mt-3 font-playfair text-xl text-white/80">
              Aún no tienes productos guardados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
              Toca el corazón en cualquier producto para guardarlo y volver luego.
            </p>
            <Link
              href="/tienda"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-yellow-300"
            >
              <ShoppingCart className="h-4 w-4" />
              Explorar la tienda
            </Link>
          </section>
        ) : (
          <section
            aria-label={`${list.length} producto${list.length === 1 ? '' : 's'} en favoritos`}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {list.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) => {
                  addToCart(prod);
                  openCart();
                }}
              />
            ))}
          </section>
        )}

        {user && list.length > 0 && (
          <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-white/30">
            {list.length} producto{list.length === 1 ? '' : 's'} guardado
            {list.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </main>
  );
}
