'use client';

import { useMemo, useReducer, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Hammer,
  Minus,
  Paintbrush,
  PackageOpen,
  Plus,
  Send,
  ShoppingCart,
  Trash2,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type CategoryId = 'obra-gruesa' | 'terminaciones' | 'especialidades' | 'servicios';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  unit?: string;
  category: CategoryId;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

type Category = { id: CategoryId; label: string; hint: string; Icon: LucideIcon };

const CATEGORIES: Category[] = [
  { id: 'obra-gruesa', label: 'Estructura y kits', hint: 'Base, radier y estructura', Icon: Hammer },
  { id: 'terminaciones', label: 'Terminaciones', hint: 'Pisos, muros y revestimientos', Icon: Paintbrush },
  { id: 'especialidades', label: 'Instalaciones', hint: 'Redes y climatización', Icon: Zap },
  { id: 'servicios', label: 'Servicios', hint: 'Montaje y obras complementarias', Icon: Wrench },
];

const SEED_CATALOG: Product[] = [
  { id: 'seed-radier', category: 'obra-gruesa', name: 'Radier 10 cm', description: 'Preparación base, malla y hormigón afinado para una superficie estándar.', price: 35000, unit: 'm²', image: '' },
  { id: 'seed-kit-basic', category: 'obra-gruesa', name: 'Kit prefabricado básico', description: 'Paneles por una cara, cerchas, costaneras y zinc 0,35 mm.', price: 195000, unit: 'm²', image: '' },
  { id: 'seed-kit-advanced', category: 'obra-gruesa', name: 'Kit prefabricado avanzado', description: 'Kit base más ventanas, puertas, forro interior, cielos y puntos eléctricos.', price: 390000, unit: 'm²', image: '' },
  { id: 'seed-panel', category: 'obra-gruesa', name: 'Estructura Metalcon', description: 'Tabiquería y estructura liviana según modulación del proyecto.', price: 59000, unit: 'm²', image: '' },
  { id: 'seed-ceramica', category: 'terminaciones', name: 'Instalación de cerámica', description: 'Trazado, adhesivo, fragüe, cortes y remates simples.', price: 40000, unit: 'm²', image: '' },
  { id: 'seed-siding', category: 'terminaciones', name: 'Revestimiento siding', description: 'Siding y perfilería sobre una base preparada para proteger la fachada.', price: 45000, unit: 'm²', image: '' },
  { id: 'seed-pintura', category: 'terminaciones', name: 'Pintura dos capas', description: 'Preparación básica y aplicación interior o exterior.', price: 8500, unit: 'm²', image: '' },
  { id: 'seed-floor', category: 'terminaciones', name: 'Piso laminado', description: 'Manta, instalación de palmetas y encuentros básicos.', price: 18000, unit: 'm²', image: '' },
  { id: 'seed-air', category: 'especialidades', name: 'Instalación aire acondicionado split', description: 'Montaje de unidades, recorrido estándar y prueba de funcionamiento.', price: 305000, unit: 'unidad', image: '' },
  { id: 'seed-electric', category: 'especialidades', name: 'Punto eléctrico', description: 'Caja, canalización corta, cableado y mecanismo estándar.', price: 37500, unit: 'punto', image: '' },
  { id: 'seed-plumbing', category: 'especialidades', name: 'Punto de agua', description: 'Conexión definida, prueba y terminación visible estándar.', price: 82500, unit: 'punto', image: '' },
  { id: 'seed-septic', category: 'especialidades', name: 'Fosa séptica', description: 'Solución sanitaria referencial según capacidad y factibilidad.', price: 3000000, unit: 'unidad', image: '' },
  { id: 'seed-mount', category: 'servicios', name: 'Instalación de kit prefabricado', description: 'Armado y aplome básico de un kit sobre fundación aprobada.', price: 90000, unit: 'm²', image: '' },
  { id: 'seed-roof', category: 'servicios', name: 'Instalación de techumbre', description: 'Cubierta, fijaciones y remates para una estructura validada.', price: 47500, unit: 'm²', image: '' },
  { id: 'seed-fence', category: 'servicios', name: 'Cierre perimetral', description: 'Trazado, postes y cierre según material y condiciones del terreno.', price: 70000, unit: 'ml', image: '' },
  { id: 'seed-remodel', category: 'servicios', name: 'Remodelación integral', description: 'Referencia para partidas coordinadas en un espacio existente.', price: 380000, unit: 'm²', image: '' },
  { id: 'seed-turnkey', category: 'servicios', name: 'Llave en mano estándar', description: 'Terminaciones y redes interiores preparadas para conectar.', price: 660000, unit: 'm²', image: '' },
];

type CartState = { lines: CartLine[] };
type CartAction =
  | { type: 'add'; product: Product }
  | { type: 'remove'; id: string }
  | { type: 'increase'; id: string }
  | { type: 'decrease'; id: string }
  | { type: 'clear' };

function cartReducer(state: CartState, action: CartAction): CartState {
  const lines = state.lines;
  if (action.type === 'add') {
    const match = lines.find((line) => line.product.id === action.product.id);
    return match
      ? { lines: lines.map((line) => line.product.id === action.product.id ? { ...line, quantity: line.quantity + 1 } : line) }
      : { lines: [...lines, { product: action.product, quantity: 1 }] };
  }
  if (action.type === 'remove') return { lines: lines.filter((line) => line.product.id !== action.id) };
  if (action.type === 'increase') return { lines: lines.map((line) => line.product.id === action.id ? { ...line, quantity: line.quantity + 1 } : line) };
  if (action.type === 'decrease') return { lines: lines.map((line) => line.product.id === action.id ? { ...line, quantity: line.quantity - 1 } : line).filter((line) => line.quantity > 0) };
  return { lines: [] };
}

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatCLP = (value: number) => money.format(Math.round(value || 0));

function categoryIcon(category: CategoryId) {
  return (CATEGORIES.find((item) => item.id === category) || CATEGORIES[0]).Icon;
}

function normalName(value: string) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function mergeCatalog(fromCms?: Product[]) {
  const live = fromCms || [];
  const known = new Set(live.map((item) => normalName(item.name)));
  return [...live, ...SEED_CATALOG.filter((item) => !known.has(normalName(item.name)))];
}

export interface ProjectBuilderProps {
  products?: Product[];
  onSubmit?: (lines: CartLine[], totals: { subtotal: number; iva: number; total: number }) => void;
}

export default function ProjectBuilder({ products, onSubmit }: ProjectBuilderProps) {
  const catalog = useMemo(() => mergeCatalog(products), [products]);
  const [tab, setTab] = useState<CategoryId>('obra-gruesa');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [cart, dispatch] = useReducer(cartReducer, { lines: [] });
  const visible = useMemo(() => catalog.filter((item) => item.category === tab), [catalog, tab]);
  const focused = visible.find((item) => item.id === focusedId) || visible[0] || catalog[0];
  const count = cart.lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  const FocusIcon = focused ? categoryIcon(focused.category) : Hammer;

  function changeTab(next: CategoryId) {
    setTab(next);
    setFocusedId(null);
  }

  function finish() {
    if (cart.lines.length) onSubmit?.(cart.lines, { subtotal, iva, total });
  }

  return (
    <section id="project-builder" aria-labelledby="project-builder-title" className="relative isolate overflow-hidden bg-[#080806] px-4 pb-32 pt-12 text-white sm:px-6 sm:pt-16 lg:px-8 lg:pb-20">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.027)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.027)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(250,204,21,.14),transparent_25rem),radial-gradient(circle_at_6%_88%,rgba(249,115,22,.1),transparent_28rem)]" />
      <div className="relative mx-auto max-w-[1200px]">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-yellow-300/[.10] px-4 py-2 text-[10px] font-black uppercase tracking-[.23em] text-yellow-200 ring-1 ring-yellow-300/25"><PackageOpen className="h-3.5 w-3.5" /> Configurador de proyecto</p>
          <h2 id="project-builder-title" className="mt-4 text-3xl font-black tracking-[-.06em] sm:text-5xl">Elige partidas y mira cómo se construye tu presupuesto.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">Usa este visor para sumar materiales y servicios. Los valores son referencias netas; el detalle final se valida antes de iniciar la obra.</p>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="min-w-0">
            <div role="tablist" aria-label="Tipo de partida" className="fabrick-tabs flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(({ id, label, hint, Icon }) => {
                const active = tab === id;
                return <button key={id} role="tab" type="button" aria-selected={active} onClick={() => changeTab(id)} className={active ? 'flex w-[164px] shrink-0 items-center gap-3 rounded-2xl bg-yellow-300 px-3.5 py-3 text-left text-black shadow-[0_12px_30px_rgba(250,204,21,.2)]' : 'flex w-[164px] shrink-0 items-center gap-3 rounded-2xl bg-white/[.055] px-3.5 py-3 text-left text-white/68 transition hover:bg-white/[.09]'}>
                  <Icon className="h-5 w-5 shrink-0" /><span className="min-w-0"><b className="block text-xs font-black">{label}</b><span className={active ? 'mt-0.5 block truncate text-[9px] font-bold text-black/58' : 'mt-0.5 block truncate text-[9px] font-bold text-white/40'}>{hint}</span></span>
                </button>;
              })}
            </div>

            <div role="tabpanel" className="fabrick-tabs mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible">
              <AnimatePresence mode="popLayout">
                {visible.map((product) => {
                  const ProductIcon = categoryIcon(product.category);
                  const selected = product.id === focused?.id;
                  const inCart = cart.lines.find((line) => line.product.id === product.id);
                  return (
                    <motion.article key={product.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }} onClick={() => setFocusedId(product.id)} className={selected ? 'flex w-[258px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.45rem] bg-[linear-gradient(145deg,rgba(250,204,21,.2),rgba(255,255,255,.07))] p-4 ring-1 ring-yellow-300/45 lg:w-auto' : 'flex w-[258px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.45rem] bg-white/[.055] p-4 ring-1 ring-white/10 transition hover:bg-white/[.08] lg:w-auto'}>
                      <div className="flex items-start justify-between gap-3"><span className={selected ? 'grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black' : 'grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300/12 text-yellow-300'}><ProductIcon className="h-5 w-5" /></span><span className="rounded-full bg-black/25 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-yellow-100/85">por {product.unit || 'unidad'}</span></div>
                      <h3 className="mt-5 text-base font-black tracking-[-.035em]">{product.name}</h3>
                      <p className="mt-2 min-h-10 text-xs leading-5 text-white/57">{product.description}</p>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3"><div><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/36">Referencia neta</p><b className="mt-1 block text-lg text-yellow-200">{formatCLP(product.price)}</b></div><button type="button" onClick={(event) => { event.stopPropagation(); dispatch({ type: 'add', product }); }} className={inCart ? 'inline-flex min-h-10 items-center gap-1 rounded-xl bg-yellow-300/15 px-3 text-[11px] font-black text-yellow-200 ring-1 ring-yellow-300/30' : 'inline-flex min-h-10 items-center gap-1 rounded-xl bg-yellow-300 px-3 text-[11px] font-black text-black transition hover:bg-white'}><Plus className="h-3.5 w-3.5" /> {inCart ? 'Sumar' : 'Añadir'}</button></div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-[1.7rem] bg-[#11100d]/93 shadow-[0_22px_65px_rgba(0,0,0,.44)] ring-1 ring-yellow-200/15 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">Visor de proyecto</p><h3 className="mt-1 text-lg font-black">Tu selección activa</h3></div><span className="grid h-10 min-w-10 place-items-center rounded-full bg-yellow-300 px-2 text-sm font-black text-black">{count}</span></div>
              {focused && <div className="p-5"><div className="relative grid min-h-[156px] place-items-center overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(250,204,21,.18),rgba(255,255,255,.035))]"><div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:26px_26px]" /><div className="relative grid h-20 w-20 place-items-center rounded-[1.7rem] bg-[#0c0b08] text-yellow-300 shadow-[0_16px_40px_rgba(0,0,0,.45)] ring-1 ring-yellow-300/25"><FocusIcon className="h-9 w-9" /></div><div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.13em] text-yellow-100">Partida seleccionada</div></div>
                <h4 className="mt-4 text-lg font-black tracking-[-.04em]">{focused.name}</h4><p className="mt-2 text-xs leading-5 text-white/56">{focused.description}</p><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-xs text-white/48">Valor de referencia</span><b className="text-lg text-yellow-200">{formatCLP(focused.price)} <span className="text-xs">/ {focused.unit || 'unidad'}</span></b></div></div>}
              <div className="border-t border-white/10 bg-black/20 px-5 py-4"><p className="flex items-center gap-2 text-xs font-bold text-white/72"><Check className="h-4 w-4 text-yellow-300" /> Toca otra tarjeta para cambiar la partida del visor.</p></div>
            </section>
          </aside>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <article className="overflow-hidden rounded-[1.7rem] bg-[#11100d]/90 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><div className="flex items-center gap-2"><ShoppingCart className="h-4.5 w-4.5 text-yellow-300" /><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-300">Tu proyecto</p><h3 className="mt-0.5 text-lg font-black">Partidas y servicios añadidos</h3></div></div><span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-black">{count}</span></div>
            <div className="max-h-[340px] overflow-y-auto p-3">
              {cart.lines.length ? <div className="space-y-2">{cart.lines.map((line) => <CartRow key={line.product.id} line={line} onIncrease={() => dispatch({ type: 'increase', id: line.product.id })} onDecrease={() => dispatch({ type: 'decrease', id: line.product.id })} onRemove={() => dispatch({ type: 'remove', id: line.product.id })} />)}</div> : <div className="grid min-h-[170px] place-items-center px-5 text-center"><div><PackageOpen className="mx-auto h-9 w-9 text-yellow-300/45" /><p className="mt-3 text-sm font-bold text-white/65">Aún no sumas partidas.</p><p className="mt-1 text-xs leading-5 text-white/42">Selecciona una tarjeta y pulsa “Añadir”. El total se actualizará aquí.</p></div></div>}
            </div>
          </article>

          <aside className="rounded-[1.7rem] bg-[linear-gradient(145deg,#facc15,#f6a61a)] p-5 text-black shadow-[0_20px_55px_rgba(250,204,21,.16)]"><p className="text-[10px] font-black uppercase tracking-[.2em] text-black/58">Resumen referencial</p><div className="mt-5 space-y-2 border-y border-black/15 py-4 text-sm"><SummaryRow label="Subtotal neto" value={formatCLP(subtotal)} /><SummaryRow label="IVA 19%" value={formatCLP(iva)} /></div><div className="mt-4 flex items-end justify-between gap-3"><span className="text-xs font-bold text-black/64">Total estimado</span><b className="text-2xl font-black tracking-[-.06em]">{formatCLP(total)}</b></div><button type="button" onClick={finish} disabled={!cart.lines.length} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 text-sm font-black text-yellow-200 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35"><Send className="h-4 w-4" /> Solicitar evaluación</button><p className="mt-3 text-[10px] leading-4 text-black/55">No es una cotización final. Los valores se revisan por ubicación, acceso, materiales y condiciones de obra.</p></aside>
        </section>
      </div>
      <style jsx>{'.fabrick-tabs::-webkit-scrollbar{display:none}.fabrick-tabs{scrollbar-width:none}'}</style>
    </section>
  );
}

function CartRow({ line, onIncrease, onDecrease, onRemove }: { line: CartLine; onIncrease: () => void; onDecrease: () => void; onRemove: () => void }) {
  const Icon = categoryIcon(line.product.category);
  return <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -8 }} className="flex items-center gap-3 rounded-2xl bg-white/[.05] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellow-300/10 text-yellow-300"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{line.product.name}</p><p className="mt-0.5 text-[11px] text-white/45">{formatCLP(line.product.price)} / {line.product.unit || 'unidad'}</p><div className="mt-2 inline-flex items-center rounded-xl bg-black/35 p-0.5"><button type="button" onClick={onDecrease} aria-label="Disminuir cantidad" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/10"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-7 text-center text-xs font-black">{line.quantity}</span><button type="button" onClick={onIncrease} aria-label="Aumentar cantidad" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/10"><Plus className="h-3.5 w-3.5" /></button></div></div><div className="self-stretch text-right"><p className="text-sm font-black text-yellow-200">{formatCLP(line.product.price * line.quantity)}</p><button type="button" onClick={onRemove} aria-label="Quitar partida" className="mt-3 inline-grid h-7 w-7 place-items-center rounded-full text-white/40 hover:bg-red-500/15 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div></motion.div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="font-bold text-black/60">{label}</span><b>{value}</b></div>;
}
