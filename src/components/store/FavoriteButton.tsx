'use client';

import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  productId: string;
  /** 'icon' = floating heart on cards, 'pill' = secondary CTA next to "Add to cart". */
  variant?: 'icon' | 'pill';
  className?: string;
}

/**
 * Reusable favorite (wishlist) button.
 *
 * Behaviour:
 *   - Authenticated: optimistic toggle via `useFavorites().toggle`.
 *   - Unauthenticated: shows a tooltip prompting login, dispatches a
 *     `fabrick:auth:open-login` window event so any login modal listening can
 *     open. Never silently fails.
 *
 * Accessibility: native <button> with `aria-pressed` reflecting current state.
 */
export default function FavoriteButton({
  productId,
  variant = 'icon',
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggle, isAuthed } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [showAuthHint, setShowAuthHint] = useState(false);
  const fav = isFavorite(productId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!isAuthed) {
      setShowAuthHint(true);
      window.setTimeout(() => setShowAuthHint(false), 2400);
      // Let any host page's login modal listen for this signal.
      try {
        window.dispatchEvent(new CustomEvent('fabrick:auth:open-login'));
      } catch {
        /* ignore */
      }
      return;
    }
    setBusy(true);
    try {
      await toggle(productId);
    } catch {
      // Optimistic revert is handled by the hook; nothing else to do.
    } finally {
      setBusy(false);
    }
  }

  const label = !isAuthed
    ? 'Inicia sesión para guardar'
    : fav
      ? 'Quitar de favoritos'
      : 'Guardar en favoritos';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        aria-label={label}
        disabled={busy}
        className={`relative inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-60 ${
          fav
            ? 'border-rose-400/60 bg-rose-500/10 text-rose-300 hover:border-rose-400'
            : 'border-white/15 bg-white/5 text-white hover:border-yellow-400/50'
        } ${className ?? ''}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart
            className={`h-4 w-4 ${fav ? 'fill-rose-400 text-rose-400' : 'text-white'}`}
            strokeWidth={fav ? 0 : 2}
          />
        )}
        {fav ? 'Guardado' : 'Guardar'}
        {showAuthHint && (
          <span
            role="tooltip"
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] font-semibold normal-case tracking-normal text-yellow-300 shadow-lg"
          >
            Inicia sesión para guardar
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      aria-label={label}
      title={label}
      disabled={busy}
      className={`group relative grid h-9 w-9 place-items-center rounded-full border bg-black/60 backdrop-blur-sm transition disabled:opacity-60 ${
        fav
          ? 'border-rose-400/60 text-rose-400'
          : 'border-white/20 text-white hover:border-rose-400/60 hover:text-rose-300'
      } ${className ?? ''}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={`h-4 w-4 transition-transform group-active:scale-90 ${
            fav ? 'fill-rose-400' : ''
          }`}
          strokeWidth={fav ? 0 : 2}
        />
      )}
      {showAuthHint && (
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] font-semibold text-yellow-300 shadow-lg"
        >
          Inicia sesión para guardar
        </span>
      )}
    </button>
  );
}
