'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSiteConfigContext } from '@/context/SiteConfigContext';
import {
  SECTION_DEFAULTS,
  mergeWithDefault,
  type SectionContentMap,
  type SectionKey,
} from '@/lib/siteStructureTypes';

/**
 * Read a CMS section's content from the SiteConfig provider, with the
 * following resolution order:
 *
 *   1. Provider cache (set either via SSR initial bundle or postMessage
 *      live preview) → returned synchronously, no flicker.
 *   2. SWR-style fetch from `/api/site-structure/[key]` on mount → cached
 *      in the provider for subsequent consumers.
 *   3. Built-in defaults from `SECTION_DEFAULTS` while #2 is in flight.
 *
 * The optional `fallback` argument lets a caller override the built-in
 * default — useful for sections that need to layer in component-local
 * copy that was passed as a prop.
 */
export function useSiteContent<K extends SectionKey>(
  key: K,
  fallback?: Partial<SectionContentMap[K]>,
): SectionContentMap[K] {
  const ctx = useSiteConfigContext();
  const cached = ctx.sections[key];
  const [, setTick] = useState(0);

  useEffect(() => {
    if (cached) return;
    if (ctx.fetched[key]) return;
    ctx.markFetched(key);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/site-structure/${encodeURIComponent(key)}`, {
          // SWR semantics: HTTP cache + browser revalidation. The route
          // sets stale-while-revalidate so subsequent loads are instant.
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { content?: unknown };
        if (cancelled) return;
        ctx.mutate(key, mergeWithDefault(key, json.content));
        setTick((n) => n + 1);
      } catch {
        // Silent — defaults are returned below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, cached, ctx]);

  return useMemo(() => {
    if (cached) return cached;
    if (fallback && Object.keys(fallback).length > 0) {
      return mergeWithDefault(key, { ...SECTION_DEFAULTS[key], ...fallback });
    }
    return SECTION_DEFAULTS[key];
  }, [cached, fallback, key]);
}
