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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Authoritative uncached read. Admin/editor flows use this so a just-saved
 * value can never be hidden behind the public 5 minute cache.
 */
export async function getSiteSectionFresh<K extends SectionKey>(key: K): Promise<SectionContentMap[K]> {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('site_structure')
    .select('content')
    .eq('section_key', key)
    .limit(1);

  if (error) throw new Error(error.message || `site_structure read failed for ${key}`);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== 'object') return SECTION_DEFAULTS[key];
  return mergeWithDefault(key, (row as { content?: unknown }).content);
}

async function readSiteSection<K extends SectionKey>(key: K): Promise<SectionContentMap[K]> {
  try {
    return await getSiteSectionFresh(key);
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
 * Persist a section. Caller is responsible for authentication. The operation
 * first resolves whether the row exists, then updates/inserts exactly once,
 * and finally performs an uncached read-back. This avoids the old false
 * fallback where a successful UPDATE that returned no selected rows could be
 * followed by a duplicate INSERT.
 */
export async function setSiteSection<K extends SectionKey>(
  key: K,
  content: SectionContentMap[K],
  updatedBy?: string,
): Promise<SectionContentMap[K]> {
  const merged = mergeWithDefault(key, content);
  const client = getAdminInsforge();
  const now = new Date().toISOString();

  const existing = await client.database
    .from('site_structure')
    .select('section_key')
    .eq('section_key', key)
    .limit(1);

  if (existing.error) {
    throw new Error(existing.error.message || `site_structure lookup failed for ${key}`);
  }

  const exists = Array.isArray(existing.data) && existing.data.length > 0;
  if (exists) {
    const updatePayload: Record<string, unknown> = {
      content: merged,
      updated_at: now,
    };
    if (updatedBy) updatePayload.updated_by = updatedBy;

    const updated = await client.database
      .from('site_structure')
      .update(updatePayload)
      .eq('section_key', key);

    if (updated.error) {
      throw new Error(updated.error.message || `site_structure update failed for ${key}`);
    }
  } else {
    const insertPayload: Record<string, unknown> = {
      section_key: key,
      content: merged,
      version: 1,
      updated_at: now,
    };
    if (updatedBy) insertPayload.updated_by = updatedBy;

    const inserted = await client.database
      .from('site_structure')
      .insert([insertPayload]);

    if (inserted.error) {
      throw new Error(inserted.error.message || `site_structure insert failed for ${key}`);
    }
  }

  const persisted = await getSiteSectionFresh(key);
  if (stableJson(persisted) !== stableJson(merged)) {
    throw new Error(`site_structure verification failed for ${key}`);
  }

  publishAndInvalidate(key);
  return persisted;
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
