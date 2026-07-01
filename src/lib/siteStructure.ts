import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getAdminInsforge } from './adminApi';
import { publishCmsEvent } from './cmsBus';
import {
  SECTION_DEFAULTS,
  mergeWithDefault,
  pathsForSection,
  type SectionContentMap,
  type SectionKey,
} from './siteStructureTypes';

/**
 * Server-only access to the `site_structure` table.
 *
 * The table is a tiny key→JSONB store (one row per CMS-managed section). We
 * deliberately keep the API thin so callers can lean on `mergeWithDefault`
 * for safe, type-checked reads even when the row is missing or malformed.
 */

export interface SiteSectionRow<K extends SectionKey = SectionKey> {
  section_key: K;
  content: SectionContentMap[K];
  version: number;
  updated_at: string | null;
  updated_by: string | null;
}

export const SITE_STRUCTURE_CACHE_TAG = 'site-structure';

async function readSiteSection<K extends SectionKey>(key: K): Promise<SectionContentMap[K]> {
  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('site_structure')
      .select('content')
      .eq('section_key', key)
      .limit(1);
    if (error) return SECTION_DEFAULTS[key];
    const row = Array.isArray(data) ? data[0] : null;
    if (!row || typeof row !== 'object') return SECTION_DEFAULTS[key];
    const raw = (row as { content?: unknown }).content;
    return mergeWithDefault(key, raw);
  } catch {
    return SECTION_DEFAULTS[key];
  }
}

const getSiteSectionCached = unstable_cache(
  async (key: SectionKey): Promise<SectionContentMap[SectionKey]> => readSiteSection(key),
  ['site-structure-section'],
  { revalidate: 300, tags: [SITE_STRUCTURE_CACHE_TAG] },
);

function invalidateSiteStructureCache() {
  try {
    revalidateTag(SITE_STRUCTURE_CACHE_TAG);
  } catch {
    // Best effort: unavailable in some local/test contexts.
  }
}

function publishAndInvalidate(key: SectionKey) {
  invalidateSiteStructureCache();
  publishCmsEvent({ topic: 'settings', action: `site:${key}`, paths: pathsForSection(key) });
}

/**
 * Read a section from the database. Returns the merged-with-defaults content
 * so callers never have to null-check. If the table is missing, the row is
 * absent, or the database errors, the default is returned silently — this is
 * a public-content read path and must never break the page.
 *
 * The read is cached twice:
 *   - `unstable_cache` shares the result across requests for public traffic;
 *   - `React.cache` dedupes repeated reads inside a single render tree.
 */
export const getSiteSection = cache(async <K extends SectionKey>(
  key: K,
): Promise<SectionContentMap[K]> => getSiteSectionCached(key) as Promise<SectionContentMap[K]>);

/**
 * Persist a section. Caller is responsible for authentication. Publishes a
 * CMS event so connected public clients refresh.
 *
 * @returns the merged-with-defaults representation that was persisted.
 */
export async function setSiteSection<K extends SectionKey>(
  key: K,
  content: SectionContentMap[K],
  updatedBy?: string,
): Promise<SectionContentMap[K]> {
  const merged = mergeWithDefault(key, content);
  const client = getAdminInsforge();
  // Try update first; if it affects no rows, insert. Avoids requiring an
  // ON CONFLICT-aware client (the SDK's upsert support is uneven).
  const updatePayload: Record<string, unknown> = {
    content: merged,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) updatePayload.updated_by = updatedBy;

  const updated = await client.database
    .from('site_structure')
    .update(updatePayload)
    .eq('section_key', key)
    .select();

  const updatedRows = Array.isArray(updated.data) ? updated.data : [];
  if (!updated.error && updatedRows.length > 0) {
    publishAndInvalidate(key);
    return merged;
  }

  // Fallback: insert a new row.
  const insertPayload: Record<string, unknown> = {
    section_key: key,
    content: merged,
    version: 1,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) insertPayload.updated_by = updatedBy;

  const inserted = await client.database
    .from('site_structure')
    .insert([insertPayload])
    .select();

  if (inserted.error) {
    // Surface so callers can return a 500 with context, but don't leak SDK
    // shape to the network — caller wraps this in their own try/catch.
    throw new Error(inserted.error.message || 'site_structure insert failed');
  }

  publishAndInvalidate(key);
  return merged;
}

/** Read every section in one shot (used by `/admin/editor` boot). */
export async function getAllSiteSections(): Promise<SectionContentMap> {
  const result = { ...SECTION_DEFAULTS };
  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database.from('site_structure').select('section_key, content');
    if (error || !Array.isArray(data)) return result;
    for (const row of data) {
      if (!row || typeof row !== 'object') continue;
      const key = (row as { section_key?: unknown }).section_key;
      const content = (row as { content?: unknown }).content;
      if (typeof key !== 'string') continue;
      if (key in result) {
        // Type-safe by construction since `key` is a known SectionKey.
        (result as Record<string, unknown>)[key] = mergeWithDefault(
          key as SectionKey,
          content,
        );
      }
    }
  } catch {
    /* fall through to defaults */
  }
  return result;
}
