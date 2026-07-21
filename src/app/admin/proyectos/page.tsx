'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Cloud,
  ExternalLink,
  FolderOpen,
  Heart,
  ImagePlus,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

type CloudinaryAsset = {
  id: string;
  public_id: string;
  url: string;
  format?: string;
  size_bytes?: number;
  created_at?: string;
  width?: number;
  height?: number;
};

type StudioCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  sort_order?: number;
};

type StudioMedia = {
  id: string;
  public_id: string;
  cloudinary_url: string;
  folder?: string;
  category_slug?: string;
  title?: string;
  story?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  keywords?: unknown;
  social?: unknown;
  is_favorite?: boolean;
  is_published?: boolean;
  sort_order?: number;
  updated_at?: string;
};

type StudioComment = {
  id: string;
  media_id: string;
  author_name?: string;
  body: string;
  is_resolved?: boolean;
  created_at?: string;
};

type StudioState = {
  ready: boolean;
  categories: StudioCategory[];
  media: StudioMedia[];
  comments: StudioComment[];
};

type EditorDraft = {
  id?: string;
  public_id: string;
  cloudinary_url: string;
  folder: string;
  category_slug: string;
  title: string;
  story: string;
  description: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
  social: Record<string, string>;
  is_favorite: boolean;
  is_published: boolean;
  sort_order: number;
};

const DEFAULT_CATEGORIES = [
  { id: 'ideas', name: 'Ideas', slug: 'ideas', color: '#FDE047' },
  { id: 'remodelacion', name: 'Remodelación', slug: 'remodelacion', color: '#FB923C' },
  { id: 'interiores', name: 'Interiores', slug: 'interiores', color: '#F7EFD9' },
];

function listOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function socialOf(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === 'string')
      .map(([key, item]) => [key, item as string]),
  );
}

