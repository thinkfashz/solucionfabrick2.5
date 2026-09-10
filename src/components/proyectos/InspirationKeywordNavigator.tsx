'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';

type KeywordAsset = {
  id: string;
  title: string;
  description?: string;
  alt?: string;
  tags?: string[];
  url: string;
  thumb: string;
};

type Props = {
  keywords: string[];
  hashtags: string[];
  assets: KeywordAsset[];
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreAsset(asset: KeywordAsset, term: string) {
  const needle = normalize(term);
  if (!needle) return 0;
  const searchable = normalize(`${asset.title} ${asset.description || ''} ${asset.alt || ''} ${(asset.tags || []).join(' ')}`);
  let score = searchable.includes(needle) ? 12 : 0;
  const words = needle.split(/\s+/).filter((word) => word.length > 2);
  for (const word of words) if (searchable.includes(word)) score += 2;
  if (normalize(asset.title).includes(needle)) score += 8;
  if ((asset.tags || []).some((tag) => normalize(tag).includes(needle))) score += 5;
  return score;
}

export default function InspirationKeywordNavigator({ keywords, hashtags, assets }: Props) {
  const [selected, setSelected] = useState('');
  const terms = useMemo(() => {
    const combined = [
      ...keywords,
      ...hashtags.map((tag) => tag.replace(/^#/, '').replace(/-/g, ' ')),
    ].map((term) => term.trim()).filter(Boolean);
    return Array.from(new Map(combined.map((term) => [normalize(term), term])).values()).slice(0, 20);
  }, [hashtags, keywords]);

  const ranked = useMemo(() => {
    if (!selected) return [];
    return assets
      .map((asset) => ({ asset, score: scoreAsset(asset, selected) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.asset);
  }, [assets, selected]);

  const results = selected ? (ranked.length ? ranked : assets.slice(0, 6)) : [];

  function choose(term: string) {
    setSelected(term);
    window.setTimeout(() => document.getElementById('keyword-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
  }

  function openAsset(id: string) {
    const target = document.getElementById(`imagen-${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.history.replaceState(null, '', `#imagen-${id}`);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => choose(term)}
            className={`rounded-full border px-3.5 py-2.5 text-[10px] font-black transition ${selected === term ? 'border-[#F6C64A] bg-[#F6C64A] text-black' : 'border-white/10 bg-white/[.035] text-white/52 hover:border-[#57D4FF]/40 hover:text-white'}`}
          >
            {term}
          </button>
        ))}
      </div>

      <div id="keyword-results" className="scroll-mt-28">
        {selected ? (
          <div className="mt-7 rounded-[1.35rem] border border-white/9 bg-black/20 p-3 sm:p-4">
            <div className="flex flex-col gap-1 border-b border-white/8 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#57D4FF]">Imágenes relacionadas</p>
                <h3 className="mt-1 text-lg font-black tracking-[-.03em]">{selected}</h3>
              </div>
              <p className="text-[9px] text-white/32">{ranked.length ? `${ranked.length} coincidencias del álbum` : 'Referencias más cercanas del álbum'}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((asset) => (
                <button key={asset.id} type="button" onClick={() => openAsset(asset.id)} className="group overflow-hidden rounded-xl border border-white/8 bg-[#081015] text-left transition hover:border-[#F6C64A]/35">
                  <div className="aspect-[4/3] overflow-hidden"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" /></div>
                  <span className="block line-clamp-2 px-2.5 py-2 text-[9px] font-black leading-4 text-white/64">{asset.title}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[9px] leading-4 text-white/30">Toca una imagen para ir directamente a su referencia dentro de la galería.</p>
          </div>
        ) : <p className="mt-5 text-xs leading-6 text-white/32">Toca una palabra para abrir las imágenes del álbum que mejor coinciden con esa idea.</p>}
      </div>
    </div>
  );
}
