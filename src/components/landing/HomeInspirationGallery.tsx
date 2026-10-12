'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ImageOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HomePremiumV10.module.css';

type Asset = {
  id: string;
  url: string;
  thumb: string;
  title: string;
  alt: string;
  album: string;
  album_title: string;
  album_cover?: boolean;
  fallback?: boolean;
  width?: number;
  height?: number;
};

type CatalogResponse = { assets?: Asset[]; error?: string };

const MAX_TILES = 12;

export default function HomeInspirationGallery() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/proyectos/cloudinary?folder=fabrick/inspiraciones&max=60', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => ({}))) as CatalogResponse;
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        const visible = (Array.isArray(body.assets) ? body.assets : [])
          .filter((asset) => asset && !asset.fallback && (asset.thumb || asset.url) && !/ideas-generales/.test(asset.album || ''));
        setAssets(visible.slice(0, MAX_TILES));
        setStatus(visible.length ? 'ready' : 'empty');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const openAt = useCallback((index: number) => {
    restoreFocusRef.current = document.activeElement;
    setOpenIndex(index);
  }, []);

  const close = useCallback(() => {
    setOpenIndex(null);
    const previous = restoreFocusRef.current;
    if (previous instanceof HTMLElement) previous.focus();
  }, []);

  const step = useCallback((delta: number) => {
    setOpenIndex((current) => (current === null ? current : (current + delta + assets.length) % assets.length));
  }, [assets.length]);

  useEffect(() => {
    if (openIndex === null) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, step]);

  if (status === 'loading') {
    return (
      <ul className={styles.wall} aria-hidden>
        {Array.from({ length: 6 }, (_, index) => <li key={index} className={styles.wallSkeleton} />)}
      </ul>
    );
  }

  if (status !== 'ready') {
    return (
      <div className={styles.wallEmpty}>
        <ImageOff size={22} aria-hidden />
        <p>
          {status === 'error'
            ? 'No pudimos cargar las inspiraciones en este momento. Puedes verlas igual en la galería completa.'
            : 'Todavía no publicamos referencias. La galería completa muestra todas las ideas disponibles.'}
        </p>
      </div>
    );
  }

  const active = openIndex === null ? null : assets[openIndex];

  return (
    <>
      <ul className={styles.wall}>
        {assets.map((asset, index) => (
          <li key={asset.id}>
            <button type="button" onClick={() => openAt(index)} className={styles.wallTile} aria-label={`Ampliar: ${asset.title || asset.album_title}`}>
              <img
                src={asset.thumb || asset.url}
                alt={asset.alt || asset.title || `Inspiración ${asset.album_title}`}
                width={asset.width || undefined}
                height={asset.height || undefined}
                loading={index < 3 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <span className={styles.wallCaption}>
                <strong>{asset.title || asset.album_title}</strong>
                <span>{asset.album_title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`Inspiración ampliada: ${active.title || active.album_title}`} onClick={close}>
          <figure className={styles.lightboxFigure} onClick={(event) => event.stopPropagation()}>
            <img src={active.url || active.thumb} alt={active.alt || active.title || 'Inspiración Soluciones Fabrick'} />
            <figcaption>
              <strong>{active.title || active.album_title}</strong>
              <span>{active.album_title}</span>
              <Link href={`/inspiraciones/${encodeURIComponent(active.album)}`} className={styles.quickLink}>
                Ver álbum completo <ArrowUpRight size={15} aria-hidden />
              </Link>
            </figcaption>
          </figure>

          {assets.length > 1 ? (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); step(-1); }} className={`${styles.lightboxNav} ${styles.lightboxPrev}`} aria-label="Inspiración anterior"><ChevronLeft size={20} aria-hidden /></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); step(1); }} className={`${styles.lightboxNav} ${styles.lightboxNext}`} aria-label="Inspiración siguiente"><ChevronRight size={20} aria-hidden /></button>
            </>
          ) : null}

          <button ref={closeRef} type="button" onClick={close} className={styles.lightboxClose} aria-label="Cerrar"><X size={18} aria-hidden /></button>
        </div>
      ) : null}
    </>
  );
}
