'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ExternalLink,
  FolderPlus,
  Images,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';

type Asset = {
  id: string;
  public_id: string;
  title: string;
  description?: string;
  alt?: string;
  category: string;
  album: string;
  album_title: string;
  url: string;
  thumb: string;
  tags?: string[];
  created_at?: string;
};

type Album = { key: string; title: string; category: string; description: string; cover: string; count: number };
type ToastKind = 'success' | 'error' | 'info';
type ToastState = { text: string; type: ToastKind } | null;
type AiMetadata = { title: string; description: string; alt: string; category: string; hashtags: string[] };

const CATEGORIES = [
  ['cocinas', 'Ideas de cocina'],
  ['casas', 'Ideas de casas'],
  ['planos', 'Planos de casa'],
  ['banos', 'Ideas de baño'],
  ['muebles', 'Ideas de muebles'],
  ['piscinas', 'Piscinas'],
  ['quinchos', 'Quinchos'],
  ['terrazas', 'Terrazas y patios'],
  ['materiales', 'Materiales y terminaciones'],
  ['remodelacion', 'Remodelación'],
  ['ideas', 'Ideas generales'],
] as const;

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export default function AdminInspiracionesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [query, setQuery] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumSlug, setAlbumSlug] = useState('');
  const [category, setCategory] = useState('ideas');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('inspiracion solucionesfabrick');
  const [files, setFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [source, setSource] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
      const json = await response.json() as { assets?: Asset[]; albums?: Album[]; source?: string; warning?: string; error?: string };
      setAssets(json.assets || []);
      setAlbums(json.albums || []);
      setSource(json.source || '');
      if (json.warning || json.error) notify(json.warning || json.error || '', 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar Cloudinary.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  function notify(text: string, type: ToastKind = 'success') {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4200);
  }

  function chooseFiles(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list).filter((file) => file.type.startsWith('image/'));
    setFiles(selected);
    if (!albumTitle && selected[0]) {
      const suggestion = selected[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setAlbumTitle(suggestion.replace(/\b\w/g, (character) => character.toUpperCase()));
      setAlbumSlug(slugify(suggestion));
    }
  }

  async function analyzeAsset(asset: Asset): Promise<AiMetadata | null> {
    try {
      const response = await fetch('/api/proyectos/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: asset.url, albumTitle: albumTitle || asset.album_title, category }),
      });
      const json = await response.json() as { metadata?: AiMetadata; warning?: string };
      if (json.warning) notify(json.warning, 'info');
      return json.metadata || null;
    } catch {
      return null;
    }
  }

  async function persistMetadata(asset: Asset, metadata: AiMetadata) {
    const response = await fetch('/api/proyectos/cloudinary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id: asset.public_id,
        title: metadata.title,
        description: metadata.description,
        alt: metadata.alt,
        category: metadata.category || category,
        album: albumSlug || asset.album,
        albumTitle: albumTitle || asset.album_title,
        hashtags: metadata.hashtags,
      }),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(json.error || 'No se pudo guardar la metadata IA.');
    }
  }

  async function uploadAlbum() {
    const slug = albumSlug || slugify(albumTitle);
    if (!albumTitle.trim() || !slug || files.length === 0) {
      notify('Define el nombre del álbum y selecciona una o más imágenes.', 'error');
      return;
    }
    setUploading(true);
    let completed = 0;
    try {
      for (const file of files) {
        setProgress(`Subiendo ${completed + 1} de ${files.length}: ${file.name}`);
        const form = new FormData();
        form.set('file', file);
        form.set('album', slug);
        form.set('albumTitle', albumTitle.trim());
        form.set('category', category);
        form.set('description', description.trim());
        form.set('hashtags', hashtags);
        form.set('title', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        const response = await fetch('/api/proyectos/cloudinary', { method: 'POST', body: form });
        const json = await response.json().catch(() => ({})) as { asset?: Asset; error?: string };
        if (!response.ok || !json.asset) throw new Error(json.error || `No se pudo subir ${file.name}`);

        setProgress(`Analizando con IA ${completed + 1} de ${files.length}`);
        const metadata = await analyzeAsset(json.asset);
        if (metadata) await persistMetadata(json.asset, metadata);
        completed += 1;
      }
      notify(`${completed} imagen${completed === 1 ? '' : 'es'} añadida${completed === 1 ? '' : 's'} al álbum ${albumTitle}.`);
      setFiles([]);
      setDescription('');
      setProgress('');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo completar la subida.', 'error');
    } finally {
      setUploading(false);
      setProgress('');
    }
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`¿Eliminar “${asset.title}” de Cloudinary?`)) return;
    const response = await fetch(`/api/proyectos/cloudinary?public_id=${encodeURIComponent(asset.public_id)}`, { method: 'DELETE' });
    const json = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return notify(json.error || 'No se pudo eliminar la imagen.', 'error');
    notify('Imagen eliminada de Cloudinary.');
    setEditing(null);
    await reload();
  }

  async function saveEdit(asset: Asset) {
    const response = await fetch('/api/proyectos/cloudinary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id: asset.public_id,
        title: asset.title,
        description: asset.description,
        alt: asset.alt,
        category: asset.category,
        album: asset.album,
        albumTitle: asset.album_title,
        hashtags: asset.tags || [],
      }),
    });
    const json = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return notify(json.error || 'No se pudo actualizar la imagen.', 'error');
    notify('Metadata actualizada.');
    setEditing(null);
    await reload();
  }

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return assets.filter((asset) => !value || `${asset.title} ${asset.description || ''} ${asset.album_title} ${asset.category}`.toLowerCase().includes(value));
  }, [assets, query]);

  return (
    <main className="min-h-screen bg-[#171820] px-4 py-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2.4rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.2),transparent_30rem),linear-gradient(145deg,#242630,#171820)] p-6 shadow-2xl shadow-black/25 ring-1 ring-white/7 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-[#CCB196]"><Sparkles className="h-3.5 w-3.5" /> Estudio de Inspiraciones</span><h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">Crea álbumes, sube imágenes y deja que la IA prepare el contenido.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#CFC3BA]">Cloudinary almacena las imágenes. La IA propone título, descripción, texto alternativo, categoría y hashtags editables antes de mostrarlos al público.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/7 px-4 text-xs font-black text-[#F8F0E9]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button><Link href="/proyectos" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B6906C] px-4 text-xs font-black text-[#171820]">Ver Inspiraciones <ExternalLink className="h-4 w-4" /></Link></div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[430px_1fr]">
          <aside className="h-fit rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_24px_80px_rgba(0,0,0,.2)] lg:sticky lg:top-6 sm:p-6">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><FolderPlus className="h-5 w-5" /></span><div><h2 className="text-xl font-black">Nuevo álbum</h2><p className="mt-1 text-xs text-[#756B63]">Una carpeta visual con varias imágenes relacionadas.</p></div></div>

            <div className="mt-6 grid gap-4">
              <AdminField label="Nombre del álbum"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} placeholder="Ej: Cocinas mediterráneas" className="admin-input" /></AdminField>
              <AdminField label="Carpeta / slug"><input value={albumSlug} onChange={(event) => setAlbumSlug(slugify(event.target.value))} placeholder="cocinas-mediterraneas" className="admin-input" /></AdminField>
              <AdminField label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField>
              <AdminField label="Descripción general"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Qué reúne este álbum y para qué tipo de proyecto sirve." className="admin-input resize-y" /></AdminField>
              <AdminField label="Hashtags base"><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="cocina mediterranea muebles" className="admin-input" /></AdminField>

              <label className="group grid min-h-44 cursor-pointer place-items-center rounded-[1.6rem] border-2 border-dashed border-[#B6906C]/45 bg-[#EADBCB]/55 p-5 text-center transition hover:border-[#895E3D] hover:bg-[#EADBCB]">
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => chooseFiles(event.target.files)} />
                <span><UploadCloud className="mx-auto h-8 w-8 text-[#895E3D]" /><b className="mt-3 block text-sm">Pulsa para seleccionar imágenes</b><span className="mt-1 block text-[11px] leading-5 text-[#756B63]">JPG, PNG, WebP · máximo 12 MB por imagen</span></span>
              </label>

              {files.length ? <div className="rounded-2xl bg-white p-3 ring-1 ring-[#171820]/7"><p className="text-xs font-black">{files.length} archivo{files.length === 1 ? '' : 's'} seleccionado{files.length === 1 ? '' : 's'}</p><div className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[10px] text-[#756B63]">{files.map((file) => <p key={`${file.name}-${file.size}`} className="truncate">{file.name}</p>)}</div></div> : null}

              <button type="button" onClick={() => void uploadAlbum()} disabled={uploading || files.length === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-[#F8F0E9] transition hover:bg-[#895E3D] disabled:cursor-not-allowed disabled:opacity-45">{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5 text-[#CCB196]" />} {uploading ? 'Subiendo y analizando…' : 'Subir y completar con IA'}</button>
              {progress ? <p className="text-center text-[10px] font-bold text-[#895E3D]">{progress}</p> : null}
            </div>
          </aside>

          <div>
            <div className="grid gap-3 sm:grid-cols-3">{albums.slice(0, 6).map((album) => <article key={album.key} className="overflow-hidden rounded-[1.5rem] bg-white text-[#171820]"><img src={album.cover} alt={album.title} className="h-28 w-full object-cover" /><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#895E3D]">{album.category}</p><h3 className="mt-1 line-clamp-1 font-black">{album.title}</h3><p className="mt-2 text-[10px] text-[#756B63]">{album.count} imágenes</p></div></article>)}</div>

            <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] bg-white/6 px-4 py-3 ring-1 ring-white/7"><Search className="h-4 w-4 text-[#CCB196]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar álbum, título o categoría…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" /><span className="text-[10px] text-white/35">{filtered.length} imágenes</span></div>

            {source === 'fallback' ? <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-300/10 p-4 text-xs leading-5 text-amber-100 ring-1 ring-amber-300/20"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />La integración Cloudinary todavía usa contenido de respaldo. Configura las credenciales en Integraciones para habilitar las cargas reales.</div> : null}

            {loading ? <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4"><Loader2 className="h-7 w-7 animate-spin text-[#CCB196]" /></div> : filtered.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((asset) => <AssetCard key={asset.id} asset={asset} onEdit={() => setEditing(asset)} onDelete={() => void deleteAsset(asset)} />)}</div> : <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4 p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-white/25" /><h2 className="mt-4 text-xl font-black">Aún no hay imágenes en esta búsqueda</h2><p className="mt-2 text-sm text-white/45">Crea el primer álbum desde el panel lateral.</p></div></div>}
          </div>
        </section>
      </div>

      {editing ? <EditAssetModal asset={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={() => void saveEdit(editing)} /> : null}
      {toast ? <div className={`fixed bottom-6 right-6 z-[600] max-w-sm rounded-2xl px-5 py-4 text-sm font-bold shadow-2xl ${toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'info' ? 'bg-[#E6D4C3] text-[#171820]' : 'bg-emerald-300 text-[#171820]'}`}>{toast.text}</div> : null}

      <style jsx>{`
        .admin-input { width:100%; border-radius:1rem; border:1px solid rgba(23,24,32,.1); background:white; padding:.85rem 1rem; font-size:.875rem; color:#171820; outline:none; }
        .admin-input:focus { border-color:rgba(182,144,108,.8); box-shadow:0 0 0 3px rgba(182,144,108,.12); }
      `}</style>
    </main>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#756B63]">{label}</span>{children}</label>;
}

function AssetCard({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  return <article className="overflow-hidden rounded-[1.7rem] bg-[#F8F0E9] text-[#171820] shadow-[0_18px_55px_rgba(0,0,0,.16)]"><div className="relative h-56 overflow-hidden"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-[#171820]/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] text-[#E5CFBA]">{asset.album_title}</span></div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">{asset.category}</p><h3 className="mt-2 line-clamp-2 font-black">{asset.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#756B63]">{asset.description || 'Sin descripción. Usa editar para completar la metadata.'}</p><div className="mt-4 flex gap-2"><button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#171820] px-3 py-2.5 text-xs font-black text-[#F8F0E9]"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-700" aria-label="Eliminar imagen"><Trash2 className="h-4 w-4" /></button></div></div></article>;
}

function EditAssetModal({ asset, onChange, onClose, onSave }: { asset: Asset; onChange: (asset: Asset) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[550] grid place-items-center bg-[#171820]/82 p-4 backdrop-blur-md"><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#895E3D]">Editar metadata</p><h2 className="mt-2 text-2xl font-black">{asset.title}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#171820] text-[#F8F0E9]"><X className="h-4 w-4" /></button></div><div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-64 w-full rounded-[1.5rem] object-cover" /><div className="grid gap-4"><AdminField label="Título"><input value={asset.title} onChange={(event) => onChange({ ...asset, title: event.target.value })} className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-[#171820]/10 outline-none focus:ring-[#B6906C]" /></AdminField><AdminField label="Descripción"><textarea value={asset.description || ''} onChange={(event) => onChange({ ...asset, description: event.target.value })} rows={5} className="w-full resize-y rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-[#171820]/10 outline-none focus:ring-[#B6906C]" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Álbum"><input value={asset.album_title} onChange={(event) => onChange({ ...asset, album_title: event.target.value, album: slugify(event.target.value) })} className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-[#171820]/10 outline-none" /></AdminField><AdminField label="Categoría"><select value={asset.category} onChange={(event) => onChange({ ...asset, category: event.target.value })} className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-[#171820]/10 outline-none">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div><AdminField label="Hashtags"><input value={(asset.tags || []).join(' ')} onChange={(event) => onChange({ ...asset, tags: event.target.value.split(/[\s,]+/).filter(Boolean) })} className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-[#171820]/10 outline-none" /></AdminField></div></div><div className="mt-7 flex justify-end gap-3 border-t border-[#171820]/8 pt-5"><button type="button" onClick={onClose} className="rounded-full bg-[#E6D4C3] px-5 py-3 text-sm font-black">Cancelar</button><button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-[#171820] px-5 py-3 text-sm font-black text-[#F8F0E9]"><Save className="h-4 w-4" /> Guardar cambios</button></div></section></div>;
}
