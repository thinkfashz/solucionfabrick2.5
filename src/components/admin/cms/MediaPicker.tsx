'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Image as ImageIcon, Loader2, Upload, X, Check, Trash2 } from 'lucide-react';

export interface MediaAsset {
  id: string;
  url: string;
  path: string;
  alt?: string | null;
  folder?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string;
}

const FOLDERS = ['general', 'blog', 'home', 'banners', 'servicios', 'productos'] as const;
type Folder = (typeof FOLDERS)[number];

interface ApiList {
  assets: MediaAsset[];
  bucket?: string;
}

interface PickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  defaultFolder?: Folder;
  /** Allow deletes from inside the picker. Off by default. */
  allowDelete?: boolean;
}

export function MediaPicker({ open, onClose, onSelect, defaultFolder = 'general', allowDelete = false }: PickerProps) {
  const [folder, setFolder] = useState<Folder>(defaultFolder);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media?folder=${encodeURIComponent(folder)}&limit=200`, { cache: 'no-store' });
      const json = (await res.json()) as Partial<ApiList> & { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAssets(json.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la galería.');
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (!open) return;
    fetchAssets();
  }, [open, fetchAssets]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
        const json = (await res.json()) as { error?: string; asset?: MediaAsset };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      }
      await fetchAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(asset: MediaAsset) {
    if (!confirm('¿Eliminar esta imagen? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(asset.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  }

  if (!open) return null;
  const filtered = search.trim()
    ? assets.filter((a) => `${a.alt ?? ''} ${a.path}`.toLowerCase().includes(search.toLowerCase()))
    : assets;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">Biblioteca de medios</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-white" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value as Folder)}
            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white"
          >
            {FOLDERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Buscar por nombre o alt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-600"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-yellow-300">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Subir
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>

        {error && (
          <div className="mx-3 mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
              <ImageIcon className="h-8 w-8" />
              <p className="text-xs">Sin imágenes en esta carpeta. Sube la primera.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((asset) => (
                <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black">
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    className="block w-full"
                    title={asset.alt ?? asset.path}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      {/* Public InsForge URLs are served from external domains; use plain img so we don't need to add allowed remotePatterns. */}
                      <img
                        src={asset.url}
                        alt={asset.alt ?? ''}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full bg-yellow-400 p-2 text-black"><Check className="h-4 w-4" /></span>
                    </div>
                  </button>
                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(asset)}
                      className="absolute top-2 right-2 hidden h-7 w-7 items-center justify-center rounded-full bg-red-600/90 text-white group-hover:flex hover:bg-red-500"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
