'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FolderPlus,
  Globe2,
  Images,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

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
  album_keywords?: string[];
  album_primary_keyword?: string;
  album_seo_title?: string;
  album_seo_description?: string;
  album_image_caption?: string;
  album_interest_score?: number;
  album_interest_label?: string;
  album_organization?: string;
  album_cover?: boolean;
  sort_order?: number;
  url: string;
  thumb: string;
  tags?: string[];
};

type Album = {
  key: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  count: number;
  hashtags?: string[];
  keywords?: string[];
  primaryKeyword?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageSearchCaption?: string;
  interestScore?: number;
  interestLabel?: string;
  organizationSummary?: string;
};

type AlbumOption = {
  albumTitle: string;
  albumDescription: string;
  category: string;
  hashtags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  imageSearchCaption: string;
  interestScore: number;
  interestLabel: string;
  organizationSummary: string;
  suggestedOrder: number[];
  coverIndex: number;
};

type ImageSuggestion = {
  index: number;
  title: string;
  description: string;
  alt: string;
  hashtags: string[];
  keywords: string[];
  interestScore: number;
  interestLabel: string;
};

type AlbumEdit = {
  key: string;
  title: string;
  description: string;
  category: string;
  hashtags: string[];
  keywords: string[];
  primaryKeyword: string;
  seoTitle: string;
  seoDescription: string;
  imageSearchCaption: string;
  interestScore: number;
  interestLabel: string;
  organizationSummary: string;
};

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;
type Stage = 'select' | 'analyzing' | 'review' | 'publishing';

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
function fileKey(file: File) { return `${file.name}-${file.size}-${file.lastModified}`; }
function titleFromFile(file?: File) {
  const value = file?.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Nuevo proyecto visual';
  return value.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120);
}
function uniqueWords(value: string) {
  return Array.from(new Set(value.split(/[\n,]+/).map((item) => item.replace(/^#/, '').trim()).filter(Boolean))).slice(0, 18);
}
function tagList(value: string) {
  return Array.from(new Set(value.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))).slice(0, 20);
}
function scoreLabel(score: number) { return score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo'; }

function Stars({ score, compact = false }: { score: number; compact?: boolean }) {
  const value = Math.min(5, Math.max(1, Math.round(score || 3)));
  return <span className="inline-flex items-center gap-0.5" aria-label={`Interés estimado ${value} de 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${index < value ? 'fill-[#c77a00] text-[#c77a00]' : 'text-current opacity-20'}`} />)}</span>;
}

async function fileToAnalysisDataUrl(file: File) {
  if (typeof createImageBitmap !== 'function') {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const maxSide = 960;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No fue posible preparar una imagen para el análisis.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.72);
}

export default function AdminProjectsStudioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverKey, setCoverKey] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumSlug, setAlbumSlug] = useState('');
  const [category, setCategory] = useState('ideas');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [imageSearchCaption, setImageSearchCaption] = useState('');
  const [interestScore, setInterestScore] = useState(3);
  const [interestLabel, setInterestLabel] = useState('Medio');
  const [organizationSummary, setOrganizationSummary] = useState('');
  const [options, setOptions] = useState<AlbumOption[]>([]);
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<AlbumEdit | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingKey, setDeletingKey] = useState('');
  const progressTimer = useRef<number | null>(null);

  function notify(text: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4200);
  }

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
      const json = await response.json() as { assets?: Asset[]; albums?: Album[]; warning?: string; error?: string };
      setAssets(json.assets || []);
      setAlbums(json.albums || []);
      if (json.warning || json.error) notify(json.warning || json.error || '', 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar el portafolio.', 'error');
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
  useEffect(() => () => { if (progressTimer.current) window.clearInterval(progressTimer.current); }, []);

  const albumAssets = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of assets) map.set(asset.album, [...(map.get(asset.album) || []), asset]);
    for (const [key, items] of map) map.set(key, items.sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)));
    return map;
  }, [assets]);

  const filteredAlbums = useMemo(() => {
    const value = query.trim().toLowerCase();
    return albums.filter((album) => !value || `${album.title} ${album.description} ${album.category} ${(album.hashtags || []).join(' ')} ${(album.keywords || []).join(' ')}`.toLowerCase().includes(value));
  }, [albums, query]);

  function resetAnalysis() {
    setOptions([]);
    setImageSuggestions([]);
    setSelectedOption(null);
    setStage('select');
    setProgress(0);
    setProgressText('');
  }

  function resetCreate() {
    setFiles([]);
    setCoverKey('');
    setAlbumTitle('');
    setAlbumSlug('');
    setCategory('ideas');
    setDescription('');
    setHashtags('');
    setKeywords('');
    setPrimaryKeyword('');
    setSeoTitle('');
    setSeoDescription('');
    setImageSearchCaption('');
    setInterestScore(3);
    setInterestLabel('Medio');
    setOrganizationSummary('');
    resetAnalysis();
  }

  function chooseFiles(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list).filter((file) => file.type.startsWith('image/') && file.size <= 12 * 1024 * 1024);
    const next = Array.from(new Map([...files, ...selected].map((file) => [fileKey(file), file])).values()).slice(0, 20);
    setFiles(next);
    resetAnalysis();
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
    resetAnalysis();
    if (removed && coverKey === fileKey(removed)) setCoverKey(next[0] ? fileKey(next[0]) : '');
  }

  function moveFile(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    setFiles(next);
    resetAnalysis();
  }

  function startProgress(text: string) {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    setProgress(8);
    setProgressText(text);
    progressTimer.current = window.setInterval(() => setProgress((value) => value >= 90 ? value : Math.min(90, value + Math.max(1, Math.round((92 - value) / 10)))), 420);
  }
  function finishProgress() {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    progressTimer.current = null;
    setProgress(100);
  }

  async function analyzeSelection() {
    if (!files.length) return notify('Selecciona imágenes para crear un proyecto.', 'error');
    setStage('analyzing');
    startProgress('Preparando referencias para el análisis visual…');
    try {
      const imageDataUrls: string[] = [];
      for (let index = 0; index < Math.min(8, files.length); index += 1) {
        setProgressText(`Preparando imagen ${index + 1} de ${Math.min(8, files.length)}…`);
        imageDataUrls.push(await fileToAnalysisDataUrl(files[index]));
      }
      setProgressText('La IA está proponiendo estilo, orden, portada, SEO y texto para imágenes…');
      const response = await fetch('/api/proyectos/ai-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrls, fileNames: files.slice(0, 8).map((file) => file.name), albumTitle: albumTitle.trim() || titleFromFile(files[0]), category }),
      });
      const json = await response.json() as { albumOptions?: AlbumOption[]; images?: ImageSuggestion[]; warning?: string; error?: string };
      if (!response.ok) throw new Error(json.error || 'No fue posible analizar las imágenes.');
      setOptions((json.albumOptions || []).slice(0, 2));
      setImageSuggestions(json.images || []);
      finishProgress();
      setStage('review');
      if (json.warning) notify(json.warning, 'info');
    } catch (error) {
      finishProgress();
      setStage('select');
      notify(error instanceof Error ? error.message : 'No se pudo completar el análisis.', 'error');
    }
  }

  function applyOption(option: AlbumOption, optionIndex: number) {
    const order = option.suggestedOrder.map((position) => position - 1).filter((index) => files[index]);
    const reorderedFiles = order.length === files.length ? order.map((index) => files[index]) : files;
    const selectedCoverFile = files[Math.max(0, option.coverIndex - 1)] || files[0];
    const suggestionsByOriginalIndex = new Map(imageSuggestions.map((item) => [item.index - 1, item]));
    const reorderedSuggestions = order.length === files.length
      ? order.map((index, nextIndex) => ({ ...(suggestionsByOriginalIndex.get(index) || imageSuggestions[index]), index: nextIndex + 1 })).filter(Boolean) as ImageSuggestion[]
      : imageSuggestions;
    setFiles(reorderedFiles);
    setImageSuggestions(reorderedSuggestions);
    setCoverKey(selectedCoverFile ? fileKey(selectedCoverFile) : '');
    setSelectedOption(optionIndex);
    setAlbumTitle(option.albumTitle);
    setAlbumSlug(slugify(option.albumTitle));
    setDescription(option.albumDescription);
    setCategory(option.category);
    setHashtags(option.hashtags.join(' '));
    setKeywords(option.secondaryKeywords.join('\n'));
    setPrimaryKeyword(option.primaryKeyword);
    setSeoTitle(option.seoTitle);
    setSeoDescription(option.seoDescription);
    setImageSearchCaption(option.imageSearchCaption);
    setInterestScore(option.interestScore);
    setInterestLabel(option.interestLabel);
    setOrganizationSummary(option.organizationSummary);
    notify(`Estilo ${optionIndex + 1} aplicado. Puedes editarlo antes de publicar.`);
  }

  function updateImageSuggestion(index: number, patch: Partial<ImageSuggestion>) {
    setImageSuggestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function publishAlbum() {
    if (selectedOption === null) return notify('Primero selecciona uno de los estilos propuestos por la IA.', 'error');
    if (!files.length || !albumTitle.trim()) return notify('Falta el nombre del proyecto o sus imágenes.', 'error');
    setStage('publishing');
    setProgress(3);
    const slug = albumSlug || slugify(albumTitle);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const suggestion = imageSuggestions[index] || { index: index + 1, title: titleFromFile(file), description, alt: `${albumTitle} · referencia ${index + 1}`, hashtags: tagList(hashtags), keywords: uniqueWords(keywords), interestScore, interestLabel };
        setProgress(Math.round(((index + 0.25) / files.length) * 100));
        setProgressText(`Publicando ${index + 1} de ${files.length}: ${file.name}`);
        const form = new FormData();
        form.set('file', file);
        form.set('album', slug);
        form.set('albumTitle', albumTitle.trim());
        form.set('albumDescription', description.trim());
        form.set('category', category);
        form.set('title', suggestion.title);
        form.set('description', suggestion.description);
        form.set('alt', suggestion.alt);
        form.set('hashtags', [...suggestion.hashtags, ...suggestion.keywords.map(slugify)].join(' '));
        form.set('albumHashtags', tagList(hashtags).join(' '));
        form.set('albumKeywords', uniqueWords(keywords).join(','));
        form.set('primaryKeyword', primaryKeyword);
        form.set('seoTitle', seoTitle);
        form.set('seoDescription', seoDescription);
        form.set('imageSearchCaption', imageSearchCaption);
        form.set('interestScore', String(interestScore));
        form.set('interestLabel', interestLabel);
        form.set('organizationSummary', organizationSummary);
        form.set('sortOrder', String(index));
        form.set('albumCover', String(fileKey(file) === coverKey));
        const response = await fetch('/api/proyectos/cloudinary', { method: 'POST', body: form });
        const json = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo publicar ${file.name}.`);
      }
      setProgress(100);
      notify(`${files.length} imágenes publicadas dentro de “${albumTitle}”.`);
      resetCreate();
      await reload();
    } catch (error) {
      setStage('review');
      notify(error instanceof Error ? error.message : 'No se pudo publicar el proyecto.', 'error');
    }
  }

  function openEditor(album: Album) {
    setEditing({
      key: album.key,
      title: album.title,
      description: album.description,
      category: album.category,
      hashtags: album.hashtags || [],
      keywords: album.keywords || [],
      primaryKeyword: album.primaryKeyword || '',
      seoTitle: album.seoTitle || '',
      seoDescription: album.seoDescription || '',
      imageSearchCaption: album.imageSearchCaption || '',
      interestScore: album.interestScore || 3,
      interestLabel: album.interestLabel || scoreLabel(album.interestScore || 3),
      organizationSummary: album.organizationSummary || '',
    });
  }

  async function saveExistingAlbum() {
    if (!editing) return;
    const items = albumAssets.get(editing.key) || [];
    if (!items.length) return notify('No encontramos imágenes para este proyecto.', 'error');
    setSavingEdit(true);
    try {
      for (let index = 0; index < items.length; index += 1) {
        const asset = items[index];
        const response = await fetch('/api/proyectos/cloudinary', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: asset.public_id,
            title: asset.title,
            description: asset.description || '',
            alt: asset.alt || asset.title,
            category: editing.category,
            album: editing.key,
            albumTitle: editing.title,
            albumDescription: editing.description,
            hashtags: asset.tags || [],
            albumHashtags: editing.hashtags,
            albumKeywords: editing.keywords,
            primaryKeyword: editing.primaryKeyword,
            seoTitle: editing.seoTitle,
            seoDescription: editing.seoDescription,
            imageSearchCaption: editing.imageSearchCaption,
            interestScore: editing.interestScore,
            interestLabel: editing.interestLabel,
            organizationSummary: editing.organizationSummary,
            sortOrder: Number(asset.sort_order || index),
            albumCover: Boolean(asset.album_cover),
          }),
        });
        const json = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo actualizar ${asset.title}.`);
      }
      notify(`Proyecto “${editing.title}” actualizado.`);
      setEditing(null);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar el proyecto.', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteAlbum(album: Album) {
    const items = albumAssets.get(album.key) || [];
    if (!items.length) return;
    if (!window.confirm(`¿Eliminar “${album.title}” y sus ${items.length} imágenes? Esta acción elimina los archivos publicados de Cloudinary.`)) return;
    setDeletingKey(album.key);
    try {
      for (const asset of items) {
        const response = await fetch(`/api/proyectos/cloudinary?public_id=${encodeURIComponent(asset.public_id)}`, { method: 'DELETE' });
        const json = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo eliminar ${asset.title}.`);
      }
      notify(`Proyecto “${album.title}” eliminado.`);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar el proyecto.', 'error');
    } finally {
      setDeletingKey('');
    }
  }

  const selectedCoverIndex = files.findIndex((file) => fileKey(file) === coverKey);
  const seoReady = albums.filter((album) => album.seoTitle && album.seoDescription && album.primaryKeyword && album.imageSearchCaption).length;

  return (
    <AdminPage className="pb-6">
      <AdminPageHeader
        eyebrow="Web & contenido · Proyectos"
        title="Estudio de proyectos"
        description="Crea álbumes visuales, deja que la IA proponga estilos y metadata, revisa cada imagen y administra el portafolio que ven clientes, buscadores y asistentes de IA."
        actions={(
          <>
            <Link href="/admin/modelos-ia" className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 text-xs font-bold text-[#514c43]"><Bot className="h-4 w-4 text-[#c77a00]" /> Modelos IA</Link>
            <Link href="/admin/integraciones" className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 text-xs font-bold text-[#514c43]"><Settings2 className="h-4 w-4 text-[#c77a00]" /> Integraciones</Link>
            <Link href="/proyectos" target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#171612] px-3 text-xs font-bold text-[#ffb000]">Ver público <ExternalLink className="h-4 w-4" /></Link>
          </>
        )}
      />

      <AdminStats>
        <AdminStat label="Proyectos" value={albums.length} note="Álbumes publicados" icon={FolderPlus} />
        <AdminStat label="Imágenes" value={assets.length} note="Recursos visuales indexables" icon={Images} />
        <AdminStat label="SEO listo" value={`${seoReady}/${albums.length}`} note="Título, descripción, keyword y caption" icon={Globe2} />
        <AdminStat label="Flujo IA" value="2 estilos" note="Propuestas editables antes de publicar" icon={Sparkles} />
      </AdminStats>

      <section className="grid gap-4 lg:grid-cols-3">
        <VisibilityCard icon={Bot} title="IA visual" text="OpenRouter analiza hasta 8 referencias y devuelve dos estilos, portada, orden y texto semántico." href="/admin/modelos-ia" action="Configurar modelos" />
        <VisibilityCard icon={Search} title="Google Images" text="Cada proyecto publica alt, captions, keywords y páginas individuales con ImageObject/JSON-LD." href="/proyectos" action="Revisar vitrina" external />
        <VisibilityCard icon={Globe2} title="Pinterest y navegadores" text="Portadas públicas, Open Graph y descripciones naturales facilitan que la imagen conserve contexto al compartirse." href="/proyectos" action="Abrir portafolio" external />
      </section>

      <AdminSurface title="Nuevo proyecto" description="Selección → análisis IA → elección de estilo → edición → vista previa → publicación.">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(['select','analyzing','review','publishing'] as Stage[]).map((item, index) => <span key={item} className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] ${stage === item ? 'bg-[#171612] text-[#ffb000]' : 'bg-black/[.04] text-[#8f887c]'}`}>{index + 1} {item === 'select' ? 'Selección' : item === 'analyzing' ? 'Análisis IA' : item === 'review' ? 'Revisión' : 'Publicación'}</span>)}
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <label className="group grid min-h-44 cursor-pointer place-items-center rounded-[18px] border border-dashed border-[#c77a00]/25 bg-[#f6ead1]/55 p-5 text-center transition hover:-translate-y-0.5 hover:border-[#c77a00]/45 hover:bg-[#f6ead1]/80">
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} />
              <span><UploadCloud className="mx-auto h-7 w-7 text-[#c77a00]" /><b className="mt-3 block text-sm text-[#171612]">Subir imágenes</b><span className="mt-1 block text-[11px] leading-5 text-[#817a6f]">Hasta 20 imágenes · 12 MB por archivo · JPG, PNG o WebP</span></span>
            </label>

            {files.length ? <div className="rounded-[18px] border border-black/10 bg-white/55 p-3"><div className="flex items-center justify-between gap-3"><div><b className="text-xs text-[#171612]">{files.length} imágenes</b><p className="text-[10px] text-[#8f887c]">Ordena y define la portada.</p></div><button type="button" onClick={resetCreate} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[9px] font-black text-red-700">Vaciar</button></div><div className="mt-3 grid grid-cols-2 gap-2">{files.map((file, index) => { const cover = fileKey(file) === coverKey; return <article key={fileKey(file)} className="relative overflow-hidden rounded-xl border border-black/[.07] bg-white"><img src={previews[index]} alt={file.name} className="h-24 w-full object-cover" /><button type="button" onClick={() => removeFile(index)} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white"><X className="h-3 w-3" /></button><button type="button" onClick={() => setCoverKey(fileKey(file))} className={`absolute left-1.5 top-1.5 rounded-full px-2 py-1 text-[7px] font-black ${cover ? 'bg-[#ffb000] text-[#171612]' : 'bg-black/70 text-white'}`}>{cover ? 'Portada' : 'Elegir'}</button><div className="flex items-center justify-between p-2"><span className="max-w-[80px] truncate text-[8px] text-[#716b60]">{index + 1}. {file.name}</span><span className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => moveFile(index, -1)} className="grid h-6 w-6 place-items-center rounded-md bg-black/[.04] disabled:opacity-25"><ChevronLeft className="h-3 w-3" /></button><button type="button" disabled={index === files.length - 1} onClick={() => moveFile(index, 1)} className="grid h-6 w-6 place-items-center rounded-md bg-black/[.04] disabled:opacity-25"><ChevronRight className="h-3 w-3" /></button></span></div></article>; })}</div></div> : null}

            <Field label="Título inicial"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} placeholder="La IA puede mejorarlo" className="project-input" /></Field>
            <Field label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)} className="project-input">{CATEGORIES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
            <button type="button" onClick={() => void analyzeSelection()} disabled={!files.length || stage === 'analyzing' || stage === 'publishing'} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-[#ffb000] transition hover:-translate-y-0.5 disabled:opacity-40">{stage === 'analyzing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />} {stage === 'analyzing' ? 'Analizando referencias…' : 'Analizar y proponer estilos'}</button>
          </div>

          <div className="min-w-0">
            {(stage === 'analyzing' || stage === 'publishing') ? <Progress value={progress} text={progressText} /> : null}
            {stage === 'select' && !options.length ? <div className="grid min-h-[360px] place-items-center rounded-[18px] border border-black/[.07] bg-black/[.025] p-7 text-center"><div className="max-w-md"><Eye className="mx-auto h-8 w-8 text-[#c77a00]" /><h3 className="mt-3 text-xl font-black text-[#171612]">Vista previa antes de publicar</h3><p className="mt-2 text-sm leading-6 text-[#817a6f]">La IA no publicará nada por sí sola. Primero verás dos estilos, portada, orden, textos y SEO; tú eliges y editas.</p></div></div> : null}

            {options.length ? <div className="space-y-5"><div className="grid gap-3 lg:grid-cols-2">{options.map((option, index) => <StyleOption key={`${option.albumTitle}-${index}`} option={option} index={index} selected={selectedOption === index} cover={previews[Math.max(0, option.coverIndex - 1)] || previews[0]} onSelect={() => applyOption(option,index)} />)}</div>
              {selectedOption !== null ? <div className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
                  <section className="rounded-[18px] border border-black/10 bg-white/55 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#9b6a12]">Editor del proyecto</p><h3 className="mt-1 text-lg font-black text-[#171612]">Contenido final editable</h3></div><Stars score={interestScore} /></div><div className="mt-4 grid gap-3"><Field label="Título"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} className="project-input" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Slug"><input value={albumSlug} onChange={(event) => setAlbumSlug(slugify(event.target.value))} className="project-input" /></Field><Field label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)} className="project-input">{CATEGORIES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div><Field label="Descripción"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="project-input resize-y" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Hashtags"><textarea value={hashtags} onChange={(event) => setHashtags(event.target.value)} rows={3} className="project-input resize-y" /></Field><Field label="Keywords"><textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} rows={3} className="project-input resize-y" /></Field></div><Field label="Keyword principal"><input value={primaryKeyword} onChange={(event) => setPrimaryKeyword(event.target.value)} className="project-input" /></Field><Field label="Título SEO"><input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className="project-input" /></Field><Field label="Descripción SEO"><textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={2} className="project-input resize-y" /></Field><Field label="Descripción para búsqueda de imágenes"><textarea value={imageSearchCaption} onChange={(event) => setImageSearchCaption(event.target.value)} rows={2} className="project-input resize-y" /></Field><Field label="Interés editorial"><select value={interestScore} onChange={(event) => { const score = Number(event.target.value); setInterestScore(score); setInterestLabel(scoreLabel(score)); }} className="project-input">{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}/5 · {scoreLabel(score)}</option>)}</select></Field></div></section>
                  <ProjectPreview title={albumTitle} description={description} category={category} cover={selectedCoverIndex >= 0 ? previews[selectedCoverIndex] : previews[0]} count={files.length} score={interestScore} />
                </div>

                <section><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#9b6a12]">Metadata por imagen</p><h3 className="mt-1 text-lg font-black text-[#171612]">Lo que entenderán Google Images y asistentes de IA</h3></div></div><div className="mt-3 grid gap-3 md:grid-cols-2">{files.map((file,index) => <ImageEditor key={fileKey(file)} file={file} preview={previews[index]} suggestion={imageSuggestions[index]} isCover={fileKey(file) === coverKey} onCover={() => setCoverKey(fileKey(file))} onChange={(patch) => updateImageSuggestion(index,patch)} />)}</div></section>

                <button type="button" onClick={() => void publishAlbum()} disabled={stage === 'publishing'} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-sm font-black text-[#ffb000] disabled:opacity-45">{stage === 'publishing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} {stage === 'publishing' ? 'Publicando proyecto…' : `Publicar proyecto con ${files.length} imágenes`}</button>
              </div> : null}
            </div> : null}
          </div>
        </div>
      </AdminSurface>

      <AdminSurface
        title="Ideas y proyectos publicados"
        description="Una sola fila visual para recorrer estilos. Cada tarjeta abre el proyecto público y permite editar o eliminar desde el admin."
        actions={<div className="flex items-center gap-2"><label className="flex h-10 min-w-[220px] items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3"><Search className="h-4 w-4 text-[#c77a00]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto…" className="min-w-0 flex-1 bg-transparent text-xs text-[#171612] outline-none placeholder:text-[#9a9388]" /></label><button type="button" onClick={() => void reload()} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white/65 text-[#9b6a12]" aria-label="Actualizar proyectos"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>}
      >
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c77a00]" /></div> : filteredAlbums.length ? (
          <div className="project-3d-rail -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-5 pt-2 [scrollbar-width:thin]">
            {filteredAlbums.map((album,index) => <PublishedProjectCard key={album.key} album={album} assets={albumAssets.get(album.key) || []} index={index} deleting={deletingKey === album.key} onEdit={() => openEditor(album)} onDelete={() => void deleteAlbum(album)} />)}
          </div>
        ) : <div className="grid min-h-56 place-items-center text-center"><div><Images className="mx-auto h-7 w-7 text-[#c7bda9]" /><h3 className="mt-3 text-lg font-black text-[#171612]">No hay proyectos publicados</h3><p className="mt-1 text-sm text-[#817a6f]">Sube varias imágenes y crea el primero.</p></div></div>}
      </AdminSurface>

      {editing ? <AlbumEditorModal edit={editing} saving={savingEdit} onChange={setEditing} onClose={() => setEditing(null)} onSave={() => void saveExistingAlbum()} /> : null}
      {toast ? <div className={`fixed bottom-6 right-6 z-[200] max-w-sm rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ${toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'info' ? 'bg-[#f1dfba] text-[#171612]' : 'bg-emerald-600 text-white'}`}>{toast.text}</div> : null}

      <style jsx global>{`
        .project-input{width:100%;border:1px solid rgba(45,37,22,.10);border-radius:.8rem;background:rgba(255,255,255,.82);padding:.72rem .8rem;font-size:.78rem;color:#171612;outline:none;transition:border-color .16s,box-shadow .16s}.project-input:focus{border-color:rgba(199,122,0,.42);box-shadow:0 0 0 3px rgba(199,122,0,.08)}
        .project-3d-rail{perspective:1400px;perspective-origin:50% 45%}.project-3d-card{transform-style:preserve-3d;transition:transform .32s cubic-bezier(.2,.8,.2,1),box-shadow .32s ease}.project-3d-card:hover{transform:translateY(-7px) rotateY(-3deg) rotateX(1deg) scale(1.015);box-shadow:0 24px 55px rgba(54,40,17,.14)}.project-3d-card:nth-child(even):hover{transform:translateY(-7px) rotateY(3deg) rotateX(1deg) scale(1.015)}
        @media(prefers-reduced-motion:reduce){.project-3d-card,.project-3d-card:hover{transition:none;transform:none}}
      `}</style>
    </AdminPage>
  );
}

