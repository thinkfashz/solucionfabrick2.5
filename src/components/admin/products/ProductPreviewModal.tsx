'use client';

/* eslint-disable @next/next/no-img-element */
import { BadgeCheck, Check, ChevronRight, Package, ShieldCheck, ShoppingCart, Star, Truck, X } from 'lucide-react';
import type { ProductPublicFeature } from './ProductResearchPanel';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

type PreviewProduct = {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  price: number;
  comparePrice?: number;
  stock: number;
  active: boolean;
  featured: boolean;
  image: string;
};

type RelatedPreview = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
};

export default function ProductPreviewModal({
  open,
  onClose,
  product,
  gallery,
  features,
  related,
}: {
  open: boolean;
  onClose: () => void;
  product: PreviewProduct;
  gallery: string[];
  features: ProductPublicFeature[];
  related: RelatedPreview[];
}) {
  if (!open) return null;
  const images = Array.from(new Set([product.image, ...gallery].filter(Boolean)));

  return (
    <div className="fixed inset-0 z-[260] overflow-y-auto bg-[#0b0c0d]/82 p-2 backdrop-blur-lg sm:p-5">
      <div className="mx-auto min-h-full max-w-6xl overflow-hidden rounded-[1.8rem] bg-[#F4EFE6] text-[#111214] shadow-2xl">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-[#fffaf0]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">Vista previa privada</p><h2 className="truncate text-lg font-black">Ficha que verá el cliente</h2></div>
          <span className={`hidden rounded-full px-3 py-1.5 text-[9px] font-black uppercase sm:inline-flex ${product.active && product.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-black/8 text-black/45'}`}>{product.active && product.stock > 0 ? 'Lista para catálogo' : 'No publicada'}</span>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white"><X className="h-4 w-4" /></button>
        </header>

        <main className="p-3 sm:p-6">
          <div className="grid overflow-hidden rounded-[1.6rem] bg-white lg:grid-cols-[1.05fr_.95fr]">
            <section className="border-b border-black/8 lg:border-b-0 lg:border-r">
              <div className="relative aspect-square bg-[#f8f5ef] p-5">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-14 w-14 text-black/15" /></div>}{product.featured ? <span className="absolute left-4 top-4 rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase text-[#f5c75d]">Destacado</span> : null}</div>
              {images.length > 1 ? <div className="grid grid-cols-5 gap-2 border-t border-black/8 p-3">{images.slice(0, 5).map((image) => <div key={image} className="aspect-square overflow-hidden rounded-xl bg-[#f3eee6] p-1"><img src={image} alt="" className="h-full w-full object-contain" /></div>)}</div> : null}
            </section>

            <section className="p-5 sm:p-7 lg:p-8">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#B96F00]">{product.category}</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.045em] sm:text-4xl">{product.name || 'Producto sin nombre'}</h1>
              <p className="mt-3 text-sm leading-6 text-black/48">{product.tagline || 'Añade una frase comercial para presentar mejor este producto.'}</p>
              <div className="mt-5 flex items-end gap-3">{product.comparePrice && product.comparePrice > product.price ? <span className="pb-1 text-sm text-black/30 line-through">{CLP.format(product.comparePrice)}</span> : null}<b className="text-4xl tracking-[-.04em]">{CLP.format(product.price || 0)}</b></div>
              <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#F4EFE6] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">Stock</p><p className="mt-1 text-sm font-black">{product.stock > 0 ? `${product.stock} disponibles` : 'Sin stock'}</p></div><div className="rounded-xl bg-[#F4EFE6] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">Estado</p><p className="mt-1 text-sm font-black">{product.active && product.stock > 0 ? 'Visible' : 'Oculto'}</p></div></div>
              <button type="button" className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F5871F] text-sm font-black"><ShoppingCart className="h-5 w-5" />Comprar ahora</button>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><SmallTrust icon={<Truck />} text="Despacho coordinado" /><SmallTrust icon={<ShieldCheck />} text="Compra protegida" /><SmallTrust icon={<BadgeCheck />} text="Ficha revisada" /></div>
            </section>
          </div>

          <section className="mt-3 rounded-[1.6rem] bg-white p-5 sm:p-7"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">Descripción</p><p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-black/60">{product.description || 'La descripción todavía está vacía.'}</p>{features.length ? <div className="mt-6 grid gap-2 sm:grid-cols-2">{features.map((feature) => <div key={feature.label} className="grid grid-cols-[.8fr_1.2fr] gap-4 rounded-xl border border-black/8 p-3 text-xs"><span className="text-black/40">{feature.label}</span><b className="text-right">{feature.value}</b></div>)}</div> : null}</section>

          <section className="mt-3 rounded-[1.6rem] bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">Opiniones</p><h3 className="mt-1 text-xl font-black">Vista del bloque de comentarios</h3></div><div className="flex gap-1">{[1,2,3,4,5].map((value) => <Star key={value} className="h-4 w-4 text-black/12" />)}</div></div><div className="mt-4 rounded-2xl bg-[#F4EFE6] p-4 text-xs leading-6 text-black/45">Aquí aparecerán únicamente opiniones publicadas. Las destacadas tendrán prioridad visual y las respuestas de Soluciones Fabrick se mostrarán debajo de cada reseña.</div></section>

          {related.length ? <section className="mt-3 rounded-[1.6rem] bg-[#EEEDEB] p-5 sm:p-7"><div className="flex items-center justify-between"><h3 className="text-lg font-black">Productos relacionados</h3><ChevronRight className="h-5 w-5 text-black/25" /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{related.slice(0, 8).map((item) => <article key={item.id} className="overflow-hidden rounded-xl bg-white"><div className="aspect-square bg-[#f5f1ea] p-2">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-black/12" /></div>}</div><div className="p-3"><p className="line-clamp-2 min-h-8 text-[11px] font-black">{item.name}</p><p className="mt-2 text-sm font-black">{CLP.format(Number(item.price) || 0)}</p></div></article>)}</div></section> : null}
        </main>
      </div>
    </div>
  );
}

function SmallTrust({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-[10px] font-bold text-black/45"><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span><span>{text}</span></div>;
}
