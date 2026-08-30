'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
  type HomeVisualSectionStyle,
} from '@/lib/homeVisualCms';
import {
  createHomeBlockFromTemplate,
  getHomeVisualBlockTemplate,
  isHomeVisualLibraryBlockId,
} from '@/lib/homeVisualBlockLibrary';
import {
  getRepeatedItemPosition,
  mutateRepeatedItem,
  relocatedSources,
  remapRepeatedItemStyles,
  type RepeatedItemAction,
} from '@/lib/homeVisualRepeatedStyles';

const HOME_STRUCTURE_DRAFT_KEY = 'sf-visual-cms-home-structure-draft-v1';
const HISTORY_LIMIT = 30;

type StructureAction = 'move-up' | 'move-down' | 'duplicate';

type StructureMessage = {
  type?: string;
  sectionId?: string;
  targetSectionId?: string;
  container?: string;
  targetContainer?: string;
  afterSectionId?: string;
  templateId?: string;
  action?: StructureAction;
};

function sameContent(a: HomePageContent | null, b: HomePageContent | null) {
  return Boolean(a && b && JSON.stringify(a) === JSON.stringify(b));
}

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
  const libraryCopy = isHomeVisualLibraryBlockId(section.id);
  return {
    ...section,
    id: libraryCopy ? `cms-duplicate-${Date.now().toString(36)}` : `${section.type}-${Date.now().toString(36)}`,
    label: `${section.label} copia`,
    order: section.order + 5,
    style: JSON.parse(JSON.stringify(section.style)) as HomeVisualSectionStyle,
    content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
  };
}

function normalizedSections(content: HomePageContent, sections: HomeVisualSection[]) {
  return normalizeHomePage({
    ...content,
    sections: sections.map((section, position) => ({ ...section, order: (position + 1) * 10 })),
  });
}

function applySectionAction(content: HomePageContent, sectionId: string, action: StructureAction) {
  const ordered = [...content.sections].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((section) => section.id === sectionId);
  if (index < 0) return content;

  if (action === 'duplicate') {
    const copy = cloneSection(ordered[index]);
    ordered.splice(index + 1, 0, copy);
    return normalizedSections(content, ordered);
  }

  const target = action === 'move-up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return content;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return normalizedSections(content, ordered);
}

function applySectionRelocate(content: HomePageContent, sectionId: string, targetSectionId: string) {
  const ordered = [...content.sections].sort((a, b) => a.order - b.order);
  const from = ordered.findIndex((section) => section.id === sectionId);
  const to = ordered.findIndex((section) => section.id === targetSectionId);
  if (from < 0 || to < 0 || from === to) return content;
  const [moved] = ordered.splice(from, 1);
  ordered.splice(to, 0, moved);
  return normalizedSections(content, ordered);
}

function applyInsertBlock(content: HomePageContent, templateId: string, afterSectionId?: string) {
  const template = getHomeVisualBlockTemplate(templateId);
  if (!template) return content;
  const ordered = [...content.sections].sort((a, b) => a.order - b.order);
  const selectedIndex = afterSectionId ? ordered.findIndex((section) => section.id === afterSectionId) : -1;
  const footerIndex = ordered.findIndex((section) => section.type === 'footer');
  let insertAt = selectedIndex >= 0 ? selectedIndex + 1 : (footerIndex >= 0 ? footerIndex : ordered.length);
  if (selectedIndex >= 0 && ordered[selectedIndex]?.type === 'footer') insertAt = selectedIndex;
  const block = createHomeBlockFromTemplate(templateId, (insertAt + 1) * 10);
  if (!block) return content;
  ordered.splice(insertAt, 0, block);
  return normalizedSections(content, ordered);
}

function applyRemoveLibraryBlock(content: HomePageContent, sectionId: string) {
  if (!isHomeVisualLibraryBlockId(sectionId)) return content;
  const ordered = [...content.sections].sort((a, b) => a.order - b.order);
  const next = ordered.filter((section) => section.id !== sectionId);
  if (next.length === ordered.length) return content;
  return normalizedSections(content, next);
}

function applyCardAction(content: HomePageContent, sectionId: string, container: string, action: StructureAction) {
  let changed = false;
  const sections = content.sections.map((section) => {
    if (section.id !== sectionId) return section;
    const result = mutateRepeatedItem(section, container, action as RepeatedItemAction);
    if (!result) return section;
    changed = true;
    return result.section;
  });
  return changed ? normalizeHomePage({ ...content, sections }) : content;
}