function VisibilityCard({ icon: Icon, title, text, href, action, external = false }: { icon: typeof Bot; title: string; text: string; href: string; action: string; external?: boolean }) {
  return <article className="rounded-[18px] border border-black/10 bg-white/55 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#171612] text-[#ffb000]"><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-[#171612]">{title}</h3><p className="mt-1 text-[11px] leading-5 text-[#817a6f]">{text}</p></div></div><Link href={href} target={external ? '_blank' : undefined} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black text-[#9b6a12]">{action} <ArrowRight className="h-3 w-3" /></Link></article>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#8f887c]">{label}</span>{children}</label>;
}

function Progress({ value, text }: { value: number; text: string }) {
  return <section className="mb-4 rounded-[18px] border border-black/10 bg-[#171612] p-5 text-white"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/8"><Loader2 className="h-4 w-4 animate-spin text-[#ffb000]" /></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">Procesando con IA</p><p className="mt-1 text-xs text-white/65">{text}</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#c77a00] to-[#ffd05a] transition-all duration-300" style={{ width: `${value}%` }} /></div><p className="mt-2 text-right text-[9px] font-bold text-white/35">{value}%</p></section>;
}

function StyleOption({ option, index, selected, cover, onSelect }: { option: AlbumOption; index: number; selected: boolean; cover?: string; onSelect: () => void }) {
  return <article className={`group overflow-hidden rounded-[18px] border transition ${selected ? 'border-[#c77a00]/45 bg-[#171612] text-white shadow-[0_18px_45px_rgba(39,31,18,.14)]' : 'border-black/10 bg-white/65 text-[#171612] hover:-translate-y-1'}`}><div className="relative h-40 bg-black/[.04]">{cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black text-[#171612]">Estilo {index + 1}</span><span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2 py-1 text-white"><Stars score={option.interestScore} compact /></span></div><div className="p-4"><h3 className="text-base font-black leading-tight">{option.albumTitle}</h3><p className={`mt-2 line-clamp-3 text-[11px] leading-5 ${selected ? 'text-white/55' : 'text-[#817a6f]'}`}>{option.albumDescription}</p><div className="mt-3 flex flex-wrap gap-1.5">{option.secondaryKeywords.slice(0,4).map((keyword) => <span key={keyword} className={`rounded-full px-2 py-1 text-[8px] font-bold ${selected ? 'bg-white/8 text-white/55' : 'bg-black/[.04] text-[#716b60]'}`}>{keyword}</span>)}</div><button type="button" onClick={onSelect} className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-black ${selected ? 'bg-[#ffb000] text-[#171612]' : 'bg-[#171612] text-[#ffb000]'}`}><Check className="h-3.5 w-3.5" /> {selected ? 'Estilo seleccionado' : 'Elegir este estilo'}</button></div></article>;
}

function ProjectPreview({ title, description, category, cover, count, score }: { title: string; description: string; category: string; cover?: string; count: number; score: number }) {
  return <section className="sticky top-24 overflow-hidden rounded-[18px] border border-black/10 bg-[#171612] text-white shadow-[0_18px_48px_rgba(31,25,16,.12)]"><div className="relative h-[420px]">{cover ? <img src={cover} alt="Vista previa" className="h-full w-full object-cover" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-[#171612] via-[#171612]/12 to-transparent" /><div className="absolute inset-x-5 bottom-5"><div className="flex items-center justify-between"><span className="rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black text-[#171612]">Vista previa · {count} imágenes</span><Stars score={score} compact /></div><p className="mt-3 text-[8px] font-black uppercase tracking-[.16em] text-amber-300">{category}</p><h3 className="mt-1 text-2xl font-black leading-tight">{title || 'Proyecto sin título'}</h3><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-white/55">{description || 'Añade una descripción para explicar la idea, el estilo y el contexto visible.'}</p></div></div></section>;
}

function ImageEditor({ file, preview, suggestion, isCover, onCover, onChange }: { file: File; preview?: string; suggestion?: ImageSuggestion; isCover: boolean; onCover: () => void; onChange: (patch: Partial<ImageSuggestion>) => void }) {
  const current = suggestion || { index: 1, title: titleFromFile(file), description: '', alt: '', hashtags: [], keywords: [], interestScore: 3, interestLabel: 'Medio' };
  return <article className="overflow-hidden rounded-[18px] border border-black/10 bg-white/60"><div className="relative h-44"><img src={preview} alt={current.alt || current.title} className="h-full w-full object-cover" /><button type="button" onClick={onCover} className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1.5 text-[8px] font-black ${isCover ? 'bg-[#ffb000] text-[#171612]' : 'bg-black/70 text-white'}`}>{isCover ? 'Portada' : 'Usar de portada'}</button><span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-1 text-[#171612]"><Stars score={current.interestScore} compact /></span></div><div className="grid gap-2.5 p-3"><Field label="Título de imagen"><input value={current.title} onChange={(event) => onChange({ title:event.target.value })} className="project-input" /></Field><Field label="Descripción"><textarea value={current.description} onChange={(event) => onChange({ description:event.target.value })} rows={2} className="project-input resize-y" /></Field><Field label="Alt accesible"><textarea value={current.alt} onChange={(event) => onChange({ alt:event.target.value })} rows={2} className="project-input resize-y" /></Field><div className="grid gap-2 sm:grid-cols-2"><Field label="Hashtags"><textarea value={current.hashtags.join(' ')} onChange={(event) => onChange({ hashtags:tagList(event.target.value) })} rows={2} className="project-input resize-y" /></Field><Field label="Keywords"><textarea value={current.keywords.join('\n')} onChange={(event) => onChange({ keywords:uniqueWords(event.target.value) })} rows={2} className="project-input resize-y" /></Field></div></div></article>;
}

function PublishedProjectCard({ album, assets, index, deleting, onEdit, onDelete }: { album: Album; assets: Asset[]; index: number; deleting: boolean; onEdit: () => void; onDelete: () => void }) {
  return <article className="project-3d-card w-[min(82vw,330px)] shrink-0 snap-start overflow-hidden rounded-[20px] border border-black/10 bg-white/75"><div className="relative h-60 overflow-hidden bg-black/[.04]"><img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" /><span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white">{album.category}</span><span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[#171612]"><Stars score={album.interestScore || 3} compact /></span><div className="absolute inset-x-4 bottom-4 text-white"><p className="text-[8px] font-black uppercase tracking-[.16em] text-amber-300">Proyecto {String(index + 1).padStart(2,'0')} · {album.count} imágenes</p><h3 className="mt-1 text-xl font-black leading-tight">{album.title}</h3></div></div><div className="p-4"><div className="grid grid-cols-4 gap-1.5">{assets.slice(0,4).map((asset) => <img key={asset.id} src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-12 w-full rounded-lg object-cover" />)}</div><p className="mt-3 line-clamp-2 text-[11px] leading-5 text-[#716b60]">{album.description}</p><div className="mt-3 flex flex-wrap gap-1">{(album.keywords || []).slice(0,4).map((keyword) => <span key={keyword} className="rounded-full bg-black/[.04] px-2 py-1 text-[7px] font-bold text-[#817a6f]">{keyword}</span>)}</div><div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><Link href={`/inspiraciones/${album.key}`} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-3 text-[9px] font-black text-[#ffb000]">Vista pública <Eye className="h-3.5 w-3.5" /></Link><button type="button" onClick={onEdit} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-[#9b6a12]" aria-label={`Editar ${album.title}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={onDelete} disabled={deleting} className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-700 disabled:opacity-45" aria-label={`Eliminar ${album.title}`}>{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button></div></div></article>;
}

function AlbumEditorModal({ edit, saving, onChange, onClose, onSave }: { edit: AlbumEdit; saving: boolean; onChange: (value: AlbumEdit) => void; onClose: () => void; onSave: () => void }) {
  const patch = (next: Partial<AlbumEdit>) => onChange({ ...edit, ...next });
  return <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Editar proyecto"><div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[24px] border border-black/10 bg-[#f5f0e7] p-4 shadow-2xl sm:rounded-[24px] sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9b6a12]">Editor de proyecto publicado</p><h2 className="mt-1 text-2xl font-black text-[#171612]">{edit.title}</h2><p className="mt-1 text-xs text-[#817a6f]">Actualiza la metadata del álbum sin volver a subir las imágenes.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-black/[.05] text-[#716b60]"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-3"><Field label="Título"><input value={edit.title} onChange={(event) => patch({ title:event.target.value })} className="project-input" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Categoría"><select value={edit.category} onChange={(event) => patch({ category:event.target.value })} className="project-input">{CATEGORIES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Interés editorial"><select value={edit.interestScore} onChange={(event) => { const score=Number(event.target.value); patch({ interestScore:score, interestLabel:scoreLabel(score) }); }} className="project-input">{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}/5 · {scoreLabel(score)}</option>)}</select></Field></div><Field label="Descripción"><textarea value={edit.description} onChange={(event) => patch({ description:event.target.value })} rows={4} className="project-input resize-y" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Hashtags"><textarea value={edit.hashtags.join(' ')} onChange={(event) => patch({ hashtags:tagList(event.target.value) })} rows={3} className="project-input resize-y" /></Field><Field label="Keywords"><textarea value={edit.keywords.join('\n')} onChange={(event) => patch({ keywords:uniqueWords(event.target.value) })} rows={3} className="project-input resize-y" /></Field></div><Field label="Keyword principal"><input value={edit.primaryKeyword} onChange={(event) => patch({ primaryKeyword:event.target.value })} className="project-input" /></Field><Field label="Título SEO"><input value={edit.seoTitle} onChange={(event) => patch({ seoTitle:event.target.value })} className="project-input" /></Field><Field label="Descripción SEO"><textarea value={edit.seoDescription} onChange={(event) => patch({ seoDescription:event.target.value })} rows={2} className="project-input resize-y" /></Field><Field label="Caption para Google Images / Pinterest"><textarea value={edit.imageSearchCaption} onChange={(event) => patch({ imageSearchCaption:event.target.value })} rows={2} className="project-input resize-y" /></Field><Field label="Organización narrativa"><textarea value={edit.organizationSummary} onChange={(event) => patch({ organizationSummary:event.target.value })} rows={2} className="project-input resize-y" /></Field></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-black/10 bg-white/60 px-4 text-xs font-bold text-[#716b60]">Cancelar</button><button type="button" disabled={saving} onClick={onSave} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-[#ffb000] disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar cambios</button></div></div></div>;
}
