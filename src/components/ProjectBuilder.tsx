'use client';

import { useMemo, useReducer, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Send,
  Hammer,
  Paintbrush,
  Zap,
  Wrench,
  PackageOpen,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type CategoryId = 'obra-gruesa' | 'terminaciones' | 'especialidades' | 'servicios';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;       // CLP
  image: string;       // public-folder path or remote URL allowed by next.config
  unit?: string;       // e.g. "m²", "u", "instalación"
  category: CategoryId;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

interface Category {
  id: CategoryId;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

/* -------------------------------------------------------------------------- */
/*  Catalog                                                                   */
/*  Replace these mocks with your CMS / DB feed when ready.                   */
/* -------------------------------------------------------------------------- */

const CATEGORIES: Category[] = [
  { id: 'obra-gruesa',    label: 'Obra Gruesa',    Icon: Hammer },
  { id: 'terminaciones',  label: 'Terminaciones',  Icon: Paintbrush },
  { id: 'especialidades', label: 'Especialidades', Icon: Zap },
  { id: 'servicios',      label: 'Servicios',      Icon: Wrench },
];

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0' stop-color='#18181b'/>
          <stop offset='1' stop-color='#0a0a0a'/>
        </linearGradient>
      </defs>
      <rect fill='url(#g)' width='600' height='400'/>
      <g fill='none' stroke='rgba(250,204,21,0.18)' stroke-width='1'>
        <path d='M0 320 L600 200'/>
        <path d='M0 360 L600 240'/>
        <path d='M120 0 L120 400'/>
        <path d='M480 0 L480 400'/>
      </g>
      <circle cx='300' cy='200' r='44' fill='rgba(250,204,21,0.12)' stroke='rgba(250,204,21,0.5)'/>
    </svg>`,
  );

const PRODUCTS: Product[] = [
  /* Obra Gruesa */
  {
    id: 'og-radier',
    category: 'obra-gruesa',
    name: 'Radier Reforzado',
    description: 'Losa de hormigón H30 con malla electrosoldada y film polietileno.',
    price: 38_500,
    unit: 'm²',
    image: PLACEHOLDER,
  },
  {
    id: 'og-panel-ext',
    category: 'obra-gruesa',
    name: 'Paneles Exteriores SIP',
    description: 'Paneles estructurales aislados, sello hermético y barrera de humedad.',
    price: 62_000,
    unit: 'm²',
    image: PLACEHOLDER,
  },
  {
    id: 'og-panel-int',
    category: 'obra-gruesa',
    name: 'Paneles Interiores',
    description: 'Tabiquería metálica liviana con doble plancha de yeso-cartón.',
    price: 28_900,
    unit: 'm²',
    image: PLACEHOLDER,
  },
  {
    id: 'og-kit-prefab',
    category: 'obra-gruesa',
    name: 'Kit Prefabricado 36 m²',
    description: 'Estructura llave en mano, certificada, instalación incluida.',
    price: 15_900_000,
    unit: 'kit',
    image: PLACEHOLDER,
  },

  /* Terminaciones */
  {
    id: 't-piso-spc',
    category: 'terminaciones',
    name: 'Piso SPC Premium',
    description: 'Piso vinílico click, alta resistencia al agua y tránsito.',
    price: 19_900,
    unit: 'm²',
    image: PLACEHOLDER,
  },
  {
    id: 't-ventana-pvc',
    category: 'terminaciones',
    name: 'Ventanas PVC Termopanel',
    description: 'Doble vidriado hermético, marco PVC, eficiencia térmica.',
    price: 145_000,
    unit: 'u',
    image: PLACEHOLDER,
  },
  {
    id: 't-forro-ext',
    category: 'terminaciones',
    name: 'Forro Exterior Siding',
    description: 'Revestimiento fibrocemento símil madera con pintura de fábrica.',
    price: 24_500,
    unit: 'm²',
    image: PLACEHOLDER,
  },
  {
    id: 't-forro-int',
    category: 'terminaciones',
    name: 'Forro Interior Volcanita',
    description: 'Plancha estándar 15 mm, junta invisible y pintura latex.',
    price: 16_800,
    unit: 'm²',
    image: PLACEHOLDER,
  },

  /* Especialidades */
  {
    id: 'e-electricidad',
    category: 'especialidades',
    name: 'Instalación Eléctrica',
    description: 'Tablero TGA, certificación SEC TE1, puntos según plano.',
    price: 1_290_000,
    unit: 'instalación',
    image: PLACEHOLDER,
  },
  {
    id: 'e-gasfiteria',
    category: 'especialidades',
    name: 'Gasfitería Completa',
    description: 'Red agua fría/caliente PPR, descargas PVC sanitario.',
    price: 1_490_000,
    unit: 'instalación',
    image: PLACEHOLDER,
  },
  {
    id: 'e-aire',
    category: 'especialidades',
    name: 'Aire Acondicionado Inverter',
    description: 'Split 12.000 BTU, frío/calor, instalación incluida.',
    price: 690_000,
    unit: 'equipo',
    image: PLACEHOLDER,
  },
  {
    id: 'e-internet',
    category: 'especialidades',
    name: 'Internet Satelital',
    description: 'Antena Starlink + instalación, ideal zonas rurales.',
    price: 480_000,
    unit: 'kit',
    image: PLACEHOLDER,
  },
  {
    id: 'e-camaras',
    category: 'especialidades',
    name: 'Cámaras de Seguridad 4K',
    description: 'Kit 4 cámaras IP, NVR 1TB, visión nocturna.',
    price: 720_000,
    unit: 'kit',
    image: PLACEHOLDER,
  },

  /* Servicios */
  {
    id: 's-ampliacion',
    category: 'servicios',
    name: 'Ampliación Estándar',
    description: 'Hasta 20 m² adicionales, integrados a vivienda existente.',
    price: 8_900_000,
    unit: 'proyecto',
    image: PLACEHOLDER,
  },
  {
    id: 's-remodelacion',
    category: 'servicios',
    name: 'Remodelación Integral',
    description: 'Diseño, demolición y terminaciones por especialidad.',
    price: 6_500_000,
    unit: 'proyecto',
    image: PLACEHOLDER,
  },
  {
    id: 's-muebles',
    category: 'servicios',
    name: 'Instalación de Muebles',
    description: 'Cocina y closets a medida, instalación profesional.',
    price: 1_850_000,
    unit: 'proyecto',
    image: PLACEHOLDER,
  },
];

/* -------------------------------------------------------------------------- */
/*  Cart reducer (Zustand-style API, but built on useReducer)                 */
/* -------------------------------------------------------------------------- */

type CartState = { lines: CartLine[] };

type CartAction =
  | { type: 'add'; product: Product }
  | { type: 'remove'; productId: string }
  | { type: 'increment'; productId: string }
  | { type: 'decrement'; productId: string }
  | { type: 'clear' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => l.product.id === action.product.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.product.id === action.product.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return { lines: [...state.lines, { product: action.product, quantity: 1 }] };
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.product.id !== action.productId) };
    case 'increment':
      return {
        lines: state.lines.map((l) =>
          l.product.id === action.productId ? { ...l, quantity: l.quantity + 1 } : l,
        ),
      };
    case 'decrement':
      return {
        lines: state.lines
          .map((l) =>
            l.product.id === action.productId ? { ...l, quantity: l.quantity - 1 } : l,
          )
          .filter((l) => l.quantity > 0),
      };
    case 'clear':
      return { lines: [] };
    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const IVA_RATE = 0.19;

function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export interface ProjectBuilderProps {
  /** Override the catalog (e.g. inject from CMS). */
  products?: Product[];
  /** Called when the user clicks the final CTA. */
  onSubmit?: (lines: CartLine[], totals: { subtotal: number; iva: number; total: number }) => void;
}

export default function ProjectBuilder({ products = PRODUCTS, onSubmit }: ProjectBuilderProps) {
  const [activeTab, setActiveTab] = useState<CategoryId>('obra-gruesa');
  const [cart, dispatch] = useReducer(cartReducer, { lines: [] as CartLine[] });

  const visibleProducts = useMemo(
    () => products.filter((p) => p.category === activeTab),
    [products, activeTab],
  );

  const totals = useMemo(() => {
    const subtotal = cart.lines.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [cart.lines]);

  const itemCount = cart.lines.reduce((n, l) => n + l.quantity, 0);

  const handleSubmit = () => {
    onSubmit?.(cart.lines, totals);
  };

  return (
    <section
      id="project-builder"
      aria-labelledby="project-builder-title"
      className="relative isolate overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black py-16 sm:py-24"
    >
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[60rem] max-w-full rounded-full bg-yellow-400/[0.06] blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Heading */}
        <div className="mb-10 text-center sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-yellow-400/90">
            <PackageOpen className="h-3.5 w-3.5" aria-hidden /> Configurador de proyecto
          </span>
          <h2
            id="project-builder-title"
            className="font-playfair mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl"
          >
            Arma tu Presupuesto{' '}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
              en tiempo real
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Selecciona materiales, especialidades y servicios. El total se actualiza al instante.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-10">
          {/* ────────────────────────────  LEFT (70%)  ──────────────────────────── */}
          <div className="lg:col-span-7">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Categorías del catálogo"
              className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 backdrop-blur-sm"
            >
              {CATEGORIES.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls={`panel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => setActiveTab(id)}
                    className={[
                      'group relative inline-flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 sm:text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                      active
                        ? 'bg-yellow-400 text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]'
                        : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Product grid */}
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              className="min-h-[400px]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {visibleProducts.map((product) => {
                    const inCart = cart.lines.some((l) => l.product.id === product.id);
                    return (
                      <article
                        key={product.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400/40 hover:shadow-[0_8px_30px_-12px_rgba(250,204,21,0.35)]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="(min-width:1280px) 25vw, (min-width:640px) 40vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            unoptimized
                          />
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                          />
                          {product.unit && (
                            <span className="absolute left-3 top-3 rounded-full border border-yellow-400/30 bg-black/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-yellow-300 backdrop-blur-sm">
                              por {product.unit}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="text-base font-semibold text-white">{product.name}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                            {product.description}
                          </p>

                          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                                Desde
                              </p>
                              <p className="text-lg font-bold text-yellow-400">
                                {formatCLP(product.price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'add', product })}
                              aria-label={`Añadir ${product.name} al presupuesto`}
                              className={[
                                'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                                inCart
                                  ? 'border border-yellow-400/40 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20'
                                  : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(250,204,21,0.45)]',
                              ].join(' ')}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                              {inCart ? 'Añadir otro' : 'Añadir'}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {visibleProducts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-500">
                  No hay productos en esta categoría todavía.
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────────  RIGHT (30%)  ─────────────────────────── */}
          <aside aria-labelledby="cart-title" className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-yellow-400/20 bg-gradient-to-b from-zinc-950 to-black shadow-[0_8px_40px_-12px_rgba(250,204,21,0.25)]">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-yellow-400/[0.04] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-yellow-400" aria-hidden />
                    <h3 id="cart-title" className="text-sm font-bold uppercase tracking-wider text-white">
                      Tu Proyecto
                    </h3>
                  </div>
                  <span
                    aria-label={`${itemCount} ítems`}
                    className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-[11px] font-bold text-black"
                  >
                    {itemCount}
                  </span>
                </div>

                {/* Lines */}
                <div className="max-h-[420px] overflow-y-auto px-2 py-2">
                  {cart.lines.length === 0 ? (
                    <div className="px-3 py-10 text-center text-sm text-zinc-500">
                      <PackageOpen className="mx-auto mb-3 h-8 w-8 text-zinc-700" aria-hidden />
                      Aún no has añadido ítems.
                      <br />
                      Empieza por <span className="text-yellow-400/90">Obra Gruesa</span>.
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      <AnimatePresence initial={false}>
                        {cart.lines.map(({ product, quantity }) => (
                          <motion.li
                            key={product.id}
                            layout
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 px-3 py-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {product.name}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {formatCLP(product.price)}
                                {product.unit ? ` / ${product.unit}` : ''}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dispatch({ type: 'decrement', productId: product.id })
                                    }
                                    aria-label={`Disminuir cantidad de ${product.name}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                                  >
                                    <Minus className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                  <span
                                    aria-live="polite"
                                    className="min-w-[1.5rem] text-center text-xs font-semibold text-white"
                                  >
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dispatch({ type: 'increment', productId: product.id })
                                    }
                                    aria-label={`Aumentar cantidad de ${product.name}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                                  >
                                    <Plus className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    dispatch({ type: 'remove', productId: product.id })
                                  }
                                  aria-label={`Eliminar ${product.name} del presupuesto`}
                                  className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>
                            </div>

                            <p className="whitespace-nowrap text-sm font-semibold text-yellow-400">
                              {formatCLP(product.price * quantity)}
                            </p>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-1.5 border-t border-white/10 bg-black/40 px-5 py-4 text-sm">
                  <Row label="Subtotal" value={formatCLP(totals.subtotal)} />
                  <Row label="IVA (19%)" value={formatCLP(totals.iva)} muted />
                  <div className="my-2 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                      Total estimado
                    </span>
                    <span className="text-2xl font-bold text-white">
                      {formatCLP(totals.total)}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-2 border-t border-white/10 px-5 py-4">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={cart.lines.length === 0}
                    className="group inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-[0_8px_30px_-8px_rgba(250,204,21,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                    Solicitar Evaluación Técnica
                  </button>
                  {cart.lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'clear' })}
                      className="w-full text-center text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      Vaciar presupuesto
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 px-1 text-[11px] leading-relaxed text-zinc-500">
                * Valores referenciales. La evaluación técnica final puede ajustar precios según
                terreno, ubicación y especificaciones.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small subcomponents                                                       */
/* -------------------------------------------------------------------------- */

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={muted ? 'text-zinc-500' : 'text-zinc-300'}>{label}</span>
      <span className={muted ? 'text-zinc-400' : 'font-semibold text-white'}>{value}</span>
    </div>
  );
}