function applyCardRelocate(content: HomePageContent, sectionId: string, container: string, targetContainer: string) {
  let changed = false;
  const sections = content.sections.map((section) => {
    if (section.id !== sectionId) return section;
    const source = getRepeatedItemPosition(section, container);
    const target = getRepeatedItemPosition(section, targetContainer);
    if (!source || !target || source.key !== target.key || source.index === target.index || source.length !== target.length) return section;
    const list = section.content[source.key] as unknown[];
    const sources = relocatedSources(source.length, source.index, target.index);
    if (sources[target.index] !== source.index) return section;
    changed = true;
    return {
      ...section,
      content: { ...section.content, [source.key]: sources.map((sourceIndex) => list[sourceIndex]) },
      style: remapRepeatedItemStyles(section.style, source.key, sources),
    };
  });
  return changed ? normalizeHomePage({ ...content, sections }) : content;
}

export default function VisualCmsHomeStructureBridge() {
  const publishedRef = useRef<HomePageContent | null>(null);
  const draftRef = useRef<HomePageContent | null>(null);
  const historyPastRef = useRef<HomePageContent[]>([]);
  const historyFutureRef = useRef<HomePageContent[]>([]);
  const loadingRef = useRef<Promise<HomePageContent> | null>(null);
  const publishingRef = useRef(false);

  const postToPreview = useCallback((message: unknown) => {
    editorPreviewFrame()?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const persistDraft = useCallback((draft: HomePageContent) => {
    if (sameContent(draft, publishedRef.current)) window.localStorage.removeItem(HOME_STRUCTURE_DRAFT_KEY);
    else window.localStorage.setItem(HOME_STRUCTURE_DRAFT_KEY, JSON.stringify(draft));
  }, []);

  const emitState = useCallback((status?: string) => {
    const published = publishedRef.current;
    const draft = draftRef.current;
    postToPreview({
      type: 'cms:visual-home-structure-state',
      dirty: Boolean(published && draft && !sameContent(published, draft)),
      busy: publishingRef.current,
      canUndo: historyPastRef.current.length > 0,
      canRedo: historyFutureRef.current.length > 0,
      status: status || '',
    });
  }, [postToPreview]);

  const sendDraft = useCallback((status?: string) => {
    if (draftRef.current) postToPreview({ type: 'cms:visual-home-preview', content: draftRef.current });
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
      const local = window.localStorage.getItem(HOME_STRUCTURE_DRAFT_KEY);
      if (local) {
        try { draft = normalizeHomePage(JSON.parse(local)); }
        catch { window.localStorage.removeItem(HOME_STRUCTURE_DRAFT_KEY); }
      }
      draftRef.current = draft;
      historyPastRef.current = [];
      historyFutureRef.current = [];
      return draft;
    })();

    loadingRef.current = promise;
    try { return await promise; }
    finally { loadingRef.current = null; }
  }, []);

  const setDraft = useCallback((next: HomePageContent, status: string) => {
    draftRef.current = next;
    persistDraft(next);
    sendDraft(status);
  }, [persistDraft, sendDraft]);

  const commitDraft = useCallback((current: HomePageContent, next: HomePageContent, status: string) => {
    if (sameContent(current, next)) return false;
    historyPastRef.current = [...historyPastRef.current.slice(-(HISTORY_LIMIT - 1)), current];
    historyFutureRef.current = [];
    setDraft(next, status);
    return true;
  }, [setDraft]);

  const undo = useCallback(() => {
    const current = draftRef.current;
    const previous = historyPastRef.current.at(-1);
    if (!current || !previous) {
      emitState('No hay más cambios estructurales para deshacer.');
      return;
    }
    historyPastRef.current = historyPastRef.current.slice(0, -1);
    historyFutureRef.current = [current, ...historyFutureRef.current].slice(0, HISTORY_LIMIT);
    setDraft(previous, 'Cambio estructural deshecho.');
  }, [emitState, setDraft]);

  const redo = useCallback(() => {
    const current = draftRef.current;
    const next = historyFutureRef.current[0];
    if (!current || !next) {
      emitState('No hay cambios estructurales para rehacer.');
      return;
    }
    historyFutureRef.current = historyFutureRef.current.slice(1);
    historyPastRef.current = [...historyPastRef.current.slice(-(HISTORY_LIMIT - 1)), current];
    setDraft(next, 'Cambio estructural rehecho.');
  }, [emitState, setDraft]);

  const restorePublished = useCallback(() => {
    const current = draftRef.current;
    const published = publishedRef.current;
    if (!current || !published || sameContent(current, published)) {
      emitState('El borrador ya coincide con la versión publicada.');
      return;
    }
    historyPastRef.current = [...historyPastRef.current.slice(-(HISTORY_LIMIT - 1)), current];
    historyFutureRef.current = [];
    setDraft(published, 'Estructura restaurada a la versión publicada. Puedes deshacerlo.');
  }, [emitState, setDraft]);

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

      if (data?.type === 'cms:visual-home-structure-undo') {
        undo();
        return;
      }
      if (data?.type === 'cms:visual-home-structure-redo') {
        redo();
        return;
      }
      if (data?.type === 'cms:visual-home-structure-restore') {
        restorePublished();
        return;
      }

      if (data?.type === 'cms:visual-home-insert-block' && typeof data.templateId === 'string') {
        void ensureLoaded().then((current) => {
          const template = getHomeVisualBlockTemplate(data.templateId);
          if (!template) {
            emitState('Ese bloque no pertenece a la biblioteca administrada.');
            return;
          }
          const next = applyInsertBlock(current, data.templateId!, data.afterSectionId);
          if (!commitDraft(current, next, `${template.label} añadido al borrador.`)) emitState('No se pudo insertar el bloque.');
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo insertar el bloque.'));
        return;
      }

      if (data?.type === 'cms:visual-home-remove-block' && typeof data.sectionId === 'string') {
        void ensureLoaded().then((current) => {
          if (!isHomeVisualLibraryBlockId(data.sectionId)) {
            emitState('Solo los bloques creados desde la biblioteca se eliminan desde este control.');
            return;
          }
          const next = applyRemoveLibraryBlock(current, data.sectionId!);
          if (!commitDraft(current, next, 'Bloque eliminado del borrador. Puedes deshacerlo.')) emitState('El bloque ya no existe en el borrador.');
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo eliminar el bloque.'));
        return;
      }

      if (data?.type === 'cms:visual-home-structure-relocate' && typeof data.sectionId === 'string' && typeof data.targetSectionId === 'string') {
        void ensureLoaded().then((current) => {
          const next = applySectionRelocate(current, data.sectionId!, data.targetSectionId!);
          if (!commitDraft(current, next, 'Sección reordenada por arrastre.')) emitState('La sección ya está en esa posición.');
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo reordenar la sección.'));
        return;
      }

      if (data?.type === 'cms:visual-home-card-structure-relocate' && typeof data.sectionId === 'string' && typeof data.container === 'string' && typeof data.targetContainer === 'string') {
        void ensureLoaded().then((current) => {
          const next = applyCardRelocate(current, data.sectionId!, data.container!, data.targetContainer!);
          if (!commitDraft(current, next, 'Tarjeta reordenada por arrastre.')) emitState('La tarjeta ya está en esa posición o no pertenece al mismo grupo.');
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo reordenar la tarjeta.'));
        return;
      }

      if (data?.type === 'cms:visual-home-structure-action' && typeof data.sectionId === 'string' && data.action) {
        void ensureLoaded().then((current) => {
          const next = applySectionAction(current, data.sectionId!, data.action!);
          if (!commitDraft(current, next, data.action === 'move-up' ? 'Sección movida hacia arriba.' : data.action === 'move-down' ? 'Sección movida hacia abajo.' : 'Sección duplicada en el borrador.')) {
            emitState(data.action === 'move-up' ? 'La sección ya está al inicio.' : data.action === 'move-down' ? 'La sección ya está al final.' : 'No se pudo duplicar la sección.');
          }
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo modificar la estructura Home.'));
        return;
      }

      if (data?.type === 'cms:visual-home-card-structure-action' && typeof data.sectionId === 'string' && typeof data.container === 'string' && data.action) {
        void ensureLoaded().then((current) => {
          const next = applyCardAction(current, data.sectionId!, data.container!, data.action!);
          if (!commitDraft(current, next, data.action === 'move-up' ? 'Tarjeta movida hacia arriba.' : data.action === 'move-down' ? 'Tarjeta movida hacia abajo.' : 'Tarjeta duplicada en el borrador.')) {
            emitState(data.action === 'move-up' ? 'La tarjeta ya está al inicio.' : data.action === 'move-down' ? 'La tarjeta ya está al final.' : 'Este contenedor no admite duplicación estructural.');
          }
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo modificar la tarjeta.'));
        return;
      }

      if (data?.type === 'cms:visual-home-structure-publish') {
        if (publishingRef.current) return;
        void ensureLoaded().then(async (draft) => {
          publishingRef.current = true;
          emitState('Publicando estructura Home…');
          let finalStatus = '';
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
            historyPastRef.current = [];
            historyFutureRef.current = [];
            window.localStorage.removeItem(HOME_STRUCTURE_DRAFT_KEY);
            postToPreview({ type: 'cms:visual-home-preview', content: saved });
            finalStatus = 'Estructura Home publicada.';
          } catch (error) {
            finalStatus = error instanceof Error ? `No se pudo publicar: ${error.message}` : 'No se pudo publicar la estructura Home.';
          } finally {
            publishingRef.current = false;
            emitState(finalStatus);
          }
        }).catch((error) => emitState(error instanceof Error ? error.message : 'No se pudo cargar la estructura Home.'));
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [commitDraft, emitState, ensureLoaded, postToPreview, redo, restorePublished, sendDraft, undo]);

  return null;
}
