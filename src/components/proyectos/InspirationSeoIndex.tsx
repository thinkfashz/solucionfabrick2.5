'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';

type Album = {
  key: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  count: number;
  hashtags?: string[];
};

type Asset = {
  album: string;
  title: string;
  alt?: string;
  url: string;
  thumb: string;
  tags?: string[];
  album_hashtags?: string[];
};

function interestFrom(album: Album) {
  const tag = (album.hashtags || []).find((item) => /^interes-[1-5]$/i.test(item));
  if (tag) return Number(tag.split('-').pop());
  const text = `${album.title} ${album.category} ${(album.hashtags || []).join(' ')}`.toLowerCase();
  if (/cocina|casa|baño|piscina|terraza|quincho|remodel/.test(text)) return 4;
  if (/mueble|plano|material/.test(text)) return 3;
  return 2;
}

function cleanKeywords(album: Album) {
  return (album.hashtags || [])
    .filter((tag) => !/^interes-|^intencion-/i.test(tag))
    .slice(0, 10);
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Interés de búsqueda estimado: ${value} de 5`} title="Interés estimado por IA; no representa volumen real de búsquedas">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < value ? 'fill-[#B6906C] text-[#B6906C]' : 'text-[#171820]/18'}`} />)}
    </span>
  );
}

export default function InspirationSeoIndex() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=100', { cache: 'no-store' });
        const json = await response.json() as { albums?: Album[]; assets?: Asset[] };
        if (active) {
          setAlbums(json.albums || []);
          setAssets(json.assets || []);
        }
      } catch {
        // La galería principal conserva su propio estado de error.
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const ranked = useMemo(() => [...albums].sort((left, right) => interestFrom(right) - interestFrom(left) || right.count - left.count), [albums]);

  useEffect(() => {
    if (!ranked.length) return;
    const itemList = ranked.map((album, index) => {
      const albumAssets = assets.filter((asset) => asset.album === album.key);
      return {
        '@type': 'ImageGallery',
        position: index + 1,
        name: album.title,
        description: album.description,
        keywords: cleanKeywords(album).join(', '),
        url: `https://www.solucionesfabrick.com/proyectos#${album.key}`,
        image: albumAssets.slice(0, 12).map((asset) => ({
          '@type': 'ImageObject',
          contentUrl: asset.url,
          thumbnailUrl: asset.thumb,
          name: asset.title,
          caption: asset.title,
          description: album.description,
          alternateName: asset.alt || asset.title,
          keywords: [...(asset.tags || []), ...(asset.album_hashtags || [])].filter((tag) => !/^interes-|^intencion-/i.test(tag)).slice(0, 12).join(', '),
        })),
      };
    });
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Inspiraciones para construcción y remodelación | Soluciones Fabrick',
      description: 'Álbumes visuales de casas, cocinas, baños, terrazas, quinchos, piscinas, muebles y remodelaciones para proyectos en Chile.',
      url: 'https://www.solucionesfabrick.com/proyectos',
      mainEntity: { '@type': 'ItemList', itemListElement: itemList },
    };
    const id = 'fabrick-inspiration-schema';
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => script.remove();
  }, [assets, ranked]);

  if (!ranked.length) return null;

  return (
    <section className="bg-[#F8F0E9] px-4 pb-32 pt-8 text-[#171820] sm:px-6 lg:px-10" aria-labelledby="indice-seo-inspiraciones">
      <div className="mx-auto max-w-7xl rounded-[2.2rem] bg-white p-6 shadow-[0_22px_70px_rgba(23,24,32,.08)] sm:p-8">
        <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#895E3D]"><Search className="h-3.5 w-3.5" /> Índice visual para buscadores</p>
            <h2 id="indice-seo-inspiraciones" className="mt-3 text-3xl font-black leading-tight tracking-[-.045em] sm:text-5xl">Ideas organizadas por tema e intención.</h2>
          </div>
          <p className="text-sm leading-7 text-[#685D55]">Las estrellas representan interés estimado por IA según la amplitud del tema y su intención visual o comercial. No corresponden a cifras reales de Google. Los títulos, descripciones, palabras clave y textos alternativos ayudan a comprender e indexar cada colección.</p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.slice(0, 9).map((album) => {
            const interest = interestFrom(album);
            const keywords = cleanKeywords(album);
            return (
              <article id={album.key} key={album.key} className="overflow-hidden rounded-[1.6rem] bg-[#F8F0E9] shadow-[0_12px_34px_rgba(23,24,32,.07)]">
                <img src={album.cover} alt={`${album.title}, colección de inspiración para proyectos en Chile`} loading="lazy" className="h-44 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">{album.category} · {album.count} imágenes</p><Stars value={interest} /></div>
                  <h3 className="mt-2 text-lg font-black leading-tight">{album.title}</h3>
                  <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#685D55]">{album.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">{keywords.slice(0, 7).map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-[#5E5148]">#{keyword}</span>)}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
