'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SECTION_DEFAULTS,
  isSectionKey,
  mergeWithDefault,
  type SectionContentMap,
  type SectionKey,
} from '@/lib/siteStructureTypes';

/**
 * Universal CMS — client provider.
 *
 * Carries an in-memory map of `section_key → content` that:
 *   1. Hydrates with the server-rendered initial bundle (typically
 *      `global-styles` + `nav-menu`) so the first paint never flickers.
 *   2. Lazy-fills additional sections as `useSiteContent(key)` is mounted
 *      via `GET /api/site-structure/[key]`.
 *   3. Accepts in-flight overrides via `mutate(key, content)` for live
 *      preview from `/admin/editor`.
 *   4. Listens for `window.postMessage({ type: 'cms:preview', section_key,
 *      content })` events from a parent admin window — but only when the
 *      page is mounted with `?cms=preview`. Outside preview mode, every
 *      message is ignored regardless of origin (defence in depth even if a
 *      forged message somehow reached the iframe).
 */

type SectionMap = Partial<{ [K in SectionKey]: SectionContentMap[K] }>;

interface SiteConfigContextValue {
  sections: SectionMap;
  /** Replace the cached content for a given key (used by live preview). */
  mutate: <K extends SectionKey>(key: K, content: SectionContentMap[K]) => void;
  /** Whether this client is rendering inside `/admin/editor`'s preview iframe. */
  previewMode: boolean;
  /** Internal: track which keys have been fetched. */
  fetched: Partial<Record<SectionKey, true>>;
  markFetched: (key: SectionKey) => void;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export interface SiteConfigProviderProps {
  initial?: SectionMap;
  /** Forces preview mode for SSR contexts where window.location is unavailable. */
  initialPreviewMode?: boolean;
  children: ReactNode;
}

export function SiteConfigProvider({
  initial,
  initialPreviewMode = false,
  children,
}: SiteConfigProviderProps) {
  const [sections, setSections] = useState<SectionMap>(() => ({ ...(initial ?? {}) }));
  const fetchedRef = useRef<Partial<Record<SectionKey, true>>>({});
  const [previewMode, setPreviewMode] = useState<boolean>(initialPreviewMode);

  // Detect `?cms=preview` once mounted in the browser.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('cms') === 'preview') setPreviewMode(true);
    } catch {
      /* noop */
    }
  }, []);

  // Listen for postMessage live-preview updates from the parent admin window.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!previewMode) return;

    const handler = (event: MessageEvent) => {
      // Origin guard — must be same-origin to prevent cross-site forgery
      // even when an attacker manages to embed our preview page.
      try {
        if (event.origin !== window.location.origin) return;
      } catch {
        return;
      }
      const data = event.data as unknown;
      if (!data || typeof data !== 'object') return;
      const payload = data as Record<string, unknown>;
      if (payload.type !== 'cms:preview') return;
      const key = payload.section_key;
      if (!isSectionKey(key)) return;
      const content = mergeWithDefault(key, payload.content);
      setSections((prev) => ({ ...prev, [key]: content }));
    };

    window.addEventListener('message', handler);

    // Tell the opener we're ready to receive drafts (helps the editor replay
    // any draft the user already typed before the iframe finished loading).
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'cms:preview-ready' }, window.location.origin);
      }
    } catch {
      /* noop */
    }

    return () => window.removeEventListener('message', handler);
  }, [previewMode]);

  const mutate = useCallback(<K extends SectionKey>(key: K, content: SectionContentMap[K]) => {
    setSections((prev) => ({ ...prev, [key]: mergeWithDefault(key, content) }));
  }, []);

  const markFetched = useCallback((key: SectionKey) => {
    fetchedRef.current[key] = true;
  }, []);

  const value = useMemo<SiteConfigContextValue>(
    () => ({ sections, mutate, previewMode, fetched: fetchedRef.current, markFetched }),
    [sections, mutate, previewMode, markFetched],
  );

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

/** Internal accessor — most consumers should use `useSiteContent` instead. */
export function useSiteConfigContext(): SiteConfigContextValue {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    // Be lenient: SSR-friendly fallback that returns a stable, empty map.
    // Tests, isolated stories or admin tools that don't wrap with a provider
    // still render with defaults.
    return {
      sections: {},
      mutate: () => {},
      previewMode: false,
      fetched: {},
      markFetched: () => {},
    };
  }
  return ctx;
}

export function useSiteConfigContextOrNull(): SiteConfigContextValue | null {
  return useContext(SiteConfigContext);
}

export { SECTION_DEFAULTS };
