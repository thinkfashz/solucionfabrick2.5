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

  return (
    <>
      <AlbumSpinViewer assets={assets} onOpen={setSelected} quoteHref={quoteUrl} />
      {selected ? (
        <div className="fixed inset-0 z-[500] grid place-items-center bg-[#08090A]/94 p-3 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" onClick={() => setSelected(null)} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-[#FFF9EE] text-[#08090A]" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          <button type="button" disabled={!previous} onClick={() => previous && setSelected(previous)} className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#FFF9EE]/92 text-[#08090A] disabled:hidden" aria-label="Imagen anterior"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" disabled={!next} onClick={() => next && setSelected(next)} className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#FFF9EE]/92 text-[#08090A] disabled:hidden" aria-label="Imagen siguiente"><ChevronRight className="h-5 w-5" /></button>
          <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#FFF9EE] shadow-2xl lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-h-0 bg-[#101117]"><img src={selected.url} alt={selected.alt || selected.title} className="h-full max-h-[94vh] w-full object-contain" /></div>
            <aside className="grid content-between gap-6 overflow-y-auto p-6 text-[#08090A]">
              <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#F5871F]">{selected.album_title} · imagen {index + 1}</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em]">{selected.title}</h2><p className="mt-4 text-sm leading-7 text-[#BFB8AC]">{selected.description || 'Referencia visual para analizar estilo, distribución, materiales visibles y terminaciones.'}</p><div className="mt-5 flex flex-wrap gap-2">{selected.tags?.slice(0, 8).map((tag) => <span key={tag} className="rounded-full bg-[#F2DFBB] px-3 py-1.5 text-[10px] font-black text-[#BFB8AC]">#{tag}</span>)}</div></div>
              <a href={quoteUrl(selected)} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#08090A] px-5 text-sm font-black text-[#FFF9EE]">Cotizar una idea parecida <MessageCircle className="h-4 w-4" /></a>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
