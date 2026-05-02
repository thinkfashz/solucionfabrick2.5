'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, Image as ImageIcon, Loader2, Trash2, Upload, Copy, Check, Save } from 'lucide-react';

/* ── Types ── */
interface InsForgeAsset {
  id: string;
  url: string;
  path: string;
  alt?: string | null;
  folder?: string | null;
  size_bytes?: number | null;
  mime_type?: string | null;
  created_at?: string;
  source: 'insforge';
}

interface CloudinaryAsset {
  id: string;
  public_id: string;
  url: string;
  format: string;
  size_bytes: number;
  created_at: string;
  width: number;
  height: number;
  source: 'cloudinary';
}

const INSFORGE_FOLDERS = ['general', 'blog', 'home', 'banners', 'servicios', 'productos'] as const;
type InsForgeFolder = (typeof INSFORGE_FOLDERS)[number];

type ActiveTab = 'insforge' | 'cloudinary';

/* ── InsForge Media Panel ── */
function InsForgePanel() {
  const [assets, setAssets] = useState<InsForgeAsset[]>([]);
  const [folder, setFolder] = useState<InsForgeFolder | 'all'>('all');
  const [uploadFolder, setUploadFolder] = useState<InsForgeFolder>('general');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingAlt, setEditingAlt] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = folder === 'all' ? '/api/admin/media?limit=200' : `/api/admin/media?folder=${encodeURIComponent(folder)}&limit=200`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as { assets?: InsForgeAsset[]; error?: string; hint?: string };
      if (!res.ok) throw new Error(json.error ? `${json.error}${json.hint ? ` — ${json.hint}` : ''}` : `HTTP ${res.status}`);
      setAssets((json.assets ?? []).map((a) => ({ ...a, source: 'insforge' as const })));
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

  async function saveAlt(id: string, alt: string) {
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, alt } : a)));
      setEditingAlt((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    }
  }

  function copyUrl(id: string, url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    });
  }

  const filtered = search.trim()
    ? assets.filter((a) => `${a.alt ?? ''} ${a.path}`.toLowerCase().includes(search.toLowerCase()))
    : assets;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-3">
        <select value={folder} onChange={(e) => setFolder(e.target.value as typeof folder)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white">
          <option value="all">Todas las carpetas</option>
          {INSFORGE_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input
          type="search"
          placeholder="Buscar por nombre o alt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-600"
        />
        <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value as InsForgeFolder)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-yellow-400">
          {INSFORGE_FOLDERS.map((f) => <option key={f} value={f}>Subir a: {f}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-yellow-300">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Subir
          <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" onChange={(e) => handleUpload(e.target.files)} />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

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
            const copied = copiedId === asset.id;
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
                      <button onClick={() => saveAlt(asset.id, altDraft ?? '')} className="flex h-6 w-6 items-center justify-center rounded-md bg-yellow-400 text-black" aria-label="Guardar alt">
                        <Save className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => deleteAsset(asset.id)} className="flex h-6 w-6 items-center justify-center rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label="Eliminar">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyUrl(asset.id, asset.url)}
                    className="flex w-full items-center justify-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400"
                  >
                    {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
                    {copied ? 'Copiado' : 'Copiar URL'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Cloudinary Media Panel ── */
function CloudinaryPanel() {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('fabrick/general');
  const [search, setSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/admin/cloudinary?max_results=50';
      if (cursor) url += `&next_cursor=${encodeURIComponent(cursor)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as { assets?: CloudinaryAsset[]; next_cursor?: string; error?: string; code?: string };
      if (!res.ok) {
        if (json.code === 'NOT_CONFIGURED') { setNotConfigured(true); setLoading(false); return; }
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setNotConfigured(false);
      setAssets((prev) => cursor ? [...prev, ...(json.assets ?? [])] : (json.assets ?? []));
      setNextCursor(json.next_cursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

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
        const res = await fetch('/api/admin/cloudinary', { method: 'POST', body: fd });
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

  async function deleteAsset(asset: CloudinaryAsset) {
    if (!confirm(`¿Eliminar "${asset.public_id}" de Cloudinary?`)) return;
    try {
      const res = await fetch(`/api/admin/cloudinary?public_id=${encodeURIComponent(asset.public_id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  }

  function copyUrl(id: string, url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    });
  }

  const filtered = search.trim()
    ? assets.filter((a) => a.public_id.toLowerCase().includes(search.toLowerCase()))
    : assets;

  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 py-14 text-center px-6">
        <Cloud className="h-10 w-10 text-yellow-400/60" />
        <div>
          <p className="text-sm font-bold text-yellow-400">Cloudinary no configurado</p>
          <p className="mt-1 text-xs text-zinc-400">
            Ve a <strong className="text-white">Configuración → Integraciones</strong> y añade tu{' '}
            <em>Cloud name</em>, <em>API Key</em> y <em>API Secret</em> de Cloudinary.
          </p>
        </div>
        <a
          href="/admin/configuracion"
          className="rounded-full bg-yellow-400 px-6 py-2 text-xs font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300"
        >
          Ir a Configuración
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-3">
        <input
          type="text"
          placeholder="Carpeta (ej: fabrick/home)"
          value={uploadFolder}
          onChange={(e) => setUploadFolder(e.target.value)}
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-yellow-400 w-44"
        />
        <input
          type="search"
          placeholder="Buscar por public_id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-600"
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-yellow-300">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Subir a Cloudinary
          <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" onChange={(e) => handleUpload(e.target.files)} />
        </label>
        <button onClick={() => load()} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40">
          Refrescar
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      {loading && assets.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando desde Cloudinary…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 py-12 text-zinc-500">
          <Cloud className="h-8 w-8" />
          <p className="text-sm">Sin imágenes en Cloudinary. Sube la primera.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((asset) => {
              const copied = copiedId === asset.id;
              return (
                <div key={asset.id} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <div className="aspect-square w-full overflow-hidden">
                    <img src={asset.url} alt={asset.public_id} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="space-y-2 p-2">
                    <p className="truncate text-[10px] text-zinc-500" title={asset.public_id}>{asset.public_id}</p>
                    <p className="text-[9px] text-zinc-600">{asset.width}×{asset.height} · {(asset.size_bytes / 1024).toFixed(0)} KB</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => copyUrl(asset.id, asset.url)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400"
                      >
                        {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
                        {copied ? 'Copiado' : 'URL'}
                      </button>
                      <button onClick={() => deleteAsset(asset)} className="flex h-6 w-6 items-center justify-center rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label="Eliminar">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => load(nextCursor)}
                disabled={loading}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-5 py-2 text-xs text-zinc-300 hover:border-yellow-400/40 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Cargar más
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main MediaAdmin component ── */
export function MediaAdmin() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('insforge');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-playfair text-2xl font-black tracking-wide text-yellow-400">Biblioteca de medios</h1>
        <p className="text-xs text-zinc-500">
          Sube, organiza y reutiliza imágenes. Usa <strong className="text-zinc-300">InsForge</strong> para la biblioteca interna o{' '}
          <strong className="text-zinc-300">Cloudinary</strong> para gestión avanzada en la nube.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5">
        <button
          onClick={() => setActiveTab('insforge')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
            activeTab === 'insforge'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          InsForge
        </button>
        <button
          onClick={() => setActiveTab('cloudinary')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
            activeTab === 'cloudinary'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Cloud className="h-3.5 w-3.5" />
          Cloudinary
        </button>
      </div>

      {activeTab === 'insforge' ? <InsForgePanel /> : <CloudinaryPanel />}
    </div>
  );
}
