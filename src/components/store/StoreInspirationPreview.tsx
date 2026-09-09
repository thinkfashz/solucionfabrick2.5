'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { Images, ImageOff, Sparkles } from 'lucide-react';

type InspirationAsset = {
  id: string;
  album: string;
  album_title?: string;
  title?: string;
  thumb?: string;
  url: string;
  fallback?: boolean;
  sort_order?: number;
};

type InspirationAlbum = {
  key: string;
  title: string;
  category?: string;
  cover?: string;
  count?: number;
};

type ApiResponse = {
  assets?: InspirationAsset[];
  albums?: InspirationAlbum[];
};

export function StoreInspirationPreview() {
  const [assets, setAssets] = useState<InspirationAsset[]>([]);
  const [albums, setAlbums] = useState<InspirationAlbum[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=40', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar Inspiraciones');
        return await response.json() as ApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setAssets((json.assets || []).filter((asset) => !asset.fallback && Boolean(asset.url)));
        setAlbums(json.albums || []);
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setAlbums([]);
        }
      })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const featured = useMemo(() => {
    const groups = new Map<string, InspirationAsset[]>();
    for (const asset of assets) {
      const list = groups.get(asset.album) || [];
      list.push(asset);
      groups.set(asset.album, list);
    }
    for (const list of groups.values()) list.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    const ranked = albums
      .map((album) => ({ album, items: groups.get(album.key) || [] }))
      .filter((entry) => entry.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length || Number(b.album.count || 0) - Number(a.album.count || 0));

    if (ranked[0]) return ranked[0];
    const first = groups.entries().next().value as [string, InspirationAsset[]] | undefined;
    if (!first) return null;
    return {
      album: { key: first[0], title: first[1][0]?.album_title || 'Inspiraciones Fabrick', count: first[1].length },
      items: first[1],
    };
  }, [albums, assets]);

  if (!loaded) {
    return <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_65%_35%,rgba(246,198,74,.16),transparent_35%),#071015]" aria-label="Cargando referencias de inspiración" />;
  }

  if (!featured) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_68%_25%,rgba(187,154,255,.18),transparent_34%),linear-gradient(145deg,#0B1318,#05090C)] px-6 text-center">
        <div className="max-w-xs">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-[#BB9AFF]"><ImageOff className="h-5 w-5" /></span>
          <b className="mt-4 block text-sm">Próximas referencias</b>
          <p className="mt-2 text-[10px] leading-5 text-white/38">Cuando un álbum tenga imágenes publicadas aparecerá aquí automáticamente. No usamos una foto genérica para reemplazarlo.</p>
        </div>
      </div>
    );
  }

  const main = featured.items[0];
  const thumbs = featured.items.slice(1, 4);
  const count = featured.items.length;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={main.thumb || main.url} alt={main.title || featured.album.title} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,11,.05),rgba(4,8,11,.12)_42%,rgba(4,8,11,.93)_100%)]" />
      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/55 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-white/80 backdrop-blur-md">
        <Sparkles className="h-3 w-3 text-[#BB9AFF]" /> Álbum real
      </div>
      <div className="absolute inset-x-3 bottom-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.12em] text-[#F6C64A]"><Images className="h-3 w-3" /> {count} referencias</p>
            <b className="mt-1 line-clamp-2 block max-w-[22ch] text-sm leading-tight text-white">{featured.album.title}</b>
          </div>
        </div>
        {thumbs.length ? <div className="grid grid-cols-3 gap-1.5">{thumbs.map((asset) => <div key={asset.id} className="h-14 overflow-hidden rounded-lg border border-white/15 bg-black/30"><img src={asset.thumb || asset.url} alt="" className="h-full w-full object-cover" /></div>)}</div> : null}
      </div>
    </div>
  );
}
