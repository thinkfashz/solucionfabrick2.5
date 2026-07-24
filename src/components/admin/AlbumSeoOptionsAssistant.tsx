'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, Sparkles, Star, WandSparkles } from 'lucide-react';

type Asset = {
  public_id: string;
  album: string;
  album_title: string;
  album_description?: string;
  album_hashtags?: string[];
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
};

type SeoOption = {
  albumTitle: string;
  albumDescription: string;
  category: string;
  keywords: string[];
  hashtags: string[];
  slug: string;
  seoTitle: string;
  seoDescription: string;
  imageAltTemplate: string;
  searchInterest: number;
  searchIntent: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.replace(/^#/, '').trim().toLowerCase()).filter(Boolean)));
}

function InterestStars({ value }: { value: number }) {
  const score = Math.min(5, Math.max(1, Math.round(value || 3)));
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Interés de búsqueda estimado: ${score} de 5`} title="Estimación editorial de IA; no corresponde a volumen real de Google">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-3.5 w-3.5 ${index < score ? 'fill-[#B6906C] text-[#B6906C]' : 'text-[#171820]/18'}`} />
      ))}
    </span>
  );
}

export default function AlbumSeoOptionsAssistant() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [options, setOptions] = useState<SeoOption[]>([]);
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
          category: currentAlbum.category,
          imageUrls: currentAssets.slice(0, 8).map((asset) => asset.url),
          fileNames: currentAssets.map((asset) => asset.public_id.split('/').pop() || asset.public_id),
        }),
      });
      const json = await response.json() as { options?: SeoOption[]; albumOptions?: SeoOption[]; warning?: string; error?: string };
      if (!response.ok) throw new Error(json.error || 'No fue posible generar las propuestas.');
      const next = json.options || json.albumOptions || [];
      setOptions(next.slice(0, 2));
      setMessage(json.warning || 'La IA organizó las imágenes y generó dos estrategias editables para el álbum.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron generar las propuestas.');
    } finally {
      setLoading(false);
    }
  }

  async function applyOption(option: SeoOption, optionIndex: number) {
    if (!currentAlbum || !currentAssets.length) return;
    setApplying(optionIndex);
    setMessage('');
    try {
      const albumTags = unique([
        ...option.hashtags,
        ...option.keywords,
        `interes-${option.searchInterest}`,
        `intencion-${option.searchIntent}`,
        'solucionesfabrick',
      ]).slice(0, 20);

      for (let index = 0; index < currentAssets.length; index += 1) {
        const asset = currentAssets[index];
        const visibleDetail = asset.title || `referencia ${index + 1}`;
        const alt = option.imageAltTemplate.replace('{detalle_visible}', visibleDetail.toLowerCase()).slice(0, 180);
        const response = await fetch('/api/proyectos/cloudinary', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: asset.public_id,
            title: asset.title || `${option.albumTitle} · idea ${index + 1}`,
            description: asset.description || option.albumDescription,
            alt,
            category: option.category,
            album: currentAlbum.key,
            albumTitle: option.albumTitle,
            albumDescription: option.albumDescription,
            hashtags: unique([...(asset.tags || []), ...option.keywords.slice(0, 6)]),
            albumHashtags: albumTags,
            sortOrder: asset.sort_order ?? index,
            albumCover: Boolean(asset.album_cover),
          }),
        });
        const json = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(json.error || `No se pudo actualizar la imagen ${index + 1}.`);
      }

      setMessage(`Opción ${optionIndex + 1} aplicada a ${currentAssets.length} imágenes. El álbum conserva su carpeta y ahora usa la nueva estrategia SEO.`);
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
    <section className="inspiration-seo-assistant bg-[#171820] px-4 pb-2 pt-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-[linear-gradient(145deg,rgba(248,240,233,.09),rgba(248,240,233,.035))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#B6906C]/16 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em] text-[#E5CFBA]"><Sparkles className="h-3.5 w-3.5" /> Organizador SEO con IA</span>
            <h2 className="mt-4 text-2xl font-black tracking-[-.04em] sm:text-4xl">Dos estrategias para cada álbum.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#CFC3BA]">La IA lee el conjunto visual, identifica el tema principal y propone nombres, descripciones, palabras clave, hashtags, textos alternativos e intención de búsqueda. Elige una opción antes de aplicarla.</p>
          </div>
          <div className="min-w-[280px]">
            <label className="text-[10px] font-black uppercase tracking-[.18em] text-[#CCB196]">Álbum a organizar</label>
            <div className="mt-2 flex gap-2 rounded-2xl bg-white/7 p-2">
              <Search className="mt-3 h-4 w-4 shrink-0 text-[#CCB196]" />
              <select value={selectedAlbum} onChange={(event) => { setSelectedAlbum(event.target.value); setOptions([]); }} className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none [&>option]:bg-[#171820]">
                {albums.map((album) => <option key={album.key} value={album.key}>{album.title} · {album.count}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void generateOptions()} disabled={loading || !currentAssets.length} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820] disabled:opacity-45">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {loading ? 'Analizando imágenes…' : 'Generar 2 opciones'}
          </button>
          <p className="text-xs text-white/45">{currentAssets.length} imágenes disponibles · analiza hasta 8 referencias</p>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-xs leading-6 text-[#D8CCC3]">{message}</p> : null}

        {options.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {options.map((option, index) => (
              <article key={`${option.slug}-${index}`} className="rounded-[1.75rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_18px_55px_rgba(0,0,0,.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#895E3D]">Opción {index + 1}</p><h3 className="mt-2 text-xl font-black leading-tight">{option.albumTitle}</h3></div>
                  <div className="shrink-0 text-right"><InterestStars value={option.searchInterest} /><p className="mt-1 text-[8px] font-bold uppercase tracking-[.12em] text-[#756B63]">Interés estimado</p></div>
                </div>
                <p className="mt-4 text-xs leading-6 text-[#5E5148]">{option.albumDescription}</p>
                <dl className="mt-4 grid gap-3 text-[10px] sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#E6D4C3]/65 p-3"><dt className="font-black uppercase tracking-[.13em] text-[#895E3D]">Título SEO</dt><dd className="mt-1 font-semibold leading-5">{option.seoTitle}</dd></div>
                  <div className="rounded-2xl bg-[#E6D4C3]/65 p-3"><dt className="font-black uppercase tracking-[.13em] text-[#895E3D]">Intención</dt><dd className="mt-1 font-semibold leading-5">{option.searchIntent}</dd></div>
                </dl>
                <p className="mt-4 text-[10px] leading-5 text-[#756B63]">{option.seoDescription}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{option.keywords.slice(0, 8).map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black shadow-sm">{keyword}</span>)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">{option.hashtags.slice(0, 8).map((tag) => <span key={tag} className="text-[9px] font-bold text-[#895E3D]">#{tag}</span>)}</div>
                <button type="button" onClick={() => void applyOption(option, index)} disabled={applying !== null} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#171820] px-4 text-xs font-black text-[#F8F0E9] disabled:opacity-45">
                  {applying === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#CCB196]" />}
                  {applying === index ? 'Aplicando a todo el álbum…' : `Elegir opción ${index + 1}`}
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
