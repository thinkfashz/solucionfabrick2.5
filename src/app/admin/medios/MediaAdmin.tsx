'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Upload, Save } from 'lucide-react';

interface Asset {
  id: string;
  url: string;
  path: string;
  alt?: string | null;
  folder?: string | null;
  size_bytes?: number | null;
  mime_type?: string | null;
  created_at?: string;
}

const FOLDERS = ['general', 'blog', 'home', 'banners', 'servicios', 'productos'] as const;

export function MediaAdmin() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folder, setFolder] = useState<(typeof FOLDERS)[number] | 'all'>('all');
  const [uploadFolder, setUploadFolder] = useState<(typeof FOLDERS)[number]>('general');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingAlt, setEditingAlt] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = folder === 'all' ? '/api/admin/media?limit=200' : `/api/admin/media?folder=${encodeURIComponent(folder)}&limit=200`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as { assets?: Asset[]; error?: string; hint?: string };
      if (!res.ok) throw new Error(json.error ? `${json.error}${json.hint ? ` — ${json.hint}` : ''}` : `HTTP ${res.status}`);
      setAssets(json.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', uploadFolder);
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm('¿Eliminar esta imagen? Se borra también del storage.')) return;
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  }

  async function saveAlt(id: string) {
    const alt = editingAlt[id];
    if (alt === undefined) return;
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, alt } : a)));
      setEditingAlt((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    }
  }

  const filtered = search.trim()
    ? assets.filter((a) => `${a.alt ?? ''} ${a.path}`.toLowerCase().includes(search.toLowerCase()))
    : assets;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-playfair text-2xl font-black tracking-wide text-yellow-400">Biblioteca de medios</h1>
        <p className="text-xs text-zinc-500">Sube, organiza y reutiliza imágenes en blog, home y banners. Bucket InsForge: <code className="text-yellow-400">media</code>.</p>
      </header>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-3">
        <select value={folder} onChange={(e) => setFolder(e.target.value as typeof folder)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white">
          <option value="all">Todas las carpetas</option>
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
        <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value as typeof uploadFolder)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-yellow-400">
          {FOLDERS.map((f) => (
            <option key={f} value={f}>Subir a: {f}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-yellow-300">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Subir
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 py-12 text-zinc-500">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Sin imágenes en esta carpeta. Sube la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((asset) => {
            const altDraft = editingAlt[asset.id];
            const altDirty = altDraft !== undefined && altDraft !== (asset.alt ?? '');
            return (
              <div key={asset.id} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                <div className="aspect-square w-full overflow-hidden">
                  <img src={asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="space-y-2 p-2">
                  <p className="truncate text-[10px] text-zinc-500" title={asset.path}>{asset.path}</p>
                  <div className="flex gap-1">
                    <input
                      value={altDraft ?? asset.alt ?? ''}
                      onChange={(e) => setEditingAlt((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                      placeholder="alt…"
                      className="flex-1 rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] text-white"
                    />
                    {altDirty && (
                      <button onClick={() => saveAlt(asset.id)} className="flex h-6 w-6 items-center justify-center rounded-md bg-yellow-400 text-black" aria-label="Guardar alt"><Save className="h-3 w-3" /></button>
                    )}
                    <button onClick={() => deleteAsset(asset.id)} className="flex h-6 w-6 items-center justify-center rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label="Eliminar"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(asset.url)}
                      className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400"
                      title="Copiar URL"
                    >
                      Copiar URL
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
