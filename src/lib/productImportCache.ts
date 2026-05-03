import 'server-only';
import { getAdminInsforge } from './adminApi';
import type { ImportedProduct } from './productImport';

/**
 * Lightweight read-through cache for the product importer backed by the
 * `product_import_history` table.
 *
 * The schema is created in `scripts/create-tables.sql`:
 *   normalized_url text UNIQUE NOT NULL  -- cache key
 *   url text NOT NULL                    -- the original (verbatim) URL
 *   source / title / price_clp / currency / image_url / raw / fetched_at
 *   hit_count integer DEFAULT 1
 *
 * We deliberately don't surface cache hits to `?persist=true` callers — the
 * persist branch always re-resolves so the merchant sees the *current*
 * upstream price/stock at the moment they save the product.
 */

/**
 * Strips marketing/tracking params and trailing fragments so that
 *    https://articulo.mercadolibre.cl/MLC-123?utm_source=instagram#desc
 * and
 *    https://articulo.mercadolibre.cl/MLC-123/?ref=foo
 * collapse to the same cache key. Falls back to the trimmed input on
 * URL-parse errors so the cache layer never breaks the importer.
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'ref',
  'referrer',
  'mc_eid',
  'mc_cid',
  'igshid',
  'matt_tool',
  'matt_word',
  'searchVariation',
]);

export function normalizeImportUrl(input: string): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.hash = '';
    u.host = u.host.toLowerCase();
    // Drop tracking params; preserve everything else (e.g. variant ids).
    const kept = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      if (TRACKING_PARAMS.has(k.toLowerCase())) continue;
      kept.append(k, v);
    }
    // URLSearchParams sorts insertion order — sort lexicographically so that
    // ?a=1&b=2 and ?b=2&a=1 produce the same key.
    const sorted = new URLSearchParams([...kept.entries()].sort(([a], [b]) => a.localeCompare(b)));
    u.search = sorted.toString();
    // Trim trailing slash on path (but keep root "/").
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export interface CachedImport {
  preview: ImportedProduct;
  fetchedAt: string;
  hitCount: number;
}

/**
 * Looks up a previous resolution. Returns `null` on cache miss, when the
 * row is older than `maxAgeMs`, or when the table doesn't exist yet (so
 * the importer keeps working on fresh databases without the migration).
 */
export async function readImportCache(
  url: string,
  { maxAgeMs = 24 * 60 * 60 * 1000 }: { maxAgeMs?: number } = {},
): Promise<CachedImport | null> {
  const key = normalizeImportUrl(url);
  if (!key) return null;
  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('product_import_history')
      .select('url, normalized_url, source, title, price_clp, currency, image_url, raw, hit_count, fetched_at')
      .eq('normalized_url', key)
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as {
      url: string;
      source?: string;
      title?: string;
      price_clp?: number | string;
      currency?: string;
      image_url?: string;
      raw?: ImportedProduct | null;
      hit_count?: number;
      fetched_at?: string;
    };
    if (row.fetched_at) {
      const ageMs = Date.now() - new Date(row.fetched_at).getTime();
      if (Number.isFinite(ageMs) && ageMs > maxAgeMs) return null;
    }
    // Prefer the full preview persisted in `raw`; fall back to building a
    // partial `ImportedProduct` from the denormalised columns. This lets a
    // human-edited row (e.g. corrected title) override the scraped one.
    const fromRaw = row.raw && typeof row.raw === 'object' ? row.raw : null;
    if (fromRaw) {
      return {
        preview: fromRaw,
        fetchedAt: row.fetched_at ?? new Date().toISOString(),
        hitCount: typeof row.hit_count === 'number' ? row.hit_count : 1,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Inserts/refreshes the cache row. Best-effort — silently no-ops when the
 * table is missing. Bumps `hit_count` on the second+ resolution of the
 * same URL so the admin UI can surface "most-imported sources".
 */
export async function writeImportCache(
  url: string,
  preview: ImportedProduct,
): Promise<void> {
  const key = normalizeImportUrl(url);
  if (!key) return;
  try {
    const client = getAdminInsforge();
    // Read existing hit_count so we can increment it.
    let nextHit = 1;
    try {
      const { data } = await client.database
        .from('product_import_history')
        .select('hit_count')
        .eq('normalized_url', key)
        .limit(1);
      if (Array.isArray(data) && data.length > 0) {
        const prev = (data[0] as { hit_count?: number }).hit_count;
        nextHit = (typeof prev === 'number' && prev > 0 ? prev : 0) + 1;
      }
    } catch {
      /* ignore */
    }

    const priceClp =
      preview.currency?.toUpperCase() === 'CLP' && Number.isFinite(preview.price)
        ? Math.round(preview.price)
        : null;

    await client.database.from('product_import_history').upsert(
      [
        {
          url: url.trim().slice(0, 2000),
          normalized_url: key,
          source: preview.source ?? null,
          title: preview.title?.slice(0, 280) ?? null,
          price_clp: priceClp,
          currency: preview.currency ?? null,
          image_url: preview.imageUrl ?? null,
          raw: preview,
          hit_count: nextHit,
          fetched_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'normalized_url' },
    );
  } catch {
    // Table may not exist yet — caller doesn't care.
  }
}
