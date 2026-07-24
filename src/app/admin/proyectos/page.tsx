'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FolderPlus,
  Images,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
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

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function titleFromFile(file?: File) {
  const value = file?.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Nuevo álbum de ideas';
  return value.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120);
}

function uniqueWords(value: string) {
  return Array.from(new Set(value.split(/[\n,]+/).map((item) => item.replace(/^#/, '').trim()).filter(Boolean))).slice(0, 18);
}

function tagList(value: string) {
  return Array.from(new Set(value.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))).slice(0, 20);
}

function Stars({ score, compact = false }: { score: number; compact?: boolean }) {
  const value = Math.min(5, Math.max(1, Math.round(score || 3)));
  return (
    <span className="inline-flex items-center gap-0.5" title="Popularidad estimada por IA; no corresponde a volumen real de Google" aria-label={`Popularidad estimada ${value} de 5`}>
      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${index < value ? 'fill-[#B6906C] text-[#B6906C]' : 'text-current opacity-20'}`} />)}
    </span>
  );
}

async function fileToAnalysisDataUrl(file: File) {
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
  return canvas.toDataURL('image/jpeg', 0.68);
}

export default function AdminInspiracionesPage() {
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
  const progressTimer = useRef<number | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
      const json = await response.json() as { assets?: Asset[]; albums?: Album[]; warning?: string; error?: string };
      setAssets(json.assets || []);
      setAlbums(json.albums || []);
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

  useEffect(() => () => {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
  }, []);

  function notify(text: string, type: ToastState extends infer _T ? 'success' | 'error' | 'info' : never = 'success') {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4600);
  }

  function resetAnalysis() {
    setOptions([]);
    setImageSuggestions([]);
    setSelectedOption(null);
    setStage('select');
    setProgress(0);
    setProgressText('');
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
    progressTimer.current = window.setInterval(() => {
      setProgress((value) => value >= 90 ? value : Math.min(90, value + Math.max(1, Math.round((92 - value) / 10))));
    }, 420);
  }

  function finishProgress() {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    progressTimer.current = null;
    setProgress(100);
  }

  async function analyzeSelection() {
    if (!files.length) return notify('Selecciona varias imágenes para crear un álbum.', 'error');
    setStage('analyzing');
    startProgress('Preparando imágenes para que la IA analice el álbum completo…');
    try {
      const imageDataUrls: string[] = [];
      for (let index = 0; index < Math.min(8, files.length); index += 1) {
        setProgressText(`Preparando referencia ${index + 1} de ${Math.min(8, files.length)}…`);
        imageDataUrls.push(await fileToAnalysisDataUrl(files[index]));
      }
      setProgressText('La IA está identificando el tema, la portada, el orden, las palabras clave y la popularidad estimada…');
      const response = await fetch('/api/proyectos/ai-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrls,
          fileNames: files.slice(0, 8).map((file) => file.name),
          albumTitle: albumTitle.trim() || titleFromFile(files[0]),
          category,
        }),
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
    notify(`Opción ${optionIndex + 1} aplicada. Revisa y edita todo antes de publicar.`, 'success');
  }

  function updateImageSuggestion(index: number, patch: Partial<ImageSuggestion>) {
    setImageSuggestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function publishAlbum() {
    if (selectedOption === null) return notify('Primero elige una de las dos propuestas de la IA.', 'error');
    if (!files.length || !albumTitle.trim()) return notify('Falta el nombre del álbum o las imágenes.', 'error');
    setStage('publishing');
    setProgress(3);
    setProgressText('Creando un único álbum y preparando sus imágenes…');
    const slug = albumSlug || slugify(albumTitle);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const suggestion = imageSuggestions[index] || {
          index: index + 1,
          title: titleFromFile(file),
          description,
          alt: `${albumTitle} · referencia ${index + 1}`,
          hashtags: tagList(hashtags),
          keywords: uniqueWords(keywords),
          interestScore,
          interestLabel,
        };
        setProgress(Math.round(((index + 0.2) / files.length) * 100));
        setProgressText(`Publicando imagen ${index + 1} de ${files.length} dentro del álbum “${albumTitle}”…`);
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
      setProgressText('Álbum publicado correctamente. Actualizando la vitrina…');
      notify(`${files.length} imágenes publicadas como un único álbum.`, 'success');
      setFiles([]);
      setCoverKey('');
      setAlbumTitle('');
      setAlbumSlug('');
      setDescription('');
      setHashtags('');
      setKeywords('');
      setPrimaryKeyword('');
      setSeoTitle('');
      setSeoDescription('');
      setImageSearchCaption('');
      setOptions([]);
      setImageSuggestions([]);
      setSelectedOption(null);
      await reload();
      setStage('select');
      setProgress(0);
      setProgressText('');
    } catch (error) {
      setStage('review');
      notify(error instanceof Error ? error.message : 'No se pudo publicar el álbum.', 'error');
    }
  }

  const filteredAlbums = useMemo(() => {
    const value = query.trim().toLowerCase();
    return albums.filter((album) => !value || `${album.title} ${album.description} ${album.category} ${(album.hashtags || []).join(' ')} ${(album.keywords || []).join(' ')}`.toLowerCase().includes(value));
  }, [albums, query]);

  const albumAssets = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of assets) map.set(asset.album, [...(map.get(asset.album) || []), asset]);
    for (const [key, items] of map) map.set(key, items.sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)));
    return map;
  }, [assets]);

  const selectedCover = files.findIndex((file) => fileKey(file) === coverKey);

  return (
    <main className="min-h-screen bg-[#171820] px-4 py-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2.4rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.2),transparent_30rem),linear-gradient(145deg,#242630,#171820)] p-6 shadow-2xl shadow-black/25 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-[#CCB196]"><Sparkles className="h-3.5 w-3.5" /> Estudio de Inspiraciones</span><h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">Analiza, revisa y después publica.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#CFC3BA]">La selección múltiple siempre crea un solo álbum. Primero ves las imágenes, después la IA propone dos versiones, revisas cada texto y finalmente confirmas la publicación.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/7 px-4 text-xs font-black"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button><Link href="/proyectos" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B6906C] px-4 text-xs font-black text-[#171820]">Ver vitrina pública <ExternalLink className="h-4 w-4" /></Link></div>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_24px_80px_rgba(0,0,0,.2)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><FolderPlus className="h-5 w-5" /></span><div><h2 className="text-xl font-black">Crear un álbum único</h2><p className="mt-1 text-xs text-[#756B63]">Selección → análisis IA → revisión → previsualización → publicación.</p></div></div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#756B63]"><span className={stage === 'select' ? 'text-[#895E3D]' : ''}>1 Selección</span><ArrowRight className="h-3 w-3" /><span className={stage === 'analyzing' ? 'text-[#895E3D]' : ''}>2 Análisis</span><ArrowRight className="h-3 w-3" /><span className={stage === 'review' ? 'text-[#895E3D]' : ''}>3 Revisión</span><ArrowRight className="h-3 w-3" /><span className={stage === 'publishing' ? 'text-[#895E3D]' : ''}>4 Publicación</span></div></div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="grid content-start gap-4">
              <label className="group grid min-h-44 cursor-pointer place-items-center rounded-[1.7rem] bg-[#EADBCB]/70 p-5 text-center transition hover:bg-[#EADBCB]"><input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} /><span><UploadCloud className="mx-auto h-8 w-8 text-[#895E3D]" /><b className="mt-3 block text-sm">Seleccionar varias imágenes</b><span className="mt-1 block text-[11px] leading-5 text-[#756B63]">Todas quedarán dentro de un solo álbum · máximo 20 archivos</span></span></label>

              {files.length ? <div className="rounded-[1.5rem] bg-white p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-black">{files.length} imágenes seleccionadas</p><p className="mt-1 text-[10px] text-[#756B63]">Ordena o elige manualmente la portada antes del análisis.</p></div><button type="button" onClick={() => { setFiles([]); setCoverKey(''); resetAnalysis(); }} className="rounded-full bg-red-50 px-3 py-2 text-[10px] font-black text-red-700">Vaciar</button></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">{files.map((file, index) => { const isCover = fileKey(file) === coverKey; return <article key={fileKey(file)} className="relative overflow-hidden rounded-2xl bg-[#F8F0E9]"><img src={previews[index]} alt={file.name} className="h-32 w-full object-cover" /><button type="button" onClick={() => removeFile(index)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#171820]/88 text-white"><X className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setCoverKey(fileKey(file))} className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[8px] font-black ${isCover ? 'bg-[#B6906C] text-[#171820]' : 'bg-[#171820]/82 text-white'}`}>{isCover ? 'Portada' : 'Elegir portada'}</button><div className="p-2"><p className="truncate text-[9px] font-bold">{index + 1}. {file.name}</p><div className="mt-2 flex justify-between"><button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} className="grid h-7 w-7 place-items-center rounded-lg bg-[#E6D4C3] disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} className="grid h-7 w-7 place-items-center rounded-lg bg-[#E6D4C3] disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button></div></div></article>; })}</div></div> : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><AdminField label="Título inicial opcional"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} placeholder="La IA puede mejorarlo" className="admin-input" /></AdminField><AdminField label="Categoría orientativa"><select value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div>

              <button type="button" onClick={() => void analyzeSelection()} disabled={!files.length || stage === 'analyzing' || stage === 'publishing'} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-[#F8F0E9] disabled:opacity-45">{stage === 'analyzing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5 text-[#CCB196]" />} {stage === 'analyzing' ? 'Analizando el álbum…' : 'Analizar antes de publicar'}</button>
            </div>

            <div className="min-w-0">
              {(stage === 'analyzing' || stage === 'publishing') ? <AnalysisProgress value={progress} text={progressText} /> : null}

              {stage === 'select' && !options.length ? <div className="grid min-h-[420px] place-items-center rounded-[2rem] bg-[#E6D4C3]/45 p-8 text-center"><div><Eye className="mx-auto h-10 w-10 text-[#895E3D]" /><h3 className="mt-4 text-2xl font-black">Aquí aparecerá la revisión previa</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#756B63]">La IA te mostrará dos títulos, dos descripciones, palabras clave, hashtags, portada sugerida, orden y una popularidad estimada para el álbum y para cada imagen.</p></div></div> : null}

              {options.length ? <div><div className="grid gap-4 lg:grid-cols-2">{options.map((option, index) => <OptionCard key={`${option.albumTitle}-${index}`} option={option} index={index} selected={selectedOption === index} onSelect={() => applyOption(option, index)} />)}</div>

                {selectedOption !== null ? <div className="mt-6 grid gap-6"><section className="rounded-[2rem] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#895E3D]">Contenido final editable</p><h3 className="mt-2 text-2xl font-black">Revisa todo antes de publicar</h3></div><Stars score={interestScore} /></div><div className="mt-5 grid gap-4"><AdminField label="Título del álbum"><input value={albumTitle} onChange={(event) => { setAlbumTitle(event.target.value); setAlbumSlug(slugify(event.target.value)); }} className="admin-input" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Slug"><input value={albumSlug} onChange={(event) => setAlbumSlug(slugify(event.target.value))} className="admin-input" /></AdminField><AdminField label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div><AdminField label="Descripción del álbum"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="admin-input resize-y" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Hashtags"><textarea value={hashtags} onChange={(event) => setHashtags(event.target.value)} rows={4} className="admin-input resize-y" /></AdminField><AdminField label="Palabras clave"><textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} rows={4} className="admin-input resize-y" /></AdminField></div><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Palabra clave principal"><input value={primaryKeyword} onChange={(event) => setPrimaryKeyword(event.target.value)} className="admin-input" /></AdminField><AdminField label="Popularidad estimada del álbum"><select value={interestScore} onChange={(event) => { const score = Number(event.target.value); setInterestScore(score); setInterestLabel(score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo'); }} className="admin-input">{[1,2,3,4,5].map((score) => <option key={score} value={score}>{'★'.repeat(score)}{'☆'.repeat(5-score)} · {score}/5</option>)}</select></AdminField></div><AdminField label="Título SEO"><input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className="admin-input" /></AdminField><AdminField label="Descripción SEO"><textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={3} className="admin-input resize-y" /></AdminField><AdminField label="Texto para búsqueda de imágenes"><textarea value={imageSearchCaption} onChange={(event) => setImageSearchCaption(event.target.value)} rows={3} className="admin-input resize-y" /></AdminField></div></section>

                  <AlbumPreview title={albumTitle} description={description} category={category} hashtags={tagList(hashtags)} keywords={uniqueWords(keywords)} cover={selectedCover >= 0 ? previews[selectedCover] : previews[0]} count={files.length} score={interestScore} />

                  <section><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#895E3D]">Detalle por imagen</p><h3 className="mt-2 text-2xl font-black">Cada foto se diferencia dentro del mismo álbum</h3></div><p className="text-right text-[10px] leading-5 text-[#756B63]">La popularidad individual puede ser distinta de la del álbum.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2">{files.map((file, index) => { const suggestion = imageSuggestions[index]; return <ImageReviewCard key={fileKey(file)} preview={previews[index]} file={file} suggestion={suggestion} isCover={fileKey(file) === coverKey} onCover={() => setCoverKey(fileKey(file))} onChange={(patch) => updateImageSuggestion(index, patch)} />; })}</div></section>

                  <button type="button" onClick={() => void publishAlbum()} disabled={stage === 'publishing'} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[1.3rem] bg-[#171820] px-6 text-base font-black text-[#F8F0E9] disabled:opacity-45">{stage === 'publishing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 text-[#CCB196]" />} {stage === 'publishing' ? 'Publicando un único álbum…' : `Confirmar y publicar ${files.length} imágenes en un álbum`}</button>
                </div> : null}
              </div> : null}
            </div>
          </div>
        </section>

        <section className="mt-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#CCB196]">Álbumes publicados</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Cuadrícula doble con portadas grandes</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-white/50">Cada tarjeta representa un álbum completo. Al abrirlo se muestra el resto de las imágenes y sus detalles.</p></div><label className="flex min-w-[280px] items-center gap-3 rounded-2xl bg-white/7 px-4 py-3"><Search className="h-4 w-4 text-[#CCB196]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar álbum…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label></div>

          {loading ? <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4"><Loader2 className="h-7 w-7 animate-spin text-[#CCB196]" /></div> : filteredAlbums.length ? <div className="mt-6 grid gap-6 md:grid-cols-2">{filteredAlbums.map((album) => <PublishedAlbumCard key={album.key} album={album} assets={albumAssets.get(album.key) || []} />)}</div> : <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] bg-white/4 p-8 text-center"><div><Images className="mx-auto h-9 w-9 text-white/25" /><h3 className="mt-4 text-xl font-black">Todavía no hay álbumes</h3><p className="mt-2 text-sm text-white/45">Selecciona varias imágenes para crear el primero.</p></div></div>}
        </section>
      </div>

      {toast ? <div className={`fixed bottom-6 right-6 z-[600] max-w-sm rounded-2xl px-5 py-4 text-sm font-bold shadow-2xl ${toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'info' ? 'bg-[#E6D4C3] text-[#171820]' : 'bg-emerald-300 text-[#171820]'}`}>{toast.text}</div> : null}

      <style jsx global>{`
        .admin-input { width:100%; border:0; border-radius:1rem; background:#f8f0e9; padding:.9rem 1rem; font-size:.875rem; color:#171820; outline:none; box-shadow:inset 0 0 0 1px rgba(23,24,32,.06); }
        .admin-input:focus { box-shadow:inset 0 0 0 2px rgba(182,144,108,.5),0 12px 28px rgba(23,24,32,.08); }
      `}</style>
    </main>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#756B63]">{label}</span>{children}</label>;
}

function AnalysisProgress({ value, text }: { value: number; text: string }) {
  return <section className="rounded-[2rem] bg-[#171820] p-6 text-[#F8F0E9]"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/8"><Loader2 className="h-5 w-5 animate-spin text-[#CCB196]" /></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#CCB196]">Procesando con inteligencia artificial</p><p className="mt-1 text-sm font-bold">{text}</p></div></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[linear-gradient(90deg,#895E3D,#CCB196)] transition-all duration-500" style={{ width: `${value}%` }} /></div><div className="mt-2 flex justify-between text-[10px] font-black text-white/45"><span>No cierres esta pantalla</span><span>{value}%</span></div></section>;
}

function OptionCard({ option, index, selected, onSelect }: { option: AlbumOption; index: number; selected: boolean; onSelect: () => void }) {
  return <article className={`rounded-[1.8rem] p-5 shadow-[0_18px_55px_rgba(23,24,32,.1)] ${selected ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-white text-[#171820]'}`}><div className="flex items-start justify-between gap-4"><div><p className={`text-[9px] font-black uppercase tracking-[.2em] ${selected ? 'text-[#CCB196]' : 'text-[#895E3D]'}`}>Propuesta {index + 1}</p><h3 className="mt-2 text-xl font-black leading-tight">{option.albumTitle}</h3></div><div className="text-right"><Stars score={option.interestScore} compact /><p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] opacity-55">Álbum · {option.interestLabel}</p></div></div><p className="mt-4 line-clamp-5 text-xs leading-6 opacity-70">{option.albumDescription}</p><div className="mt-4 rounded-2xl bg-[#B6906C]/12 p-3"><p className="text-[9px] font-black uppercase tracking-[.13em]">Palabra principal</p><p className="mt-1 text-sm font-black">{option.primaryKeyword}</p></div><div className="mt-4 flex flex-wrap gap-1.5">{option.secondaryKeywords.slice(0, 6).map((keyword) => <span key={keyword} className="rounded-full bg-[#E6D4C3]/70 px-2.5 py-1 text-[8px] font-black text-[#5E5148]">{keyword}</span>)}</div><div className="mt-3 flex flex-wrap gap-1.5">{option.hashtags.slice(0, 7).map((tag) => <span key={tag} className={`text-[9px] font-bold ${selected ? 'text-[#E5CFBA]' : 'text-[#895E3D]'}`}>#{tag}</span>)}</div><p className="mt-4 text-[10px] leading-5 opacity-55">{option.organizationSummary}</p><button type="button" onClick={onSelect} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black ${selected ? 'bg-[#B6906C] text-[#171820]' : 'bg-[#171820] text-[#F8F0E9]'}`}><Check className="h-4 w-4" /> {selected ? 'Opción elegida' : `Elegir propuesta ${index + 1}`}</button></article>;
}

function AlbumPreview({ title, description, category, hashtags, keywords, cover, count, score }: { title: string; description: string; category: string; hashtags: string[]; keywords: string[]; cover?: string; count: number; score: number }) {
  return <section className="overflow-hidden rounded-[2rem] bg-[#171820] text-[#F8F0E9] shadow-[0_22px_70px_rgba(23,24,32,.18)]"><div className="relative h-[360px] bg-white/6">{cover ? <img src={cover} alt="Vista previa de la portada" className="h-full w-full object-cover" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-[#171820]/98 via-[#171820]/10 to-transparent" /><div className="absolute inset-x-6 bottom-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#F8F0E9]/92 px-3 py-1.5 text-[9px] font-black text-[#171820]">Vista previa · {count} imágenes</span><Stars score={score} /></div><p className="mt-4 text-[9px] font-black uppercase tracking-[.17em] text-[#CCB196]">{category}</p><h3 className="mt-2 text-3xl font-black leading-tight">{title}</h3><p className="mt-3 line-clamp-3 max-w-3xl text-xs leading-6 text-[#D2C6BD]">{description}</p><div className="mt-4 flex flex-wrap gap-1.5">{[...hashtags.slice(0, 4), ...keywords.slice(0, 3)].map((item) => <span key={item} className="rounded-full bg-white/8 px-2.5 py-1 text-[8px] font-black text-[#E5CFBA]">#{item}</span>)}</div></div></div></section>;
}

function ImageReviewCard({ preview, file, suggestion, isCover, onCover, onChange }: { preview?: string; file: File; suggestion?: ImageSuggestion; isCover: boolean; onCover: () => void; onChange: (patch: Partial<ImageSuggestion>) => void }) {
  const current = suggestion || { index: 1, title: titleFromFile(file), description: '', alt: '', hashtags: [], keywords: [], interestScore: 3, interestLabel: 'Medio' };
  return <article className="overflow-hidden rounded-[1.7rem] bg-white shadow-[0_16px_48px_rgba(23,24,32,.08)]"><div className="relative h-52"><img src={preview} alt={current.alt || current.title} className="h-full w-full object-cover" /><button type="button" onClick={onCover} className={`absolute left-3 top-3 rounded-full px-3 py-2 text-[9px] font-black ${isCover ? 'bg-[#B6906C] text-[#171820]' : 'bg-[#171820]/88 text-white'}`}>{isCover ? 'Portada del álbum' : 'Usar como portada'}</button><span className="absolute right-3 top-3 rounded-full bg-[#F8F0E9]/94 px-3 py-2 text-[#171820]"><Stars score={current.interestScore} compact /></span></div><div className="grid gap-3 p-4"><AdminField label="Título de esta imagen"><input value={current.title} onChange={(event) => onChange({ title: event.target.value })} className="admin-input" /></AdminField><AdminField label="Descripción individual"><textarea value={current.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} className="admin-input resize-y" /></AdminField><AdminField label="Texto alternativo"><textarea value={current.alt} onChange={(event) => onChange({ alt: event.target.value })} rows={2} className="admin-input resize-y" /></AdminField><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Hashtags"><textarea value={current.hashtags.join(' ')} onChange={(event) => onChange({ hashtags: tagList(event.target.value) })} rows={3} className="admin-input resize-y" /></AdminField><AdminField label="Palabras clave"><textarea value={current.keywords.join('\n')} onChange={(event) => onChange({ keywords: uniqueWords(event.target.value) })} rows={3} className="admin-input resize-y" /></AdminField></div><AdminField label="Popularidad estimada de esta imagen"><select value={current.interestScore} onChange={(event) => { const score = Number(event.target.value); onChange({ interestScore: score, interestLabel: score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo' }); }} className="admin-input">{[1,2,3,4,5].map((score) => <option key={score} value={score}>{'★'.repeat(score)}{'☆'.repeat(5-score)} · {score}/5</option>)}</select></AdminField></div></article>;
}

function PublishedAlbumCard({ album, assets }: { album: Album; assets: Asset[] }) {
  return <article className="overflow-hidden rounded-[2rem] bg-[#F8F0E9] text-[#171820] shadow-[0_22px_70px_rgba(0,0,0,.16)]"><div className="relative h-[420px]"><img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-[#171820]/95 via-transparent to-transparent" /><div className="absolute inset-x-5 bottom-5 text-white"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#F8F0E9]/92 px-3 py-1.5 text-[9px] font-black text-[#171820]">{album.count} imágenes</span><Stars score={album.interestScore || 3} compact /></div><h3 className="mt-3 text-3xl font-black">{album.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-6 text-[#D9CEC6]">{album.description}</p></div></div><div className="p-5"><div className="grid grid-cols-4 gap-2">{assets.slice(0, 4).map((asset) => <img key={asset.id} src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-20 w-full rounded-xl object-cover" />)}</div><div className="mt-4 flex flex-wrap gap-1.5">{[...(album.hashtags || []).slice(0, 4), ...(album.keywords || []).slice(0, 3)].map((tag) => <span key={tag} className="rounded-full bg-[#E6D4C3] px-2.5 py-1 text-[8px] font-black text-[#5E5148]">#{tag}</span>)}</div><div className="mt-5 flex gap-2"><Link href={`/inspiraciones/${album.key}`} target="_blank" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-4 text-xs font-black text-[#F8F0E9]">Abrir álbum completo <ExternalLink className="h-4 w-4" /></Link><Link href="/proyectos" target="_blank" className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E6D4C3] text-[#171820]" aria-label="Ver en vitrina"><Eye className="h-4 w-4" /></Link></div></div></article>;
}
