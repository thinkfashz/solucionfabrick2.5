'use client';

import { useMemo, useState } from 'react';
import { Box, ChevronLeft, ChevronRight, Download, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import type { PresupuestoPro } from '@/lib/presupuestosBuilder';

function fileExt(url: string, fallback = '') {
  return (fallback || url.split('?')[0].split('.').pop() || '').toLowerCase();
}

export default function PresupuestoMixedAlbum({ presupuesto }: { presupuesto: PresupuestoPro }) {
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const images = useMemo(() => [...(presupuesto.imagenes || [])].filter((img) => img.url).sort((a, b) => a.orden - b.orden), [presupuesto.imagenes]);
  const model = useMemo(() => [...(presupuesto.archivos || [])].filter((file) => file.mostrar_cliente !== false && file.url && ['glb', 'gltf'].includes(fileExt(file.url, file.formato))).sort((a, b) => a.orden - b.orden)[0] || null, [presupuesto.archivos]);

  if (!images.length && !model) return null;

  const active = activeImage !== null ? images[activeImage] : null;
  const nextImage = () => setActiveImage((current) => (current === null ? 0 : (current + 1) % images.length));
  const prevImage = () => setActiveImage((current) => (current === null ? 0 : (current - 1 + images.length) % images.length));
  const ext = model ? fileExt(model.url, model.formato).toUpperCase() : '';
  const viewerLink = model ? `/presupuestos/visor-3d?model=${encodeURIComponent(model.url)}&name=${encodeURIComponent(model.nombre || 'Modelo 3D del proyecto')}` : '';

  return (
    <section className="mx-auto w-full max-w-7xl overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 text-white shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-6 lg:p-8 print:hidden">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Álbum del proyecto</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Imágenes y visor técnico</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">Visualiza las referencias del proyecto. El visor 3D aparece solo cuando está activo desde el admin.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300">{images.length} imágenes · {model ? '1 visor activo' : 'visor off'}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((img, index) => (
          <button key={img.id || img.url} onClick={() => setActiveImage(index)} className="group w-full overflow-hidden rounded-3xl border border-white/10 bg-black text-left transition hover:-translate-y-1 hover:border-yellow-400/50">
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
              <img src={img.url} alt={img.titulo || 'Imagen del presupuesto'} className="h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.02]" loading="lazy" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <ImageIcon className="absolute right-3 top-3 h-5 w-5 text-white/70" />
            </div>
            <div className="p-4">
              <b className="line-clamp-2 text-sm text-white">{img.titulo || `Imagen ${index + 1}`}</b>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{img.descripcion}</p>
            </div>
          </button>
        ))}

        {model && (
          <article className="group flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl border border-yellow-400/20 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.16),transparent_42%),#050505] p-5 transition hover:-translate-y-1 hover:border-yellow-400/60">
            <div>
              <div className="mb-4 inline-flex rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-yellow-200"><Box className="h-7 w-7" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Visor 3D activo · {ext}</p>
              <h3 className="mt-2 line-clamp-2 text-xl font-black text-white">{model.nombre || 'Modelo 3D del proyecto'}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-400">{model.descripcion || 'Modelo técnico asociado al presupuesto. Se abre en una página aislada para no afectar la propuesta.'}</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a href={viewerLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-xs font-black text-black hover:bg-yellow-300"><ExternalLink className="h-4 w-4" />Abrir visor</a>
              <a href={model.url} target="_blank" rel="noreferrer" download className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-white hover:border-yellow-400/40"><Download className="h-4 w-4" />Descargar</a>
            </div>
          </article>
        )}
      </div>

      {active && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur" role="dialog" aria-modal="true"><button onClick={() => setActiveImage(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400"><X className="h-5 w-5" /></button>{images.length > 1 && <button onClick={prevImage} className="absolute left-2 top-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400 sm:left-3 sm:p-3"><ChevronLeft className="h-6 w-6" /></button>}<figure className="w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 sm:rounded-[2rem]"><div className="flex h-[70vh] w-full items-center justify-center bg-black"><img src={active.url} alt={active.titulo || 'Imagen presupuesto'} className="max-h-full max-w-full object-contain object-center" /></div><figcaption className="border-t border-white/10 p-4"><b className="text-white">{active.titulo}</b><p className="mt-1 text-sm text-zinc-400">{active.descripcion}</p><p className="mt-2 text-xs text-yellow-300">{(activeImage ?? 0) + 1} / {images.length}</p></figcaption></figure>{images.length > 1 && <button onClick={nextImage} className="absolute right-2 top-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400 sm:right-3 sm:p-3"><ChevronRight className="h-6 w-6" /></button>}</div>}
    </section>
  );
}
