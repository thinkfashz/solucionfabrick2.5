'use client';

import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';

const CLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export default function TiendaSection() {
  const { products, loading, connected, lastEvent } = useRealtimeProducts();

  return (
    <section id="tienda" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <p className="text-yellow-400/70 text-xs tracking-[0.4em] uppercase font-semibold mb-4">Catálogo de Soluciones</p>
        <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white">
          Adquirir<span className="shimmer-gold"> Materiales</span>
        </h2>
        <p className="text-white/40 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
          Revestimientos de categoría premium y accesorios certificados. Precios actualizados en tiempo real.
        </p>

        {/* Indicador real-time */}
        <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full glass text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-white/40">
            {connected ? 'Precios en tiempo real' : 'Conectando...'}
            {lastEvent && ` · Último update: ${lastEvent.product.name?.split(' ').slice(0,2).join(' ')}`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-4xl bg-white/5 h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.slice(0, 6).map((prod) => (
            <div key={prod.id} className="card-3d glass-card rounded-4xl overflow-hidden group relative">
              {/* Imagen real desde Unsplash */}
              <div className="relative h-44 bg-white/5 overflow-hidden">
                {prod.image_url ? (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-playfair text-4xl font-bold text-yellow-400/20 tracking-widest">FBK</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {prod.featured && (
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold tracking-wider">
                    ★ Destacado
                  </span>
                )}
                {prod.discount_percentage && Number(prod.discount_percentage) > 0 && (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                    -{prod.discount_percentage}%
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div>
                  <p className="text-yellow-400/60 text-xs tracking-[0.25em] uppercase mb-1">
                    {prod.delivery_days ?? 'Stock disponible'}
                  </p>
                  <h3 className="text-white font-semibold text-base leading-snug">{prod.name}</h3>
                  {prod.rating && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {'★'.repeat(Math.round(Number(prod.rating))).split('').map((s, i) => (
                        <span key={i} className="text-yellow-400 text-xs">{s}</span>
                      ))}
                      <span className="text-white/30 text-xs ml-1">{prod.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/5">
                  <div>
                    <p className="text-yellow-400 font-bold text-xl font-playfair">{CLP(prod.price)}</p>
                    {prod.specifications && (
                      <p className="text-white/30 text-xs mt-0.5">
                        por {(prod.specifications as Record<string, string>)['unidad'] ?? 'unidad'}
                      </p>
                    )}
                  </div>
                  <button className="px-5 py-2.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold tracking-wider hover:bg-yellow-400 hover:text-black transition-all duration-300">
                    Adquirir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <a
          href="/sync"
          className="inline-flex items-center gap-3 px-8 py-3 rounded-full border border-yellow-400/25 text-yellow-400/70 text-sm hover:border-yellow-400/60 hover:text-yellow-400 transition-all duration-300"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Panel de Sincronización en Tiempo Real
        </a>
      </div>
    </section>
  );
}