function titleFromId(publicId: string) {
  const last = publicId.split('/').pop() || publicId;
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDraft(asset: CloudinaryAsset, meta?: StudioMedia, fallbackFolder = 'fabrick/proyectos'): EditorDraft {
  return {
    id: meta?.id,
    public_id: asset.public_id,
    cloudinary_url: asset.url,
    folder: meta?.folder || fallbackFolder,
    category_slug: meta?.category_slug || 'ideas',
    title: meta?.title || titleFromId(asset.public_id),
    story: meta?.story || '',
    description: meta?.description || '',
    seo_title: meta?.seo_title || '',
    seo_description: meta?.seo_description || '',
    keywords: listOfStrings(meta?.keywords),
    social: socialOf(meta?.social),
    is_favorite: Boolean(meta?.is_favorite),
    is_published: meta?.is_published !== false,
    sort_order: typeof meta?.sort_order === 'number' ? meta.sort_order : 0,
  };
}

function statusText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminProyectosPage() {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [studio, setStudio] = useState<StudioState>({ ready: true, categories: [], media: [], comments: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folder, setFolder] = useState('fabrick');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'library' | 'favorites' | 'categories'>('library');
  const [selected, setSelected] = useState<CloudinaryAsset | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [comment, setComment] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const categories = studio.categories.length ? studio.categories : DEFAULT_CATEGORIES;
  const metadataByPublicId = useMemo(
    () => new Map(studio.media.map((item) => [item.public_id, item])),
    [studio.media],
  );

  const loadStudio = useCallback(async (): Promise<StudioState | undefined> => {
    const response = await fetch('/api/admin/project-studio', { cache: 'no-store' });
    const data = await response.json().catch(() => ({})) as Partial<StudioState> & { error?: string; setupRequired?: boolean };
    if (!response.ok) {
      if (data.setupRequired) {
        const pending = { ready: false, categories: [], media: [], comments: [] };
        setStudio(pending);
        return pending;
      }
      throw new Error(data.error || 'No se pudo cargar la información editorial.');
    }
    const next = {
      ready: true,
      categories: data.categories || [],
      media: data.media || [],
      comments: data.comments || [],
    };
    setStudio(next);
    return next;
  }, []);

  const load = useCallback(async (folderValue = folder) => {
    setLoading(true);
    setError('');
    try {
      const [cloudResult, studioResult] = await Promise.allSettled([
        fetch('/api/admin/cloudinary?folder=' + encodeURIComponent(folderValue) + '&max_results=100', { cache: 'no-store' })
          .then(async (response) => {
            const data = await response.json().catch(() => ({})) as { assets?: CloudinaryAsset[]; error?: string };
            if (!response.ok) throw new Error(data.error || 'No se pudo contactar Cloudinary.');
            return data.assets || [];
          }),
        loadStudio(),
      ]);
      if (cloudResult.status === 'fulfilled') setAssets(cloudResult.value);
      else throw cloudResult.reason;
      if (studioResult.status === 'rejected') setError(statusText(studioResult.reason, 'No se cargó el catálogo editorial.'));
    } catch (reason) {
      setError(statusText(reason, 'No se pudieron cargar las imágenes de Cloudinary.'));
    } finally {
      setLoading(false);
    }
  }, [folder, loadStudio]);

  useEffect(() => {
    void load();
  }, []); // First load only; changing the folder waits for the explicit refresh button.

  const visibleAssets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return assets.filter((asset) => {
      const meta = metadataByPublicId.get(asset.public_id);
      const favorite = Boolean(meta?.is_favorite);
      if (view === 'favorites' && !favorite) return false;
      if (!normalized) return true;
      const haystack = [
        asset.public_id,
        meta?.title,
        meta?.category_slug,
        meta?.description,
        ...listOfStrings(meta?.keywords),
      ].join(' ').toLocaleLowerCase('es');
      return haystack.includes(normalized);
    });
  }, [assets, metadataByPublicId, query, view]);

  const selectedComments = useMemo(
    () => draft?.id ? studio.comments.filter((item) => item.media_id === draft.id) : [],
    [draft?.id, studio.comments],
  );

  function openEditor(asset: CloudinaryAsset) {
    const meta = metadataByPublicId.get(asset.public_id);
    setSelected(asset);
    setDraft(toDraft(asset, meta, folder));
    setComment('');
    setNotice('');
  }

  function closeEditor() {
    setSelected(null);
    setDraft(null);
    setComment('');
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/project-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'media', data: draft }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la ficha.');
      const next = await loadStudio();
      const saved = next?.media.find((item) => item.public_id === draft.public_id);
      if (saved && selected) setDraft(toDraft(selected, saved, folder));
      setNotice('Ficha guardada. La galería pública seguirá funcionando incluso si este catálogo no está disponible.');
    } catch (reason) {
      setError(statusText(reason, 'No se pudo guardar la ficha.'));
    } finally {
      setSaving(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: CloudinaryAsset[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folder || 'fabrick/proyectos');
        const response = await fetch('/api/admin/cloudinary', { method: 'POST', body: form });
        const data = await response.json().catch(() => ({})) as { asset?: CloudinaryAsset; error?: string };
        if (!response.ok || !data.asset) throw new Error(data.error || 'No se pudo subir una de las imágenes.');
        uploaded.push(data.asset);
      }
      setAssets((current) => [...uploaded, ...current.filter((item) => !uploaded.some((added) => added.public_id === item.public_id))]);
      if (uploaded[0]) openEditor(uploaded[0]);
      setNotice(uploaded.length === 1 ? 'Imagen subida a Cloudinary. Completa su ficha editorial.' : uploaded.length + ' imágenes subidas a Cloudinary.');
    } catch (reason) {
      setError(statusText(reason, 'No se pudieron subir las imágenes.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function createCategory() {
    const name = categoryName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/project-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'category', data: { name, description: 'Colección de proyectos Fabrick' } }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la categoría.');
      await loadStudio();
      setCategoryName('');
      setNotice('Categoría creada y disponible para las nuevas fichas.');
    } catch (reason) {
      setError(statusText(reason, 'No se pudo crear la categoría.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: StudioCategory) {
    if (!window.confirm('¿Quitar "' + category.name + '"? Las imágenes no se borrarán de Cloudinary.')) return;
    try {
      const response = await fetch('/api/admin/project-studio?entity=category&id=' + encodeURIComponent(category.id), { method: 'DELETE' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo quitar la categoría.');
      await loadStudio();
      setNotice('Categoría eliminada. Las fichas que la usaban siguen disponibles para reasignar.');
    } catch (reason) {
      setError(statusText(reason, 'No se pudo eliminar la categoría.'));
    }
  }

  async function addComment() {
    if (!draft?.id || !comment.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/project-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', data: { media_id: draft.id, body: comment, author_name: 'Equipo Fabrick' } }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el comentario.');
      await loadStudio();
      setComment('');
    } catch (reason) {
      setError(statusText(reason, 'No se pudo guardar el comentario.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleComment(item: StudioComment) {
    try {
      const response = await fetch('/api/admin/project-studio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'comment', id: item.id, data: { is_resolved: !item.is_resolved } }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el comentario.');
      await loadStudio();
    } catch (reason) {
      setError(statusText(reason, 'No se pudo actualizar el comentario.'));
    }
  }

  const favoriteCount = studio.media.filter((item) => item.is_favorite).length;
  const unresolvedCount = studio.comments.filter((item) => !item.is_resolved).length;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-7 text-[#fff9ef] sm:px-7 lg:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_8%,rgba(253,224,71,.18),transparent_26rem),radial-gradient(circle_at_94%_22%,rgba(251,146,60,.16),transparent_27rem),linear-gradient(145deg,rgba(8,7,5,.94),rgba(24,16,7,.88))]" />

      <header className="mx-auto flex max-w-[1600px] flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.26em] text-yellow-200"><Sparkles className="h-3.5 w-3.5" /> Estudio de proyectos</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.055em] text-white sm:text-4xl">Controla tu biblioteca visual sin arriesgar la galería pública.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f5e9d5]/65">Sube fotos a Cloudinary, organízalas por colección y deja a tu equipo una historia, SEO, enlaces y comentarios internos para cada referencia.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Cloudinary" value={assets.length} icon={<Cloud className="h-4 w-4" />} />
          <Metric label="Favoritas" value={favoriteCount} icon={<Heart className="h-4 w-4" />} />
          <Metric label="Por revisar" value={unresolvedCount} icon={<MessageSquare className="h-4 w-4" />} />
        </div>
      </header>

      <section className="mx-auto mt-7 max-w-[1600px]">
        {!studio.ready ? (
          <div className="mb-5 flex flex-col gap-3 bg-yellow-300/[.12] p-4 text-sm text-yellow-50 ring-1 ring-yellow-200/25 sm:flex-row sm:items-center sm:justify-between">
            <div><b>Activa el catálogo editorial una sola vez.</b><span className="mt-1 block text-xs text-yellow-100/70">Las imágenes se pueden seguir subiendo; crea las tablas para guardar categorías, SEO, favoritos y comentarios.</span></div>
            <a href="/admin/setup" className="inline-flex shrink-0 items-center justify-center gap-2 bg-yellow-300 px-4 py-2.5 text-xs font-black text-black transition hover:bg-white"><Settings2 className="h-4 w-4" /> Preparar catálogo</a>
          </div>
        ) : null}
        {error ? <div className="mb-5 flex items-start gap-2 bg-red-500/10 p-4 text-sm text-red-100 ring-1 ring-red-400/30"><X className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
        {notice ? <div className="mb-5 flex items-start gap-2 bg-emerald-400/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-300/25"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div> : null}

        <div className="flex flex-col gap-3 bg-black/30 p-3 backdrop-blur-xl ring-1 ring-white/10 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 bg-white/[.055] px-3 py-3 ring-1 ring-white/10 focus-within:ring-yellow-300/50">
            <Search className="h-4 w-4 shrink-0 text-yellow-200" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por foto, título, palabra clave…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
          </label>
          <label className="flex min-w-0 items-center gap-2 bg-white/[.055] px-3 py-3 ring-1 ring-white/10">
            <FolderOpen className="h-4 w-4 shrink-0 text-yellow-200" />
            <input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="fabrick/proyectos" className="min-w-0 bg-transparent text-xs font-bold text-white outline-none placeholder:text-white/35" />
          </label>
          <button type="button" onClick={() => void load(folder)} disabled={loading} className="inline-flex items-center justify-center gap-2 bg-white/[.07] px-4 py-3 text-xs font-black text-white transition hover:bg-white hover:text-black disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Actualizar</button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 bg-[linear-gradient(100deg,#fde047,#fb923c)] px-4 py-3 text-xs font-black text-black transition hover:brightness-110">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Subir imágenes
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" className="hidden" onChange={(event) => void upload(event.target.files)} />
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="min-w-0 bg-black/25 p-4 ring-1 ring-white/10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <TabButton active={view === 'library'} onClick={() => setView('library')} icon={<Cloud className="h-3.5 w-3.5" />}>Biblioteca</TabButton>
              <TabButton active={view === 'favorites'} onClick={() => setView('favorites')} icon={<Heart className="h-3.5 w-3.5" />}>Favoritos</TabButton>
              <TabButton active={view === 'categories'} onClick={() => setView('categories')} icon={<Tag className="h-3.5 w-3.5" />}>Categorías</TabButton>
              <span className="ml-auto text-[10px] font-black uppercase tracking-[.16em] text-white/40">{visibleAssets.length} imágenes</span>
            </div>

            {view === 'categories' ? (
              <CategoriesPanel categories={categories} value={categoryName} onChange={setCategoryName} onCreate={() => void createCategory()} onDelete={(category) => void deleteCategory(category)} saving={saving} />
            ) : loading && !assets.length ? (
              <div className="grid min-h-[360px] place-items-center bg-white/[.035] text-sm text-white/50"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-yellow-200" />Leyendo Cloudinary…</span></div>
            ) : visibleAssets.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {visibleAssets.map((asset) => {
                  const meta = metadataByPublicId.get(asset.public_id);
                  const isSelected = selected?.public_id === asset.public_id;
                  return (
                    <button key={asset.public_id} type="button" onClick={() => openEditor(asset)} className={'group overflow-hidden bg-[#15100a] text-left transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ' + (isSelected ? 'ring-2 ring-yellow-300' : 'ring-1 ring-white/10 hover:-translate-y-0.5 hover:ring-yellow-200/50')}>
                      <div className="relative aspect-[4/3] overflow-hidden bg-black">
                        <img src={asset.url} alt={meta?.title || titleFromId(asset.public_id)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        {meta?.is_favorite ? <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-yellow-300 text-black shadow-lg"><Heart className="h-3.5 w-3.5 fill-current" /></span> : null}
                        <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate bg-black/60 px-2 py-1 text-[8px] font-black uppercase tracking-[.16em] text-yellow-100">{meta?.category_slug || 'Sin categoría'}</span>
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-xs font-black leading-4 text-white">{meta?.title || titleFromId(asset.public_id)}</p>
                        <p className="mt-1 truncate text-[10px] text-white/42">{meta?.seo_title ? 'SEO listo' : 'Completar ficha'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState folder={folder} />
            )}
          </section>

          <EditorPanel
            asset={selected}
            draft={draft}
            categories={categories}
            comments={selectedComments}
            comment={comment}
            saving={saving}
            onClose={closeEditor}
            onChange={setDraft}
            onSave={() => void saveDraft()}
            onCommentChange={setComment}
            onAddComment={() => void addComment()}
            onToggleComment={(item) => void toggleComment(item)}
          />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="min-w-[100px] bg-black/30 px-3 py-2.5 ring-1 ring-white/10"><span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-yellow-100/70">{icon}{label}</span><b className="mt-1 block text-lg leading-none text-white">{value}</b></div>;
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={'inline-flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[.15em] transition ' + (active ? 'bg-yellow-300 text-black' : 'bg-white/[.055] text-white/60 hover:bg-white/10 hover:text-white')}>{icon}{children}</button>;
}

function EmptyState({ folder }: { folder: string }) {
  return <div className="grid min-h-[360px] place-items-center bg-white/[.035] p-8 text-center ring-1 ring-white/10"><div><Cloud className="mx-auto h-9 w-9 text-yellow-200" /><h2 className="mt-4 text-xl font-black text-white">Aún no hay imágenes en esta carpeta</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/55">Sube una foto a <b className="text-yellow-100">{folder || 'fabrick/proyectos'}</b> y crea su ficha editorial desde este mismo panel.</p></div></div>;
}

function CategoriesPanel({ categories, value, onChange, onCreate, onDelete, saving }: { categories: StudioCategory[]; value: string; onChange: (value: string) => void; onCreate: () => void; onDelete: (category: StudioCategory) => void; saving: boolean }) {
  return <div className="grid gap-3 lg:grid-cols-2">
    <div className="bg-white/[.04] p-5 ring-1 ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-100">Nueva colección</p>
      <h2 className="mt-2 text-xl font-black text-white">Ordena las ideas como te resulte natural.</h2>
      <div className="mt-5 flex gap-2">
        <input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onCreate(); }} placeholder="Ej. Cocinas a medida" className="min-w-0 flex-1 bg-black/35 px-3 py-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-yellow-300/60" />
        <button type="button" onClick={onCreate} disabled={saving || !value.trim()} className="grid w-12 place-items-center bg-yellow-300 text-black disabled:opacity-40"><Plus className="h-5 w-5" /></button>
      </div>
    </div>
    <div className="grid gap-2">
      {categories.map((category) => <div key={category.id} className="flex items-center gap-3 bg-black/30 p-3 ring-1 ring-white/10"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#FDE047' }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{category.name}</p><p className="truncate text-[10px] text-white/45">/{category.slug}</p></div>{category.id.length > 10 ? <button type="button" onClick={() => onDelete(category)} className="grid h-8 w-8 place-items-center text-white/35 transition hover:bg-red-500/15 hover:text-red-200" aria-label={'Eliminar ' + category.name}><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>)}
    </div>
  </div>;
}

function EditorPanel({ asset, draft, categories, comments, comment, saving, onClose, onChange, onSave, onCommentChange, onAddComment, onToggleComment }: {
  asset: CloudinaryAsset | null;
  draft: EditorDraft | null;
  categories: StudioCategory[];
  comments: StudioComment[];
  comment: string;
  saving: boolean;
  onClose: () => void;
  onChange: (value: EditorDraft | null) => void;
  onSave: () => void;
  onCommentChange: (value: string) => void;
  onAddComment: () => void;
  onToggleComment: (item: StudioComment) => void;
}) {
  if (!asset || !draft) {
    return <aside className="grid min-h-[430px] place-items-center bg-black/25 p-8 text-center ring-1 ring-white/10"><div><ImagePlus className="mx-auto h-9 w-9 text-yellow-200" /><h2 className="mt-4 text-xl font-black text-white">Selecciona una imagen</h2><p className="mt-2 max-w-xs text-sm leading-6 text-white/55">Aquí crearás la historia, categoría, SEO, enlaces y conversación de tu equipo.</p></div></aside>;
  }
  const set = <K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) => onChange({ ...draft, [key]: value });
  const social = (key: string, value: string) => set('social', { ...draft.social, [key]: value });
  return <aside className="min-w-0 bg-[#120e09]/95 ring-1 ring-yellow-200/20">
    <div className="sticky top-2 z-10 flex items-center justify-between gap-3 bg-[#171109]/95 p-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3"><img src={asset.url} alt="" className="h-11 w-11 object-cover" /><div className="min-w-0"><p className="truncate text-sm font-black text-white">{draft.title || titleFromId(asset.public_id)}</p><p className="truncate text-[10px] text-yellow-100/60">{asset.public_id}</p></div></div>
      <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center bg-white/[.07] text-white/70 transition hover:bg-white hover:text-black" aria-label="Cerrar editor"><X className="h-4 w-4" /></button>
    </div>
    <div className="max-h-[calc(100vh-9rem)] space-y-5 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center gap-2 bg-white/[.055] p-3 text-xs font-bold text-white"><input type="checkbox" checked={draft.is_favorite} onChange={(event) => set('is_favorite', event.target.checked)} className="accent-yellow-300" /><Heart className={'h-4 w-4 ' + (draft.is_favorite ? 'fill-yellow-300 text-yellow-300' : 'text-white/45')} /> Favorita</label>
        <label className="flex cursor-pointer items-center gap-2 bg-white/[.055] p-3 text-xs font-bold text-white"><input type="checkbox" checked={draft.is_published} onChange={(event) => set('is_published', event.target.checked)} className="accent-yellow-300" /> Pública</label>
      </div>
      <Field label="Título visible"><input value={draft.title} onChange={(event) => set('title', event.target.value)} className="studio-input" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría"><select value={draft.category_slug} onChange={(event) => set('category_slug', event.target.value)} className="studio-input">{categories.map((category) => <option key={category.slug} value={category.slug} className="bg-[#171109]">{category.name}</option>)}</select></Field>
        <Field label="Orden"><input type="number" value={draft.sort_order} onChange={(event) => set('sort_order', Number(event.target.value))} className="studio-input" /></Field>
      </div>
      <Field label="Historia de la imagen"><textarea value={draft.story} onChange={(event) => set('story', event.target.value)} rows={4} placeholder="Cuenta el antes, la decisión de diseño o el resultado…" className="studio-input resize-y" /></Field>
      <Field label="Descripción corta"><textarea value={draft.description} onChange={(event) => set('description', event.target.value)} rows={3} placeholder="Resumen para la ficha pública." className="studio-input resize-y" /></Field>
      <div className="bg-yellow-300/[.07] p-4 ring-1 ring-yellow-200/15">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-100">SEO y difusión</p>
        <div className="mt-3 space-y-3">
          <Field label="Título SEO"><input value={draft.seo_title} maxLength={120} onChange={(event) => set('seo_title', event.target.value)} className="studio-input" /></Field>
          <Field label="Descripción SEO"><textarea value={draft.seo_description} maxLength={320} onChange={(event) => set('seo_description', event.target.value)} rows={3} className="studio-input resize-y" /></Field>
          <Field label="Palabras clave"><input value={draft.keywords.join(', ')} onChange={(event) => set('keywords', event.target.value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 24))} placeholder="cocina, remodelación, Maule…" className="studio-input" /></Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Instagram"><input value={draft.social.instagram || ''} onChange={(event) => social('instagram', event.target.value)} placeholder="https://…" className="studio-input" /></Field>
            <Field label="Facebook"><input value={draft.social.facebook || ''} onChange={(event) => social('facebook', event.target.value)} placeholder="https://…" className="studio-input" /></Field>
            <Field label="Pinterest"><input value={draft.social.pinterest || ''} onChange={(event) => social('pinterest', event.target.value)} placeholder="https://…" className="studio-input" /></Field>
            <Field label="WhatsApp"><input value={draft.social.whatsapp || ''} onChange={(event) => social('whatsapp', event.target.value)} placeholder="https://…" className="studio-input" /></Field>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 bg-white/[.07] px-3 py-3 text-xs font-black text-white transition hover:bg-white hover:text-black"><ExternalLink className="h-3.5 w-3.5" /> Original</a>
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex flex-[1.35] items-center justify-center gap-2 bg-[linear-gradient(100deg,#fde047,#fb923c)] px-3 py-3 text-xs font-black text-black transition hover:brightness-110 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar ficha</button>
      </div>
      <section className="border-t border-white/10 pt-5">
        <div className="flex items-center justify-between"><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-yellow-100"><MessageSquare className="h-3.5 w-3.5" /> Comentarios del equipo</p><span className="text-[10px] text-white/40">{comments.length}</span></div>
        {draft.id ? <><div className="mt-3 flex gap-2"><input value={comment} onChange={(event) => onCommentChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAddComment(); }} placeholder="Deja una indicación para el equipo…" className="studio-input min-w-0 flex-1" /><button type="button" onClick={onAddComment} disabled={!comment.trim() || saving} className="grid w-11 place-items-center bg-yellow-300 text-black disabled:opacity-40"><Send className="h-4 w-4" /></button></div><div className="mt-3 space-y-2">{comments.length ? comments.map((item) => <button key={item.id} type="button" onClick={() => onToggleComment(item)} className={'w-full p-3 text-left ring-1 transition ' + (item.is_resolved ? 'bg-emerald-400/[.07] ring-emerald-300/15' : 'bg-white/[.045] ring-white/10 hover:ring-yellow-200/35')}><span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[.14em] text-yellow-100/70"><span>{item.author_name || 'Equipo Fabrick'}</span><span>{item.is_resolved ? 'Resuelto' : 'Pendiente'}</span></span><p className="mt-1 text-xs leading-5 text-white/75">{item.body}</p></button>) : <p className="py-3 text-xs leading-5 text-white/45">Sin comentarios todavía. Úsalo para revisiones de foto, copy o publicación.</p>}</div></> : <p className="mt-3 text-xs leading-5 text-white/45">Guarda primero la ficha para iniciar una conversación grupal sobre esta imagen.</p>}
      </section>
    </div>
    <style jsx>{'.studio-input{width:100%;background:rgba(255,255,255,.055);padding:.7rem .75rem;color:#fff;outline:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}.studio-input:focus{box-shadow:inset 0 0 0 1px rgba(253,224,71,.7)}.studio-input::placeholder{color:rgba(255,255,255,.35)}'}</style>
  </aside>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.16em] text-white/48">{label}</span>{children}</label>;
}
