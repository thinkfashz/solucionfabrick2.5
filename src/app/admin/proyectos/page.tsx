'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderPlus,
  Images,
  Layers,
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
  album_description?: string;
  album_hashtags?: string[];
  album_cover?: boolean;
  sort_order?: number;
  url: string;
  thumb: string;
  tags?: string[];
  created_at?: string;
};

type Album = { key: string; title: string; category: string; description: string; cover: string; count: number; hashtags?: string[] };
type ToastKind = 'success' | 'error' | 'info';
type ToastState = { text: string; type: ToastKind } | null;
type AiMetadata = { title: string; description: string; alt: string; category: string; hashtags: string[] };
type AlbumMetadata = { albumTitle: string; albumDescription: string; category: string; hashtags: string[] };

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
function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
function titleFromFile(file?: File) {
  const value = file?.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Nuevo álbum de ideas';
  return value.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120);
}
function tagList(value: string) {
  return Array.from(new Set(value.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))).slice(0, 20);
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
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverKey, setCoverKey] = useState('');
  const [useAi, setUseAi] = useState(true);
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

  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setPreviews(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function notify(text: string, type: ToastKind = 'success') {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4200);
  }

  function chooseFiles(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list).filter((file) => file.type.startsWith('image/'));
    const next = Array.from(new Map([...files, ...selected].map((file) => [fileKey(file), file])).values());
    setFiles(next);
    if (!coverKey && next[0]) setCoverKey(fileKey(next[0]));
    if (!albumTitle && next[0]) {
      const suggestion = titleFromFile(next[0]);
      setAlbumTitle(suggestion);
      setAlbumSlug(slugify(suggestion));
    }
  }

  function removeFile(index: number) {
    const removed = files[index];
    const next = files.filter((_, itemIndex) => itemIndex !== index);
    setFiles(next);
    if (removed && coverKey === fileKey(removed)) setCoverKey(next[0] ? fileKey(next[0]) : '');
  }

  function moveFile(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    setFiles(next);
  }

  async function analyzeAlbumGroup(uploaded: Asset[], title: string, suggestedCategory: string): Promise<AlbumMetadata | null> {
    try {
      const response = await fetch('/api/proyectos/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'album',
          imageUrls: uploaded.slice(0, 6).map((asset) => asset.url),
          albumTitle: title,
          category: suggestedCategory,
          fileNames: files.map((file) => file.name),
        }),
      });
      const json = await response.json() as { albumMetadata?: AlbumMetadata; warning?: string };
      if (json.warning) notify(json.warning, 'info');
      return json.albumMetadata || null;
    } catch {
      return null;
    }
  }

  async function analyzeAsset(asset: Asset, context: AlbumMetadata): Promise<AiMetadata | null> {
    try {
      const response = await fetch('/api/proyectos/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: asset.url, albumTitle: context.albumTitle, category: context.category, mode: 'asset' }),
      });
      const json = await response.json() as { metadata?: AiMetadata; warning?: string };
      if (json.warning) notify(json.warning, 'info');
      return json.metadata || null;
    } catch {
      return null;
    }
  }

  async function persistMetadata(asset: Asset, metadata: AiMetadata, albumMetadata: AlbumMetadata, slug: string, index: number, isCover: boolean) {
    const response = await fetch('/api/proyectos/cloudinary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id: asset.public_id,
        title: metadata.title,
        description: metadata.description,
        alt: metadata.alt,
        category: metadata.category || albumMetadata.category,
        album: slug,
        albumTitle: albumMetadata.albumTitle,
        albumDescription: albumMetadata.albumDescription,
        hashtags: metadata.hashtags,
        albumHashtags: albumMetadata.hashtags,
        sortOrder: index,
        albumCover: isCover,
      }),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(json.error || 'No se pudo guardar la metadata IA.');
    }
  }

  async function uploadAlbum() {
    const workingTitle = albumTitle.trim() || titleFromFile(files[0]);
    const slug = albumSlug || slugify(workingTitle);
    if (!workingTitle || !slug || files.length === 0) {
      notify('Define el nombre del álbum y selecciona una o más imágenes.', 'error');
      return;
    }

    setUploading(true);
    const uploaded: Asset[] = [];
    const baseAlbumMetadata: AlbumMetadata = {
      albumTitle: workingTitle,
      albumDescription: description.trim() || 'Colección visual agrupada para comparar estilo, distribución, materiales y terminaciones.',
      category,
      hashtags: tagList(hashtags),
    };

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Subiendo ${index + 1} de ${files.length}: ${file.name}`);
        const form = new FormData();
        form.set('file', file);
        form.set('album', slug);
        form.set('albumTitle', baseAlbumMetadata.albumTitle);
        form.set('albumDescription', baseAlbumMetadata.albumDescription);
        form.set('category', baseAlbumMetadata.category);
        form.set('description', baseAlbumMetadata.albumDescription);
        form.set('hashtags', baseAlbumMetadata.hashtags.join(' '));
        form.set('albumHashtags', baseAlbumMetadata.hashtags.join(' '));
        form.set('sortOrder', String(index));
        form.set('albumCover', String(fileKey(file) === coverKey));
        form.set('title', titleFromFile(file));
        const response = await fetch('/api/proyectos/cloudinary', { method: 'POST', body: form });
        const json = await response.json().catch(() => ({})) as { asset?: Asset; error?: string };
        if (!response.ok || !json.asset) throw new Error(json.error || `No se pudo subir ${file.name}`);
        uploaded.push(json.asset);
      }

      let finalAlbumMetadata = baseAlbumMetadata;
      if (useAi) {
        setProgress(`La IA está leyendo el grupo de ${uploaded.length} imágenes…`);
        const generated = await analyzeAlbumGroup(uploaded, workingTitle, category);
        if (generated) {
          finalAlbumMetadata = generated;
          setAlbumTitle(generated.albumTitle);
          setDescription(generated.albumDescription);
          setCategory(generated.category);
          setHashtags(generated.hashtags.join(' '));
        }

        for (let index = 0; index < uploaded.length; index += 1) {
          const asset = uploaded[index];
          setProgress(`Completando imagen ${index + 1} de ${uploaded.length} con IA`);
          const metadata = await analyzeAsset(asset, finalAlbumMetadata) || {
            title: asset.title,
            description: asset.description || finalAlbumMetadata.albumDescription,
            alt: asset.alt || asset.title,
            category: finalAlbumMetadata.category,
            hashtags: finalAlbumMetadata.hashtags,
          };
          await persistMetadata(asset, metadata, finalAlbumMetadata, slug, index, fileKey(files[index]) === coverKey);
        }
      }

      notify(`${uploaded.length} imagen${uploaded.length === 1 ? '' : 'es'} publicada${uploaded.length === 1 ? '' : 's'} como un álbum agrupado.`);
      setFiles([]);
      setCoverKey('');
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
        albumDescription: asset.album_description,
        hashtags: asset.tags || [],
        albumHashtags: asset.album_hashtags || [],
        sortOrder: asset.sort_order || 0,
        albumCover: Boolean(asset.album_cover),
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

  const selectedCover = files.findIndex((file) => fileKey(file) === coverKey);

  return (
    <main className="min-h-screen bg-[#171820] px-4 py-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2.4rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.2),transparent_30rem),linear-gradient(145deg,#242630,#171820)] p-6 shadow-2xl shadow-black/25 ring-1 ring-white/7 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-[#CCB196]"><Sparkles className="h-3.5 w-3.5" /> Estudio de Inspiraciones</span><h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">Publica grupos de imágenes como álbumes completos.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#CFC3BA]">Selecciona varias fotografías, define el orden y la portada. Cloudinary conserva el grupo y la IA completa la identidad del álbum y la metadata individual de cada imagen.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/7 px-4 text-xs font-black text-[#F8F0E9]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button><Link href="/proyectos" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B6906C] px-4 text-xs font-black text-[#171820]">Ver carrusel público <ExternalLink className="h-4 w-4" /></Link></div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[470px_1fr]">
          <aside className="h-fit rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_24px_80px_rgba(0,0,0,.2)] xl:sticky xl:top-6 sm:p-6">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><FolderPlus className="h-5 w-5" /></span><div><h2 className="text-xl font-black">Nuevo álbum agrupado</h2><p className="mt-1 text-xs text-[#756B63]">Una ficha general y varias imágenes relacionadas.</p></div></div>

            <div className="mt-6 grid gap-4">
              <AdminField label="Nombre del álbum"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} placeholder="Ej: Cocinas mediterráneas" className="admin-input" /></AdminField>
              <div className="grid gap-3 sm:grid-cols-2"><AdminField label="Carpeta / slug"><input value={albumSlug} onChange={(event) => setAlbumSlug(slugify(event.target.value))} placeholder="cocinas-mediterraneas" className="admin-input" /></AdminField><AdminField label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div>
              <AdminField label="Descripción general del álbum"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Qué une a estas imágenes y cómo pueden inspirar un proyecto." className="admin-input resize-y" /></AdminField>
              <AdminField label="Hashtags del álbum"><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="cocina mediterranea muebles" className="admin-input" /></AdminField>

              <button type="button" onClick={() => setUseAi((value) => !value)} className={`flex items-center justify-between rounded-2xl p-4 text-left ring-1 transition ${useAi ? 'bg-[#E6D4C3] ring-[#B6906C]/35' : 'bg-white ring-[#171820]/8'}`}><span><b className="flex items-center gap-2 text-sm"><WandSparkles className="h-4 w-4 text-[#895E3D]" /> Completar grupo con IA</b><span className="mt-1 block text-[10px] leading-5 text-[#756B63]">Analiza hasta seis imágenes para crear la ficha del álbum y después completa cada imagen.</span></span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${useAi ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-[#E6D4C3] text-transparent'}`}><Check className="h-4 w-4" /></span></button>

              <label className="group grid min-h-40 cursor-pointer place-items-center rounded-[1.6rem] border-2 border-dashed border-[#B6906C]/45 bg-[#EADBCB]/55 p-5 text-center transition hover:border-[#895E3D] hover:bg-[#EADBCB]">
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} />
                <span><UploadCloud className="mx-auto h-8 w-8 text-[#895E3D]" /><b className="mt-3 block text-sm">Seleccionar un grupo de imágenes</b><span className="mt-1 block text-[11px] leading-5 text-[#756B63]">Puedes añadir más archivos en varias selecciones · máximo 12 MB por imagen</span></span>
              </label>

              {files.length ? <div className="rounded-[1.5rem] bg-white p-3 ring-1 ring-[#171820]/7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">{files.length} imágenes en el grupo</p><p className="mt-1 text-[10px] text-[#756B63]">Ordena, elimina o selecciona la portada.</p></div><button type="button" onClick={() => { setFiles([]); setCoverKey(''); }} className="rounded-full bg-red-50 px-3 py-2 text-[10px] font-black text-red-700">Vaciar</button></div><div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{files.map((file, index) => { const isCover = fileKey(file) === coverKey; return <article key={fileKey(file)} className={`relative w-32 shrink-0 overflow-hidden rounded-2xl bg-[#F8F0E9] ring-2 ${isCover ? 'ring-[#895E3D]' : 'ring-transparent'}`}><img src={previews[index]} alt={file.name} className="h-28 w-full object-cover" /><button type="button" onClick={() => removeFile(index)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#171820]/88 text-white" aria-label={`Quitar ${file.name}`}><X className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setCoverKey(fileKey(file))} className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[8px] font-black ${isCover ? 'bg-[#B6906C] text-[#171820]' : 'bg-[#171820]/82 text-white'}`}>{isCover ? 'Portada' : 'Elegir'}</button><div className="p-2"><p className="truncate text-[9px] font-bold">{index + 1}. {file.name}</p><div className="mt-2 flex justify-between"><button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} className="grid h-7 w-7 place-items-center rounded-lg bg-[#E6D4C3] disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} className="grid h-7 w-7 place-items-center rounded-lg bg-[#E6D4C3] disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button></div></div></article>; })}</div></div> : null}

              <AlbumDraftPreview title={albumTitle || titleFromFile(files[0])} description={description} category={category} hashtags={tagList(hashtags)} cover={selectedCover >= 0 ? previews[selectedCover] : previews[0]} count={files.length} />

              <button type="button" onClick={() => void uploadAlbum()} disabled={uploading || files.length === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-[#F8F0E9] transition hover:bg-[#895E3D] disabled:cursor-not-allowed disabled:opacity-45">{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Layers className="h-5 w-5 text-[#CCB196]" />} {uploading ? 'Publicando el álbum…' : `Publicar grupo${files.length ? ` · ${files.length} imágenes` : ''}`}</button>
              {progress ? <div className="rounded-2xl bg-[#E6D4C3] p-3 text-center text-[10px] font-bold leading-5 text-[#5E5148]"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin text-[#895E3D]" />{progress}</div> : null}
            </div>
          </aside>

          <div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{albums.slice(0, 6).map((album) => <article key={album.key} className="overflow-hidden rounded-[1.5rem] bg-white text-[#171820]"><div className="relative"><img src={album.cover} alt={album.title} className="h-36 w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-[#171820]/88 px-3 py-1.5 text-[9px] font-black text-[#E5CFBA]">{album.count} imágenes</span></div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#895E3D]">{album.category}</p><h3 className="mt-1 line-clamp-1 font-black">{album.title}</h3><p className="mt-2 line-clamp-2 text-[10px] leading-5 text-[#756B63]">{album.description}</p><div className="mt-3 flex flex-wrap gap-1">{album.hashtags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#E6D4C3] px-2 py-1 text-[8px] font-black text-[#5E5148]">#{tag}</span>)}</div></div></article>)}</div>

            <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] bg-white/6 px-4 py-3 ring-1 ring-white/7"><Search className="h-4 w-4 text-[#CCB196]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar álbum, título o categoría…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" /><span className="text-[10px] text-white/35">{filtered.length} imágenes</span></div>

            {source === 'fallback' ? <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-300/10 p-4 text-xs leading-5 text-amber-100 ring-1 ring-amber-300/20"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />La integración Cloudinary todavía usa contenido de respaldo. Configura las credenciales en Integraciones para habilitar las cargas reales.</div> : null}

            {loading ? <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4"><Loader2 className="h-7 w-7 animate-spin text-[#CCB196]" /></div> : filtered.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((asset) => <AssetCard key={asset.id} asset={asset} onEdit={() => setEditing(asset)} onDelete={() => void deleteAsset(asset)} />)}</div> : <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4 p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-white/25" /><h2 className="mt-4 text-xl font-black">Aún no hay imágenes en esta búsqueda</h2><p className="mt-2 text-sm text-white/45">Crea el primer álbum desde el panel lateral.</p></div></div>}
          </div>
        </section>
      </div>

      {editing ? <EditAssetModal asset={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={() => void saveEdit(editing)} /> : null}
      {toast ? <div className={`fixed bottom-6 right-6 z-[600] max-w-sm rounded-2xl px-5 py-4 text-sm font-bold shadow-2xl ${toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'info' ? 'bg-[#E6D4C3] text-[#171820]' : 'bg-emerald-300 text-[#171820]'}`}>{toast.text}</div> : null}

      <style jsx global>{`
        .admin-input { width:100%; border-radius:1rem; border:1px solid rgba(23,24,32,.1); background:white; padding:.85rem 1rem; font-size:.875rem; color:#171820; outline:none; }
        .admin-input:focus { border-color:rgba(182,144,108,.8); box-shadow:0 0 0 3px rgba(182,144,108,.12); }
      `}</style>
    </main>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#756B63]">{label}</span>{children}</label>;
}

function AlbumDraftPreview({ title, description, category, hashtags, cover, count }: { title: string; description: string; category: string; hashtags: string[]; cover?: string; count: number }) {
  if (!count) return null;
  return <section className="overflow-hidden rounded-[1.6rem] bg-[#171820] text-[#F8F0E9]"><div className="relative h-44 bg-white/6">{cover ? <img src={cover} alt="Portada seleccionada" className="h-full w-full object-cover" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-[#171820]/92 via-transparent to-transparent" /><span className="absolute bottom-3 left-3 rounded-full bg-[#F8F0E9]/92 px-3 py-1.5 text-[9px] font-black text-[#171820]">Vista previa · {count} imágenes</span></div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#CCB196]">{category}</p><h3 className="mt-2 text-xl font-black leading-tight">{title}</h3><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[#D2C6BD]">{description || 'La IA puede completar la descripción general después de leer el grupo.'}</p><div className="mt-3 flex flex-wrap gap-1">{hashtags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-white/7 px-2 py-1 text-[8px] font-black text-[#E5CFBA]">#{tag}</span>)}</div></div></section>;
}

function AssetCard({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  return <article className="overflow-hidden rounded-[1.7rem] bg-[#F8F0E9] text-[#171820] shadow-[0_18px_55px_rgba(0,0,0,.16)]"><div className="relative h-56 overflow-hidden"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-[#171820]/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] text-[#E5CFBA]">{asset.album_title}</span>{asset.album_cover ? <span className="absolute right-3 top-3 rounded-full bg-[#B6906C] px-3 py-1.5 text-[9px] font-black text-[#171820]">Portada</span> : null}</div><div className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">{asset.category}</p><span className="text-[9px] font-black text-[#756B63]">Orden {Number(asset.sort_order || 0) + 1}</span></div><h3 className="mt-2 line-clamp-2 font-black">{asset.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#756B63]">{asset.description || 'Sin descripción. Usa editar para completar la metadata.'}</p><div className="mt-4 flex gap-2"><button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#171820] px-3 py-2.5 text-xs font-black text-[#F8F0E9]"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-700" aria-label="Eliminar imagen"><Trash2 className="h-4 w-4" /></button></div></div></article>;
}

function EditAssetModal({ asset, onChange, onClose, onSave }: { asset: Asset; onChange: (asset: Asset) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[550] grid place-items-center bg-[#171820]/82 p-4 backdrop-blur-md"><section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#895E3D]">Editar imagen y álbum</p><h2 className="mt-2 text-2xl font-black">{asset.title}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#171820] text-[#F8F0E9]"><X className="h-4 w-4" /></button></div><div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-72 w-full rounded-[1.5rem] object-cover" /><div className="grid gap-4"><AdminField label="Título de la imagen"><input value={asset.title} onChange={(event) => onChange({ ...asset, title: event.target.value })} className="admin-input" /></AdminField><AdminField label="Descripción individual"><textarea value={asset.description || ''} onChange={(event) => onChange({ ...asset, description: event.target.value })} rows={4} className="admin-input resize-y" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Álbum"><input value={asset.album_title} onChange={(event) => onChange({ ...asset, album_title: event.target.value, album: slugify(event.target.value) })} className="admin-input" /></AdminField><AdminField label="Categoría"><select value={asset.category} onChange={(event) => onChange({ ...asset, category: event.target.value })} className="admin-input">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div><AdminField label="Descripción general del álbum"><textarea value={asset.album_description || ''} onChange={(event) => onChange({ ...asset, album_description: event.target.value })} rows={3} className="admin-input resize-y" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Hashtags del álbum"><input value={(asset.album_hashtags || []).join(' ')} onChange={(event) => onChange({ ...asset, album_hashtags: tagList(event.target.value) })} className="admin-input" /></AdminField><AdminField label="Hashtags de la imagen"><input value={(asset.tags || []).join(' ')} onChange={(event) => onChange({ ...asset, tags: tagList(event.target.value) })} className="admin-input" /></AdminField></div><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Orden dentro del álbum"><input type="number" min="1" value={Number(asset.sort_order || 0) + 1} onChange={(event) => onChange({ ...asset, sort_order: Math.max(0, Number(event.target.value || 1) - 1) })} className="admin-input" /></AdminField><button type="button" onClick={() => onChange({ ...asset, album_cover: !asset.album_cover })} className={`mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl text-xs font-black ${asset.album_cover ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-[#E6D4C3] text-[#171820]'}`}><Check className="h-4 w-4" /> {asset.album_cover ? 'Es portada del álbum' : 'Usar como portada'}</button></div></div></div><div className="mt-7 flex justify-end gap-3 border-t border-[#171820]/8 pt-5"><button type="button" onClick={onClose} className="rounded-full bg-[#E6D4C3] px-5 py-3 text-sm font-black">Cancelar</button><button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-[#171820] px-5 py-3 text-sm font-black text-[#F8F0E9]"><Save className="h-4 w-4" /> Guardar cambios</button></div></section></div>;
}
