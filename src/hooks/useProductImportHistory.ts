'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny client-side cache + history for the URL importer (Plan §5).
 *
 * Stores the last N successful previews in localStorage so the admin can
 * quickly re-import or compare against earlier resolutions without burning
 * another scrape round-trip. Backed by `localStorage` to keep the change
 * surgical — a server-side `product_import_history` table is a larger
 * follow-up that needs a migration block in `scripts/create-tables.sql`.
 *
 * Each entry stores the URL, normalised URL (key), title, image, price,
 * currency, source and timestamp. Duplicates by normalised URL are merged
 * (most recent wins) and we keep at most `MAX_ENTRIES` rows so the storage
 * footprint stays bounded.
 */

const STORAGE_KEY = 'admin:product-import:history';
const MAX_ENTRIES = 20;

export interface ProductImportHistoryEntry {
  /** Original URL the admin pasted. */
  url: string;
  /** Lower-cased URL with the search/hash stripped — used as merge key. */
  normalizedUrl: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  source: string;
  /** Unix-ms when the entry was last updated. */
  ts: number;
  /** How many times this URL has been imported (cache-hit counter; the first
   *  successful import sets this to 1, subsequent re-imports increment it). */
  hitCount: number;
}

export function normalizeImportUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

function readStorage(): ProductImportHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive — strip anything that isn't a well-formed entry.
    return parsed.filter(
      (e): e is ProductImportHistoryEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as ProductImportHistoryEntry).url === 'string' &&
        typeof (e as ProductImportHistoryEntry).normalizedUrl === 'string',
    );
  } catch {
    return [];
  }
}

function writeStorage(entries: ProductImportHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function useProductImportHistory() {
  const [entries, setEntries] = useState<ProductImportHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readStorage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const record = useCallback(
    (e: Omit<ProductImportHistoryEntry, 'normalizedUrl' | 'ts' | 'hitCount'>) => {
      const normalizedUrl = normalizeImportUrl(e.url);
      setEntries((prev) => {
        const existing = prev.find((p) => p.normalizedUrl === normalizedUrl);
        const next: ProductImportHistoryEntry = {
          ...e,
          normalizedUrl,
          ts: Date.now(),
          hitCount: (existing?.hitCount ?? 0) + 1,
        };
        const without = prev.filter((p) => p.normalizedUrl !== normalizedUrl);
        const merged = [next, ...without].slice(0, MAX_ENTRIES);
        writeStorage(merged);
        return merged;
      });
    },
    [],
  );

  const remove = useCallback((normalizedUrl: string) => {
    setEntries((prev) => {
      const next = prev.filter((p) => p.normalizedUrl !== normalizedUrl);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setEntries([]);
  }, []);

  return { entries, record, remove, clear };
}
