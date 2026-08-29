'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Cloud, FolderOpen, Image as ImageIcon, Loader2, Search, Upload, X } from 'lucide-react';

type CloudinaryAsset = {
  id: string;
  public_id: string;
  url: string;
  format: string;
  size_bytes: number;
  created_at: string;
  width: number;
  height: number;
  source: 'cloudinary';
};

type CloudinaryResponse = {
  assets?: CloudinaryAsset[];
  asset?: CloudinaryAsset;
  next_cursor?: string | null;
  error?: string;
  code?: string;
};

type FieldKind = 'Imagen' | 'Fondo' | 'Icono';

type ActiveTarget = {
  input: HTMLInputElement;
  kind: FieldKind;
};

const FIELD_LABELS: Record<string, FieldKind> = {
  'URL / Cloudinary': 'Imagen',
  'Imagen de fondo': 'Fondo',
  'Reemplazar por SVG / PNG': 'Icono',
};

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VisualCmsCloudinaryBridge() {
  const [target, setTarget] = useState<ActiveTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [search, setSearch] = useState('');
  const [prefix, setPrefix] = useState('');
  const [uploadFolder, setUploadFolder] = useState('fabrick/visual-cms');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadAssets = useCallback(async (cursor?: string | null, requestedPrefix?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ max_results: '60' });
      const activePrefix = requestedPrefix ?? prefix;
      if (activePrefix.trim()) params.set('folder', activePrefix.trim());
      if (cursor) params.set('next_cursor', cursor);
      const response = await fetch(`/api/admin/cloudinary?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => ({})) as CloudinaryResponse;
      if (!response.ok) {
        if (body.code === 'NOT_CONFIGURED') {
          setNotConfigured(true);
          setAssets([]);
          setNextCursor(null);
          return;
        }
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      setNotConfigured(false);
      setAssets((current) => cursor ? [...current, ...(body.assets ?? [])] : (body.assets ?? []));
      setNextCursor(body.next_cursor ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar Cloudinary.');
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    const scan = () => {
      const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
      for (const label of labels) {
        if (label.dataset.cloudinaryBridgeScanned === '1') continue;
        const caption = label.querySelector('span')?.textContent?.trim() || '';
        const kind = FIELD_LABELS[caption];
        if (!kind) continue;
        const input = label.querySelector<HTMLInputElement>('input[type="text"], input:not([type])');
        if (!input) continue;

        label.dataset.cloudinaryBridgeScanned = '1';
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.cloudinaryBridgeButton = '1';
        button.className = 'mt-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#FFB000]/25 bg-[#FFB000]/8 px-2.5 text-[8px] font-black uppercase tracking-[.1em] text-[#FFB000] transition hover:bg-[#FFB000]/14';
        button.setAttribute('aria-label', `Elegir ${kind.toLowerCase()} desde Cloudinary`);
        button.innerHTML = '<span aria-hidden="true">☁</span><span>Elegir en Cloudinary</span>';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setTarget({ input, kind });
          setLastApplied(null);
          setOpen(true);
        });
        label.appendChild(button);
      }
    };

    scan();
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>('[data-cloudinary-bridge-button="1"]').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('[data-cloudinary-bridge-scanned="1"]').forEach((node) => delete node.dataset.cloudinaryBridgeScanned);
    };
  }, []);

  useEffect(() => {
    if (!open || assets.length > 0 || loading || notConfigured) return;
    void loadAssets(null);
  }, [open, assets.length, loading, loadAssets, notConfigured]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => `${asset.public_id} ${asset.format}`.toLowerCase().includes(query));
  }, [assets, search]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedAssets: CloudinaryAsset[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', uploadFolder.trim() || 'fabrick/visual-cms');
        const response = await fetch('/api/admin/cloudinary', {
          method: 'POST',
          credentials: 'same-origin',
          body: form,
        });
        const body = await response.json().catch(() => ({})) as CloudinaryResponse;
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        if (body.asset) uploadedAssets.push(body.asset);
      }
      if (uploadedAssets.length) {
        setAssets((current) => [...uploadedAssets, ...current.filter((asset) => !uploadedAssets.some((item) => item.id === asset.id))]);
      } else {
        await loadAssets(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function applyAsset(asset: CloudinaryAsset) {
    if (!target?.input?.isConnected) {
      setError('El campo que estabas editando cambió. Vuelve a abrir Cloudinary desde el inspector.');
      return;
    }
    setNativeInputValue(target.input, asset.url);
    target.input.focus();
    target.input.blur();
    setLastApplied(asset.id);
    window.setTimeout(() => {
      setOpen(false);
      setTarget(null);
      setLastApplied(null);
    }, 180);
  }

  function close() {
    setOpen(false);
    setTarget(null);
    setError(null);
    setLastApplied(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Biblioteca Cloudinary">
      <div className="flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0B0C0E] text-white shadow-2xl sm:h-[min(780px,88dvh)] sm:rounded-2xl">
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-white/8 px-3 sm:px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFB000] text-black"><Cloud className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#FFB000]">Cloudinary conectado</p>
            <h2 className="truncate text-sm font-black">Elegir {target?.kind?.toLowerCase() || 'recurso'}</h2>
          </div>
          <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/55" aria-label="Cerrar Cloudinary"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid shrink-0 gap-2 border-b border-white/8 p-2.5 sm:grid-cols-[minmax(0,1fr)_210px_auto] sm:p-3">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/25" />
          </label>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5">
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input value={prefix} onChange={(event) => setPrefix(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadAssets(null, prefix); }} placeholder="Prefijo/carpeta" className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/25" />
          </label>
          <button type="button" onClick={() => void loadAssets(null, prefix)} disabled={loading} className="h-9 rounded-lg border border-white/10 px-3 text-[9px] font-black text-white/60 disabled:opacity-40">{loading ? 'Cargando…' : 'Filtrar'}</button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 px-2.5 py-2 sm:px-3">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 sm:max-w-[280px]">
            <span className="shrink-0 text-[8px] font-black uppercase text-white/30">Subir a</span>
            <input value={uploadFolder} onChange={(event) => setUploadFolder(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[9px] text-[#FFB000] outline-none" />
          </label>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#FFB000] px-3 text-[9px] font-black text-black">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Subiendo…' : 'Subir imagen'}
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" className="hidden" onChange={(event) => void upload(event.target.files)} />
          </label>
          <span className="hidden text-[8px] text-white/25 md:inline">JPG · PNG · WEBP · AVIF · GIF · SVG · máx. 10 MB</span>
        </div>

        {error ? <div className="mx-2.5 mt-2.5 rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-2 text-[9px] text-red-200 sm:mx-3">{error}</div> : null}

        {notConfigured ? (
          <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
            <div className="max-w-sm"><Cloud className="mx-auto h-8 w-8 text-[#FFB000]/60" /><h3 className="mt-3 text-sm font-black">Cloudinary necesita configuración</h3><p className="mt-2 text-[10px] leading-5 text-white/40">El Visual CMS usa la misma conexión del Centro de Integraciones. No necesitas otra API ni otra cuenta.</p><a href="/admin/integraciones" className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#FFB000] px-4 text-[9px] font-black text-black">Abrir Integraciones</a></div>
          </div>
        ) : loading && assets.length === 0 ? (
          <div className="grid min-h-0 flex-1 place-items-center"><div className="flex items-center gap-2 text-[10px] text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Cargando biblioteca Cloudinary…</div></div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin] sm:p-3">
            {filtered.length === 0 ? (
              <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-white/10 text-center"><div><ImageIcon className="mx-auto h-7 w-7 text-white/20" /><p className="mt-2 text-[10px] text-white/35">No hay imágenes que coincidan con el filtro.</p></div></div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filtered.map((asset) => {
                  const applied = lastApplied === asset.id;
                  const current = target?.input.value === asset.url;
                  return (
                    <button key={asset.id} type="button" onClick={() => applyAsset(asset)} className={`group overflow-hidden rounded-xl border text-left transition ${applied || current ? 'border-[#FFB000] bg-[#FFB000]/8' : 'border-white/9 bg-black/35 hover:border-[#FFB000]/35'}`}>
                      <div className="relative aspect-square overflow-hidden bg-black">
                        <img src={asset.url} alt={asset.public_id} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                        {applied || current ? <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#FFB000] text-black"><Check className="h-3.5 w-3.5" /></span> : null}
                      </div>
                      <div className="p-2"><p className="truncate text-[9px] font-bold text-white/65" title={asset.public_id}>{asset.public_id}</p><p className="mt-1 text-[8px] text-white/28">{asset.width}×{asset.height} · {formatBytes(asset.size_bytes)}</p></div>
                    </button>
                  );
                })}
              </div>
            )}
            {nextCursor ? <div className="flex justify-center py-3"><button type="button" onClick={() => void loadAssets(nextCursor)} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-4 text-[9px] font-black text-white/55 disabled:opacity-40">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Cargar más</button></div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
