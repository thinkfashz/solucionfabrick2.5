'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, Sparkles, WandSparkles } from 'lucide-react';
import InterestStars from '@/components/proyectos/InterestStars';

type Asset = {
  public_id: string;
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
  title: string;
  description?: string;
  alt?: string;
  category: string;
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

type AssetMetadata = {
  title: string;
  description: string;
  alt: string;
  category: string;
  hashtags: string[];
  keywords?: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.replace(/^#/, '').trim().toLowerCase()).filter(Boolean)));
}

function normalizedOrder(order: number[] | undefined, count: number) {
  const result = Array.from(new Set((order || []).map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= count)));
  for (let index = 1; index <= count; index += 1) if (!result.includes(index)) result.push(index);
  return result;
}

export default function AlbumSeoOptionsAssistant() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [options, setOptions] = useState<AlbumOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  async function loadAlbums() {
    try {
      const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
      const json = await response.json() as { assets?: Asset[]; albums?: Album[] };
      setAlbums(json.albums || []);
      setAssets(json.assets || []);
      setSelectedAlbum((current) => current || json.albums?.[0]?.key || '');
    } catch {
      setMessage('No se pudieron cargar los álbumes desde Cloudinary.');
    }
  }

  useEffect(() => { void loadAlbums(); }, []);

  const currentAlbum = albums.find((album) => album.key === selectedAlbum) || null;
  const currentAssets = useMemo(
    () => assets.filter((asset) => asset.album === selectedAlbum).sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)),
    [assets, selectedAlbum],
  );

  async function generateOptions() {
    if (!currentAlbum || !currentAssets.length) return;
    setLoading(true);
    setMessage('');
    setOptions([]);
    try {
      const response = await fetch('/api/proyectos/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'album',
          albumTitle: currentAlbum.title,
          albumDescription: currentAlbum.description,
          category: currentAlbum.category,
          primaryKeyword: currentAlbum.primaryKeyword,
          secondaryKeywords: currentAlbum.keywords,
          hashtags: currentAlbum.hashtags,
          imageUrls: currentAssets.slice(0, 6).map((asset) => asset.url),
          fileNames: currentAssets.map((asset, index) => `${index + 1}-${asset.public_id.split('/').pop() || asset.title}`),
        }),
      });
      const json = await response.json() as { albumOptions?: AlbumOption[]; warning?: string; error?: string };
      if (!response.ok) throw new Error(json.error || 'No fue posible generar las propuestas.');
      setOptions((json.albumOptions || []).slice(0, 2));
      setMessage(json.warning || 'La IA leyó el grupo y generó dos estrategias con nombre, descripción, palabras clave, portada y orden visual.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron generar las propuestas.');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeAsset(asset: Asset, option: AlbumOption): Promise<AssetMetadata> {
    try {
      const response = await fetch('/api/proyectos/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'asset',
          imageUrl: asset.url,
          albumTitle: option.albumTitle,
          albumDescription: option.albumDescription,
          category: option.category,
          primaryKeyword: option.primaryKeyword,
          secondaryKeywords: option.secondaryKeywords,
          hashtags: option.hashtags,
        }),
      });
      const json = await response.json() as { metadata?: AssetMetadata };
      if (response.ok && json.metadata) return json.metadata;
    } catch {
      // Preserve the current editable metadata if individual analysis fails.
    }
    return {
      title: asset.title,
      description: asset.description || option.albumDescription,
      alt: asset.alt || `${option.primaryKeyword}: ${asset.title}`,
      category: option.category,
      hashtags: unique([...(asset.tags || []), ...option.hashtags]).slice(0, 14),
      keywords: option.secondaryKeywords,
    };
  }

  async function applyOption(option: AlbumOption, optionIndex: number) {
    if (!currentAlbum || !currentAssets.length) return;
    setApplying(optionIndex);
    setMessage('');
    try {
      const order = normalizedOrder(option.suggestedOrder, currentAssets.length);
      const orderedAssets = order.map((originalPosition) => currentAssets[originalPosition - 1]).filter(Boolean);
      const coverAsset = currentAssets[Math.min(Math.max(option.coverIndex || 1, 1), currentAssets.length) - 1];

      for (let index = 0; index < orderedAssets.length; index += 1) {
        const asset = orderedAssets[index];
        setMessage(`Aplicando opción ${optionIndex + 1}: imagen ${index + 1} de ${orderedAssets.length}…`);
        const metadata = await analyzeAsset(asset, option);
        const response = await fetch('/api/proyectos/cloudinary', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: asset.public_id,
            title: metadata.title,
            description: metadata.description,
            alt: metadata.alt,
            category: metadata.category || option.category,
            album: currentAlbum.key,
            albumTitle: option.albumTitle,
            albumDescription: option.albumDescription,
            hashtags: unique([...(metadata.hashtags || []), ...(metadata.keywords || [])]),
            albumHashtags: option.hashtags,
            albumKeywords: option.secondaryKeywords,
            primaryKeyword: option.primaryKeyword,
            seoTitle: option.seoTitle,
            seoDescription: option.seoDescription,
            imageSearchCaption: option.imageSearchCaption,
            interestScore: option.interestScore,
            interestLabel: option.interestLabel,
            organizationSummary: option.organizationSummary,
            sortOrder: index,
            albumCover: asset.public_id === coverAsset?.public_id,
          }),
        });
        const json = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo actualizar la imagen ${index + 1}.`);
      }

      setMessage(`Opción ${optionIndex + 1} aplicada. La IA reorganizó ${orderedAssets.length} imágenes, eligió portada y guardó la estrategia SEO del álbum.`);
      setOptions([]);
      await loadAlbums();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo aplicar la propuesta.');
    } finally {
      setApplying(null);
    }
  }

  if (!albums.length) return null;

  return (
    <section className="bg-[#08090A] px-4 pb-2 pt-8 text-[#FFF9EE] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-[linear-gradient(145deg,rgba(248,240,233,.09),rgba(248,240,233,.035))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F5871F]/16 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em] text-[#F2DFBB]"><Sparkles className="h-3.5 w-3.5" /> Organizador visual y SEO con IA</span>
            <h2 className="mt-4 text-2xl font-black tracking-[-.04em] sm:text-4xl">Dos formas de organizar cada álbum.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#CFC3BA]">La IA observa las imágenes, elige una portada, propone el orden narrativo y crea dos alternativas de nombre, descripción, palabras clave, hashtags y metadata para búsqueda de imágenes.</p>
          </div>
          <div className="min-w-[280px]">
            <label className="text-[10px] font-black uppercase tracking-[.18em] text-[#FFB000]">Álbum a organizar</label>
            <div className="mt-2 flex gap-2 rounded-2xl bg-white/7 p-2">
              <Search className="mt-3 h-4 w-4 shrink-0 text-[#FFB000]" />
              <select value={selectedAlbum} onChange={(event) => { setSelectedAlbum(event.target.value); setOptions([]); }} className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none [&>option]:bg-[#08090A]">
                {albums.map((album) => <option key={album.key} value={album.key}>{album.title} · {album.count}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void generateOptions()} disabled={loading || applying !== null || !currentAssets.length} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A] disabled:opacity-45">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {loading ? 'Analizando imágenes…' : 'Generar 2 opciones'}
          </button>
          <p className="text-xs text-white/45">{currentAssets.length} imágenes · analiza hasta 6 referencias y ordena el grupo completo</p>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-xs leading-6 text-[#D8CCC3]">{message}</p> : null}

        {options.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {options.map((option, index) => (
              <article key={`${option.albumTitle}-${index}`} className="rounded-[1.75rem] bg-[#FFF9EE] p-5 text-[#08090A] shadow-[0_18px_55px_rgba(0,0,0,.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F5871F]">Opción {index + 1}</p><h3 className="mt-2 text-xl font-black leading-tight">{option.albumTitle}</h3></div>
                  <InterestStars score={option.interestScore} label={option.interestLabel} compact />
                </div>
                <p className="mt-4 text-xs leading-6 text-[#BFB8AC]">{option.albumDescription}</p>
                <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm"><p className="text-[9px] font-black uppercase tracking-[.13em] text-[#F5871F]">Palabra clave principal</p><p className="mt-1 text-sm font-black">{option.primaryKeyword}</p></div>
                <dl className="mt-3 grid gap-3 text-[10px] sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#F2DFBB]/65 p-3"><dt className="font-black uppercase tracking-[.13em] text-[#F5871F]">Título SEO</dt><dd className="mt-1 font-semibold leading-5">{option.seoTitle}</dd></div>
                  <div className="rounded-2xl bg-[#F2DFBB]/65 p-3"><dt className="font-black uppercase tracking-[.13em] text-[#F5871F]">Organización</dt><dd className="mt-1 font-semibold leading-5">Portada #{option.coverIndex} · {option.suggestedOrder.join(' → ')}</dd></div>
                </dl>
                <p className="mt-4 text-[10px] leading-5 text-[#BFB8AC]">{option.seoDescription}</p>
                <p className="mt-3 text-[10px] leading-5 text-[#BFB8AC]">{option.organizationSummary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{option.secondaryKeywords.slice(0, 8).map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black shadow-sm">{keyword}</span>)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">{option.hashtags.slice(0, 8).map((tag) => <span key={tag} className="text-[9px] font-bold text-[#F5871F]">#{tag}</span>)}</div>
                <p className="mt-4 text-[9px] leading-5 text-[#BFB8AC]">Las estrellas son una estimación editorial de IA, no volumen real de Google Trends.</p>
                <button type="button" onClick={() => void applyOption(option, index)} disabled={applying !== null} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#08090A] px-4 text-xs font-black text-[#FFF9EE] disabled:opacity-45">
                  {applying === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#FFB000]" />}
                  {applying === index ? 'Organizando todo el álbum…' : `Aplicar opción ${index + 1}`}
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
