'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { Cloud, Image as ImageIcon, Images, X } from 'lucide-react';
import { MediaPicker, type MediaAsset } from '@/components/admin/cms/MediaPicker';

const CMS_FOLDERS = new Set(['general', 'blog', 'home', 'banners', 'servicios', 'productos']);

type CmsFolder = 'general' | 'blog' | 'home' | 'banners' | 'servicios' | 'productos';

export default function InsforgeMediaPicker({
  value,
  onChange,
  folder = 'home',
}: {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const [open, setOpen] = useState(false);
  const defaultFolder = (CMS_FOLDERS.has(folder) ? folder : 'general') as CmsFolder;
  const defaultSource = useMemo(() => value?.includes('res.cloudinary.com') ? 'cloudinary' as const : 'insforge' as const, [value]);

  function select(asset: MediaAsset) {
    onChange(asset.url);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/35 p-2.5 text-left transition hover:border-[#D77A2D]/50 hover:bg-black/50"
      >
        <span className="relative grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/8 bg-[#111214]">
          {value ? <img src={value} alt="Vista previa" className="h-full w-full object-cover" /> : <Images className="h-5 w-5 text-[#D77A2D]" />}
          {value?.includes('res.cloudinary.com') ? <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/80 text-[#D77A2D]"><Cloud className="h-3 w-3" /></span> : null}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[11px] font-black text-white">{value ? 'Cambiar imagen' : 'Elegir imagen'}</b>
          <span className="mt-1 block text-[9px] leading-4 text-white/36">Cloudinary + Insforge · buscar, subir y seleccionar desde una sola biblioteca.</span>
        </span>
        <ImageIcon className="h-4 w-4 shrink-0 text-white/25 transition group-hover:text-[#D77A2D]" />
      </button>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/7 bg-white/[.025] px-2.5 py-2">
          <span className="min-w-0 truncate text-[8px] font-semibold text-white/25">{value}</span>
          <button type="button" onClick={() => onChange('')} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-red-400/15 text-red-200/45 hover:bg-red-400/8 hover:text-red-200" aria-label="Quitar imagen"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : null}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={select}
        defaultFolder={defaultFolder}
        defaultSource={defaultSource}
      />
    </div>
  );
}
