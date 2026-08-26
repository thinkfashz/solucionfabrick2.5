'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, X } from 'lucide-react';
import AlbumSpinViewer, { type SpinAlbumAsset } from '@/components/proyectos/AlbumSpinViewer';

const WHATSAPP_PHONE = '56930121625';
function quoteUrl(asset: SpinAlbumAsset) {
  const text = `Hola Soluciones Fabrick, vi ${asset.title} en el álbum ${asset.album_title} y quiero conversar sobre una solución parecida para mi espacio.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

export default function AlbumExperience({ assets }: { assets: SpinAlbumAsset[] }) {
  const [selected, setSelected] = useState<SpinAlbumAsset | null>(null);
  const index = selected ? assets.findIndex((asset) => asset.id === selected.id) : -1;
  const previous = index > 0 ? assets[index - 1] : null;
  const next = index >= 0 && index < assets.length - 1 ? assets[index + 1] : null;

  return <>
    <AlbumSpinViewer assets={assets} onOpen={setSelected} quoteHref={quoteUrl}/>
    {selected ? <div className="fixed inset-0 z-[500] bg-[#0B0C0D] sm:grid sm:place-items-center sm:p-3 sm:backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={selected.title}>
      <button type="button" onClick={()=>setSelected(null)} className="absolute right-3 top-[calc(.75rem+env(safe-area-inset-top))] z-30 grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-lg sm:right-5 sm:top-5" aria-label="Cerrar"><X className="h-5 w-5"/></button>
      <button type="button" disabled={!previous} onClick={()=>previous&&setSelected(previous)} className="absolute left-2 top-[34dvh] z-30 grid h-11 w-11 place-items-center rounded-full bg-white/92 text-black shadow-lg disabled:hidden sm:left-5 sm:top-1/2 sm:-translate-y-1/2" aria-label="Imagen anterior"><ChevronLeft className="h-5 w-5"/></button>
      <button type="button" disabled={!next} onClick={()=>next&&setSelected(next)} className="absolute right-2 top-[34dvh] z-30 grid h-11 w-11 place-items-center rounded-full bg-white/92 text-black shadow-lg disabled:hidden sm:right-5 sm:top-1/2 sm:-translate-y-1/2" aria-label="Imagen siguiente"><ChevronRight className="h-5 w-5"/></button>

      <div className="grid h-[100dvh] w-full grid-rows-[58dvh_42dvh] overflow-hidden bg-[#F4EFE6] sm:max-h-[94vh] sm:max-w-6xl sm:grid-rows-none sm:rounded-[2rem] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-0 bg-[#0B0C0D]"><img src={selected.url} alt={selected.alt || selected.title} className="h-full w-full object-contain"/><span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1.5 text-[9px] font-black text-white backdrop-blur">{index + 1} / {assets.length}</span></div>
        <aside className="flex min-h-0 flex-col overflow-y-auto bg-[#F4EFE6] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#111214] sm:p-6">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">{selected.album_title} · referencia {index + 1}</p><h2 className="mt-2 text-2xl font-black leading-[.98] tracking-[-.04em] sm:text-3xl">{selected.title}</h2><p className="mt-3 text-xs leading-6 text-black/48 sm:text-sm sm:leading-7">{selected.description || 'Referencia visual para analizar estilo, distribución, materiales visibles y terminaciones.'}</p><div className="mt-4 flex flex-wrap gap-1.5">{selected.tags?.slice(0,8).map((tag)=><span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-black/45 ring-1 ring-black/5">#{tag}</span>)}</div></div>
          <a href={quoteUrl(selected)} target="_blank" rel="noreferrer" className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black text-black">Cotizar una idea parecida <MessageCircle className="h-4 w-4"/></a>
        </aside>
      </div>
    </div>:null}
  </>;
}
