'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
  type HomeVisualSectionStyle,
} from '@/lib/homeVisualCms';

const HOME_DRAFT_KEY = 'sf-home-visual-cms-draft-v1';

type StructureAction = 'move-up' | 'move-down' | 'duplicate';

type StructureMessage = {
  type?: string;
  sectionId?: string;
  action?: StructureAction;
};

function editorPreviewFrame() {
  const root = document.querySelector<HTMLElement>('main[data-admin-content]');
  if (!root) return null;
  return Array.from(root.querySelectorAll<HTMLIFrameElement>('iframe')).find((frame) => {
    try {
      const url = new URL(frame.src, window.location.origin);
      return url.origin === window.location.origin && url.searchParams.get('cmsVisual') === '1';
    } catch {
      return false;
    }
  }) || null;
}

function cloneSection(section: HomeVisualSection): HomeVisualSection {
  return {
    ...section,
    id: `${section.type}-${Date.now().toString(36)}`,
    label: `${section.label} copia`,
    order: section.order + 5,
    style: JSON.parse(JSON.stringify(section.style)) as HomeVisualSectionStyle,
    content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
  };
}

function applyStructureAction(content: HomePageContent, sectionId: string, action: StructureAction) {
  const ordered = [...content.sections].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((section) => section.id === sectionId);
  if (index < 0) return content;

  if (action === 'duplicate') {
    const copy = cloneSection(ordered[index]);
    ordered.splice(index + 1, 0, copy);
    return normalizeHomePage({
      ...content,
      sections: ordered.map((section, position) => ({ ...section, order: (position + 1) * 10 })),
    });
  }

  const target = action === 'move-up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return content;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return normalizeHomePage({
    ...content,
    sections: ordered.map((section, position) => ({ ...section, order: (position + 1) * 10 })),
  });
}

export default function VisualCmsHomeStructureBridge() {
  const publishedRef = useRef<HomePageContent | null>(null);
  const draftRef = useRef<HomePageContent | null>(null);
  const loadingRef = useRef<Promise<HomePageContent> | null>(null);
  const publishingRef = useRef(false);

  const postToPreview = useCallback((message: unknown) => {
    editorPreviewFrame()?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const emitState = useCallback((status?: string) => {
    const published = publishedRef.current;
    const draft = draftRef.current;
    const dirty = Boolean(published && draft && JSON.stringify(published) !== JSON.stringify(draft));
    postToPreview({
      type: 'cms:visual-home-structure-state',
      dirty,
      busy: publishingRef.current,
      status: status || '',
    });
  }, [postToPreview]);

  const sendDraft = useCallback((status?: string) => {
    if (draftRef.current) {
      postToPreview({ type: 'cms:visual-home-preview', content: draftRef.current });
    }
    emitState(status);
  }, [emitState, postToPreview]);

  const ensureLoaded = useCallback(async () => {
    if (draftRef.current && publishedRef.current) return draftRef.current;
    if (loadingRef.current) return loadingRef.current;

    const promise = (async () => {
      const response = await fetch('/api/admin/site-structure/home-page', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const json = await response.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!response.ok) throw new Error(json.error || `HTTP ${response.status}`);
      const published = normalizeHomePage(json.content);
      publishedRef.current = published;

      let draft = published;
      const local = window.localStorage.getItem(HOME_DRAFT_KEY);
      if (local) {
        try { draft = normalizeHomePage(JSON.parse(local)); }
        catch { window.localStorage.removeItem(HOME_DRAFT_KEY); }
      }
      draftRef.current = draft;
      return draft;
    })();

    loadingRef.current = promise;
    try { return await promise; }
    finally { loadingRef.current = null; }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent<StructureMessage>) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;

      if (data?.type === 'cms:visual-home-ready') {
        void ensureLoaded()
          .then(() => sendDraft('Estructura Home lista.'))
          .catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo cargar la estructura Home.'));
        return;
      }

      if (data?.type === 'cms:visual-home-structure-action' && typeof data.sectionId === 'string' && data.action) {
        void ensureLoaded().then((current) => {
          const next = applyStructureAction(current, data.sectionId!, data.action!);
          if (JSON.stringify(next) === JSON.stringify(current)) {
            emitState(data.action === 'move-up' ? 'La sección ya está al inicio.' : data.action === 'move-down' ? 'La sección ya está al final.' : 'No se pudo duplicar la sección.');
            return;
          }
          draftRef.current = next;
          window.localStorage.setItem(HOME_DRAFT_KEY, JSON.stringify(next));
          const label = data.action === 'move-up' ? 'Sección movida hacia arriba.' : data.action === 'move-down' ? 'Sección movida hacia abajo.' : 'Sección duplicada en el borrador.';
          sendDraft(label);
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo modificar la estructura Home.'));
        return;
      }

      if (data?.type === 'cms:visual-home-structure-publish') {
        if (publishingRef.current) return;
        void ensureLoaded().then(async (draft) => {
          publishingRef.current = true;
          emitState('Publicando estructura Home…');
          try {
            const response = await fetch('/api/admin/site-structure/home-page', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: normalizeHomePage(draft) }),
            });
            const json = await response.json().catch(() => ({})) as { content?: unknown; error?: string };
            if (!response.ok) throw new Error(json.error || `HTTP ${response.status}`);
            const saved = normalizeHomePage(json.content ?? draft);
            publishedRef.current = saved;
            draftRef.current = saved;
            window.localStorage.removeItem(HOME_DRAFT_KEY);
            postToPreview({ type: 'cms:visual-home-preview', content: saved });
            emitState('Estructura Home publicada.');
          } catch (error) {
            emitState(error instanceof Error ? `No se pudo publicar: ${error.message}` : 'No se pudo publicar la estructura Home.');
          } finally {
            publishingRef.current = false;
            window.setTimeout(() => emitState(), 0);
          }
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo cargar la estructura Home.'));
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [emitState, ensureLoaded, postToPreview, sendDraft]);

  return null;
}
