'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, Search, Upload, X } from 'lucide-react';

interface Asset {
  id: string | number;
  url: string;
  path: string;
  alt?: string | null;
  mime_type?: string | null;
}

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media?folder=${encodeURIComponent(folder)}&limit=200`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({})) as { assets?: Asset[]; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAssets((json.assets || []).filter((asset) => !asset.mime_type || asset.mime_type.startsWith('image/')));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folder);
        form.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        const res = await fetch('/api/admin/media', { method: 'POST', body: form });
        const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (json.url) onChange(json.url);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) => `${asset.alt || ''} ${asset.path}`.toLowerCase().includes(q));
  }, [assets, search]);

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 text-left text-xs text-white transition hover:border-[#FFB000]/45"
        >
          {value ? <img src={value} alt="" className="h-8 w-10 rounded-md object-cover" /> : <ImageIcon className="h-4 w-4 text-[#FFB000]" />}
          <span className="min-w-0 flex-1 truncate">{value ? 'Cambiar imagen de Insforge' : 'Elegir imagen de Insforge'}</span>
        </button>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="grid w-11 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-red-300" aria-label="Quitar imagen">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[10000] flex items-end bg-black/75 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0B0C0E] shadow-2xl md:max-w-5xl md:rounded-[2rem]">
            <div className="flex items-center gap-3 border-b border-white/8 p-4 sm:p-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Insforge · media/{folder}</p>
                <h3 className="mt-1 text-lg font-black text-white">Biblioteca de imágenes</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/60" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-white/8 p-3 sm:p-4">
              <label className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar imagen…" className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white outline-none focus:border-[#FFB000]/45" />
              </label>
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFB000] px-4 text-xs font-black text-black">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Subir imagen
                <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" className="hidden" onChange={(e) => upload(e.target.files)} />
              </label>
            </div>

            {error ? <div className="m-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="grid min-h-48 place-items-center text-white/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filtered.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {filtered.map((asset) => {
                    const selected = asset.url === value;
                    return (
                      <button
                        type="button"
                        key={String(asset.id)}
                        onClick={() => { onChange(asset.url); setOpen(false); }}
                        className={`group relative overflow-hidden rounded-xl border text-left ${selected ? 'border-[#FFB000]' : 'border-white/8 hover:border-white/25'}`}
                      >
                        <div className="aspect-[4/3] bg-black"><img src={asset.url} alt={asset.alt || ''} loading="lazy" className="h-full w-full object-cover" /></div>
                        <div className="p-2"><p className="truncate text-[10px] text-white/55">{asset.alt || asset.path.split('/').pop()}</p></div>
                        {selected ? <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#FFB000] text-black"><Check className="h-3.5 w-3.5" /></span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center text-center text-xs text-white/35">No hay imágenes en esta carpeta. Puedes subir la primera aquí.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
