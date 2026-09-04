'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Monitor,
  Redo2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Type,
  Undo2,
} from 'lucide-react';
import HomeVisualInspector from './HomeVisualInspector';
import type { PreviewTextAction } from '@/components/cms/HomeVisualTextToolbar';
import {
  DEFAULT_HOME_PAGE,
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
  type HomeVisualSectionStyle,
} from '@/lib/homeVisualCms';
import { getContentFieldValue, patchContentField } from '@/lib/homeVisualContent';
import {
  getContainerResponsive,
  patchContainerResponsive,
} from '@/lib/homeVisualContainers';
import {
  mutateRepeatedItem,
  type RepeatedItemAction,
} from '@/lib/homeVisualRepeatedStyles';
import {
  getElementStyle,
  getElementTypography,
  patchElementStyle,
  patchElementTypography,
  type VisualDevice,
  type VisualTextAlign,
} from '@/lib/homeVisualLayout';

const LOCAL_DRAFT_KEY = 'sf-home-visual-cms-draft-v1';
const HISTORY_LIMIT = 40;
const HISTORY_COALESCE_MS = 500;
const WIDTHS: Record<VisualDevice, string> = { mobile: '390px', tablet: '768px', desktop: '100%' };
const DEVICE_LABELS: Record<VisualDevice, string> = { mobile: 'Móvil', tablet: 'Tablet', desktop: 'PC' };

type PreviewCardAction = RepeatedItemAction | 'toggle-hidden' | 'inspect';
type PreviewSectionAction = 'move-up' | 'move-down' | 'duplicate' | 'toggle-enabled' | 'inspect';

export default function HomeVisualEditorClient() {
  const [draft, setDraft] = useState<HomePageContent>(DEFAULT_HOME_PAGE);
  const [published, setPublished] = useState<HomePageContent>(DEFAULT_HOME_PAGE);
  const [historyPast, setHistoryPast] = useState<HomePageContent[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HomePageContent[]>([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_HOME_PAGE.sections[0].id);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [device, setDevice] = useState<VisualDevice>('desktop');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('Cargando configuración…');
  const [iframeReady, setIframeReady] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const draftRef = useRef<HomePageContent>(DEFAULT_HOME_PAGE);
  const lastHistoryAtRef = useRef(0);

  function replaceDraft(next: HomePageContent, clearHistory = false) {
    draftRef.current = next;
    setDraft(next);
    if (clearHistory) {
      setHistoryPast([]);
      setHistoryFuture([]);
      lastHistoryAtRef.current = 0;
    }
  }

  function commitDraft(updater: (current: HomePageContent) => HomePageContent, coalesce = true) {
    const current = draftRef.current;
    const next = updater(current);
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    const now = Date.now();
    const shouldPush = !coalesce || now - lastHistoryAtRef.current > HISTORY_COALESCE_MS;
    if (shouldPush) setHistoryPast((past) => [...past.slice(-(HISTORY_LIMIT - 1)), current]);
    setHistoryFuture([]);
    lastHistoryAtRef.current = now;
    replaceDraft(next);
  }

  function undo() {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(historyPast.slice(0, -1));
    setHistoryFuture([draftRef.current, ...historyFuture].slice(0, HISTORY_LIMIT));
    lastHistoryAtRef.current = 0;
    replaceDraft(previous);
    setStatus('Cambio deshecho.');
  }

  function redo() {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    setHistoryFuture(historyFuture.slice(1));
    setHistoryPast([...historyPast.slice(-(HISTORY_LIMIT - 1)), draftRef.current]);
    lastHistoryAtRef.current = 0;
    replaceDraft(next);
    setStatus('Cambio rehecho.');
  }

  const loadPublished = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/site-structure/home-page', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const live = normalizeHomePage(json.content);
      setPublished(live);
      const localRaw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if (localRaw) {
        try {
          const local = normalizeHomePage(JSON.parse(localRaw));
          replaceDraft(local, true);
          setSelectedId(local.sections[0]?.id || 'home-hero');
          setSelectedField(null);
          setStatus('Borrador local recuperado. La web pública no ha cambiado.');
          return;
        } catch {
          window.localStorage.removeItem(LOCAL_DRAFT_KEY);
        }
      }
      replaceDraft(live, true);
      setSelectedId(live.sections[0]?.id || 'home-hero');
      setSelectedField(null);
      setStatus('Configuración publicada cargada.');
    } catch (error) {
      replaceDraft(DEFAULT_HOME_PAGE, true);
      setPublished(DEFAULT_HOME_PAGE);
      setStatus(error instanceof Error ? `No se pudo cargar: ${error.message}` : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPublished(); }, [loadPublished]);
  useEffect(() => {
    if (loading) return;
    if (JSON.stringify(draft) === JSON.stringify(published)) window.localStorage.removeItem(LOCAL_DRAFT_KEY);
    else window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, published, loading]);

  const postDraft = useCallback((next: HomePageContent) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'cms:home-preview', content: next }, window.location.origin);
  }, []);

  const postSelected = useCallback((sectionId: string, field: string | null) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'cms:home-selected', sectionId, field }, window.location.origin);
  }, []);

  useEffect(() => { if (iframeReady) postDraft(draft); }, [draft, iframeReady, postDraft]);
  useEffect(() => { if (iframeReady && selectedId) postSelected(selectedId, selectedField); }, [selectedId, selectedField, iframeReady, postSelected]);

  function handlePreviewCardAction(sectionId: string, container: string, action: PreviewCardAction) {
    if (action === 'inspect') {
      setSelectedId(sectionId);
      setSelectedField(`${container}-container`);
      setStatus('Inspector de tarjeta abierto.');
      return;
    }

    if (action === 'toggle-hidden') {
      let changed = false;
      let hidden = false;
      commitDraft((current) => {
        const sections = current.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const currentResponsive = getContainerResponsive(section.style, container, device);
          hidden = currentResponsive.hidden !== true;
          changed = true;
          return {
            ...section,
            style: patchContainerResponsive(section.style, container, device, 'hidden', hidden),
          };
        });
        return changed ? { ...current, sections } : current;
      }, false);
      if (changed) {
        setSelectedId(sectionId);
        setSelectedField(`${container}-container`);
        setStatus(hidden ? `Tarjeta oculta en ${DEVICE_LABELS[device]}. Usa Deshacer o el inspector para volver a mostrarla.` : `Tarjeta visible en ${DEVICE_LABELS[device]}.`);
      }
      return;
    }

    let nextField: string | null = null;
    let changed = false;
    commitDraft((current) => {
      const sections = current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const result = mutateRepeatedItem(section, container, action);
        if (!result) return section;
        changed = true;
        nextField = result.selectedField;
        return result.section;
      });
      return changed ? { ...current, sections } : current;
    }, false);

    if (changed && nextField) {
      setSelectedId(sectionId);
      setSelectedField(nextField);
      const labels: Record<RepeatedItemAction, string> = { 'move-up': 'Tarjeta movida hacia arriba.', 'move-down': 'Tarjeta movida hacia abajo.', duplicate: 'Tarjeta duplicada con sus estilos.' };
      setStatus(labels[action]);
    }
  }

  function handlePreviewFieldChange(sectionId: string, field: string, value: string) {
    let changed = false;
    commitDraft((current) => {
      const sections = current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const previous = getContentFieldValue(section.content, field);
        if (typeof previous !== 'string' || previous === value) return section;
        changed = true;
        return { ...section, content: patchContentField(section.content, field, value) };
      });
      return changed ? { ...current, sections } : current;
    }, false);

    if (changed) {
      setSelectedId(sectionId);
      setSelectedField(field);
      setStatus('Texto actualizado desde la vista previa.');
    }
  }

  function handlePreviewTextAction(sectionId: string, field: string, action: PreviewTextAction, computedFontSize = 0, computedFontWeight = 0) {
    if (action === 'inspect') {
      setSelectedId(sectionId);
      setSelectedField(field);
      setStatus('Inspector avanzado de texto abierto.');
      return;
    }

    let changed = false;
    let description = 'Formato de texto actualizado.';
    commitDraft((current) => {
      const sections = current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        changed = true;

        if (action === 'increase-size' || action === 'decrease-size') {
          const typography = getElementTypography(section.style, field, device);
          const explicit = Number(typography.fontSize || 0);
          const base = explicit > 0 ? explicit : computedFontSize > 0 ? computedFontSize : 16;
          const delta = action === 'increase-size' ? 2 : -2;
          const next = Math.max(8, Math.min(180, Math.round(base + delta)));
          description = `Tamaño de texto: ${next}px en ${DEVICE_LABELS[device]}.`;
          return { ...section, style: patchElementTypography(section.style, field, device, 'fontSize', next) };
        }

        if (action === 'toggle-bold') {
          const element = getElementStyle(section.style, field);
          const explicit = Number(element.fontWeight || 0);
          const base = explicit > 0 ? explicit : computedFontWeight > 0 ? computedFontWeight : 400;
          const next = base >= 600 ? 400 : 700;
          description = next >= 600 ? 'Negrita aplicada.' : 'Negrita desactivada.';
          return { ...section, style: patchElementStyle(section.style, field, 'fontWeight', next) };
        }

        const alignMap: Partial<Record<PreviewTextAction, VisualTextAlign>> = {
          'align-left': 'left',
          'align-center': 'center',
          'align-right': 'right',
        };
        const align = alignMap[action];
        if (!align) {
          changed = false;
          return section;
        }
        description = align === 'left' ? 'Texto alineado a la izquierda.' : align === 'center' ? 'Texto centrado.' : 'Texto alineado a la derecha.';
        return { ...section, style: patchElementStyle(section.style, field, 'textAlign', align) };
      });
      return changed ? { ...current, sections } : current;
    }, false);

    if (changed) {
      setSelectedId(sectionId);
      setSelectedField(field);
      setStatus(description);
    }
  }

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; sectionId?: string; field?: string | null; container?: string; action?: string; value?: string; computedFontSize?: number; computedFontWeight?: number } | null;
      if (data?.type === 'cms:home-preview-ready') {
        setIframeReady(true);
        postDraft(draft);
        if (selectedId) postSelected(selectedId, selectedField);
      }
      if (data?.type === 'cms:home-select' && typeof data.sectionId === 'string') {
        setSelectedId(data.sectionId);
        setSelectedField(typeof data.field === 'string' ? data.field : null);
      }
      if (data?.type === 'cms:home-card-action' && typeof data.sectionId === 'string' && typeof data.container === 'string' && typeof data.action === 'string') {
        handlePreviewCardAction(data.sectionId, data.container, data.action as PreviewCardAction);
      }
      if (data?.type === 'cms:home-field-change' && typeof data.sectionId === 'string' && typeof data.field === 'string' && typeof data.value === 'string') {
        handlePreviewFieldChange(data.sectionId, data.field, data.value);
      }
      if (data?.type === 'cms:home-text-action' && typeof data.sectionId === 'string' && typeof data.field === 'string' && typeof data.action === 'string') {
        handlePreviewTextAction(data.sectionId, data.field, data.action as PreviewTextAction, Number(data.computedFontSize || 0), Number(data.computedFontWeight || 0));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [draft, postDraft, postSelected, selectedId, selectedField, device]);

  useEffect(() => {
    if (!draft.sections.some((section) => section.id === selectedId)) {
      setSelectedId(draft.sections[0]?.id || 'home-hero');
      setSelectedField(null);
    }
  }, [draft.sections, selectedId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [historyPast, historyFuture]);

  const ordered = useMemo(() => [...draft.sections].sort((a, b) => a.order - b.order), [draft.sections]);
  const selected = ordered.find((section) => section.id === selectedId) || ordered[0];
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);
  const selectedIndex = selected ? ordered.findIndex((section) => section.id === selected.id) : -1;

  function selectSection(id: string) {
    setSelectedId(id);
    setSelectedField(null);
  }

  function patchSection(id: string, updater: (section: HomeVisualSection) => HomeVisualSection) {
    commitDraft((current) => ({ ...current, sections: current.sections.map((section) => section.id === id ? updater(section) : section) }));
  }

  function reorder(id: string, direction: -1 | 1) {
    commitDraft((current) => {
      const list = [...current.sections].sort((a, b) => a.order - b.order);
      const index = list.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return current;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...current, sections: list.map((section, i) => ({ ...section, order: (i + 1) * 10 })) };
    }, false);
  }

  function moveSection(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;
    commitDraft((current) => {
      const list = [...current.sections].sort((a, b) => a.order - b.order);
      const sourceIndex = list.findIndex((section) => section.id === sourceId);
      if (sourceIndex < 0) return current;
      const [moved] = list.splice(sourceIndex, 1);
      const targetIndex = list.findIndex((section) => section.id === targetId);
      if (targetIndex < 0) return current;
      list.splice(targetIndex, 0, moved);
      return { ...current, sections: list.map((section, index) => ({ ...section, order: (index + 1) * 10 })) };
    }, false);
    selectSection(sourceId);
  }

  function duplicate(section: HomeVisualSection) {
    const copy: HomeVisualSection = {
      ...section,
      id: `${section.type}-${Date.now().toString(36)}`,
      label: `${section.label} copia`,
      order: section.order + 5,
      style: JSON.parse(JSON.stringify(section.style)) as HomeVisualSectionStyle,
      content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
    };
    commitDraft((current) => ({ ...current, sections: [...current.sections, copy] }), false);
    selectSection(copy.id);
  }

  function handlePreviewSectionAction(action: PreviewSectionAction) {
    if (!selected) return;
    if (action === 'move-up') {
      if (selectedIndex <= 0) return;
      reorder(selected.id, -1);
      setStatus('Bloque movido una posición hacia arriba.');
      return;
    }
    if (action === 'move-down') {
      if (selectedIndex < 0 || selectedIndex >= ordered.length - 1) return;
      reorder(selected.id, 1);
      setStatus('Bloque movido una posición hacia abajo.');
      return;
    }
    if (action === 'duplicate') {
      duplicate(selected);
      setStatus('Bloque duplicado con contenido y estilos.');
      return;
    }
    if (action === 'toggle-enabled') {
      const nextEnabled = !selected.enabled;
      patchSection(selected.id, (section) => ({ ...section, enabled: nextEnabled }));
      setStatus(nextEnabled ? 'Bloque visible nuevamente.' : 'Bloque oculto del sitio. Sigue disponible aquí para volver a mostrarlo.');
      return;
    }
    setSelectedField(null);
    setStatus('Inspector de diseño del bloque abierto.');
  }

  async function publish() {
    setPublishing(true);
    setStatus('Publicando en Insforge…');
    try {
      const normalized = normalizeHomePage(draftRef.current);
      const res = await fetch('/api/admin/site-structure/home-page', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: normalized }),
      });
      const json = await res.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const saved = normalizeHomePage(json.content ?? normalized);
      setPublished(saved);
      replaceDraft(saved, true);
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      setStatus('Publicado. La página principal ya usa esta versión desde Insforge.');
    } catch (error) {
      setStatus(error instanceof Error ? `Error al publicar: ${error.message}` : 'Error al publicar.');
    } finally {
      setPublishing(false);
    }
  }

  function restorePublished() {
    commitDraft(() => published, false);
    setSelectedId(published.sections[0]?.id || 'home-hero');
    setSelectedField(null);
    setStatus('Borrador restaurado a la versión publicada. Puedes deshacer esta acción.');
  }

  if (loading) {
    return <div className="grid min-h-[70vh] place-items-center bg-[#08090A] text-white"><div className="flex items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Preparando Fabrick Visual CMS…</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#08090A] text-white">
      <header className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center gap-3 border-b border-white/8 bg-[#08090A]/95 px-3 py-2 backdrop-blur-xl sm:px-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Fabrick Visual CMS</p>
          <h1 className="truncate text-sm font-black sm:text-base">Página principal</h1>
        </div>
        {selectedField ? <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/8 px-3 py-1 text-[9px] font-black text-sky-200"><Type className="h-3 w-3" /> {pretty(selectedField)}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border border-white/10 bg-black/30 p-1">
            <button type="button" onClick={undo} disabled={!historyPast.length || publishing} title="Deshacer · Ctrl/Cmd + Z" className="grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/5 disabled:opacity-20"><Undo2 className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={redo} disabled={!historyFuture.length || publishing} title="Rehacer · Ctrl/Cmd + Shift + Z / Ctrl + Y" className="grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/5 disabled:opacity-20"><Redo2 className="h-3.5 w-3.5" /></button>
          </div>
          <span className={`hidden rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] sm:inline-flex ${dirty ? 'bg-[#FFB000]/12 text-[#FFB000]' : 'bg-emerald-500/10 text-emerald-300'}`}>{dirty ? 'Cambios sin publicar' : 'Publicado'}</span>
          <button type="button" onClick={restorePublished} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] font-black text-white/55 disabled:opacity-25"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Restaurar</span></button>
          <button type="button" onClick={publish} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FFB000] px-4 text-[10px] font-black text-black disabled:opacity-35">{publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Publicar</button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[270px_minmax(0,1fr)_380px]">
        <aside className="border-b border-white/8 bg-[#0B0C0E] p-3 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Estructura</span><span className="text-[9px] text-white/25">{ordered.filter((section) => section.enabled).length}/{ordered.length}</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {ordered.map((section, index) => (
              <button key={section.id} type="button" draggable onDragStart={() => setDraggedId(section.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedId) moveSection(draggedId, section.id); setDraggedId(null); }} onClick={() => selectSection(section.id)} className={`min-w-[185px] rounded-xl border p-3 text-left transition lg:min-w-0 ${draggedId === section.id ? 'opacity-45' : ''} ${section.id === selected?.id ? 'border-[#FFB000]/55 bg-[#FFB000]/8' : 'border-white/8 bg-black/25 hover:border-white/20'}`}>
                <div className="flex items-center gap-2"><GripVertical className="h-3.5 w-3.5 shrink-0 text-white/20" /><span className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-[9px] font-black text-white/30">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 truncate text-xs font-black">{section.label}</span>{section.enabled ? <Eye className="h-3.5 w-3.5 text-emerald-300/70" /> : <EyeOff className="h-3.5 w-3.5 text-white/25" />}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 hidden rounded-xl border border-white/8 bg-black/30 p-3 text-[10px] leading-5 text-white/32 lg:block">Arrastra bloques para reordenar. Toca un elemento dentro de la vista previa para mostrar herramientas rápidas. Haz doble clic sobre un texto editable para cambiar su contenido directamente.</div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col bg-[#121315] p-2 sm:p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">Vista real</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-white/35">Editando {DEVICE_LABELS[device]}</span>
            <div className="ml-auto flex rounded-full border border-white/8 bg-black/30 p-1">
              {(['mobile', 'tablet', 'desktop'] as VisualDevice[]).map((item) => { const Icon = item === 'mobile' ? Smartphone : item === 'tablet' ? Tablet : Monitor; return <button key={item} type="button" onClick={() => setDevice(item)} className={`grid h-8 w-9 place-items-center rounded-full ${device === item ? 'bg-[#FFB000] text-black' : 'text-white/35'}`} aria-label={DEVICE_LABELS[item]}><Icon className="h-3.5 w-3.5" /></button>; })}
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-black/60 p-2 sm:p-3">
            {selected && !selectedField ? (
              <div className="sticky left-1/2 top-2 z-30 flex h-11 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 self-start overflow-x-auto rounded-2xl border border-[#FFB000]/20 bg-[#08090A]/95 p-1.5 shadow-[0_18px_70px_rgba(0,0,0,.5)] backdrop-blur-xl">
                <span className="max-w-[130px] shrink-0 truncate px-2 text-[9px] font-black uppercase tracking-[.12em] text-[#FFD879] sm:max-w-[210px]">{selected.label}</span>
                <span className="h-5 w-px shrink-0 bg-white/10" />
                <button type="button" title="Mover bloque arriba" aria-label="Mover bloque arriba" disabled={selectedIndex <= 0} onClick={() => handlePreviewSectionAction('move-up')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[.04] text-white/65 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button type="button" title="Mover bloque abajo" aria-label="Mover bloque abajo" disabled={selectedIndex < 0 || selectedIndex >= ordered.length - 1} onClick={() => handlePreviewSectionAction('move-down')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[.04] text-white/65 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                <button type="button" title="Duplicar bloque" aria-label="Duplicar bloque" onClick={() => handlePreviewSectionAction('duplicate')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[.04] text-white/65"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" title={selected.enabled ? 'Ocultar bloque' : 'Mostrar bloque'} aria-label={selected.enabled ? 'Ocultar bloque' : 'Mostrar bloque'} onClick={() => handlePreviewSectionAction('toggle-enabled')} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${selected.enabled ? 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200' : 'border-white/8 bg-white/[.04] text-white/40'}`}>{selected.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                <button type="button" title="Inspector de diseño" aria-label="Inspector de diseño" onClick={() => handlePreviewSectionAction('inspect')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#FFB000]/20 bg-[#FFB000]/10 text-[#FFD879]"><SlidersHorizontal className="h-3.5 w-3.5" /></button>
              </div>
            ) : null}
            <iframe ref={iframeRef} src="/?cms=preview" title="Vista previa de Inicio" onLoad={() => setIframeReady(false)} className="min-h-[780px] max-w-full bg-white shadow-[0_20px_70px_rgba(0,0,0,.4)] transition-[width] duration-300" style={{ width: WIDTHS[device], border: 0 }} />
          </div>
        </section>

        <aside id="home-visual-inspector-panel" className="scroll-mt-20 border-t border-white/8 bg-[#0B0C0E] p-4 lg:border-l lg:border-t-0">
          {selected ? <HomeVisualInspector section={selected} device={device} selectedField={selectedField} setSelectedField={setSelectedField} patch={(updater) => patchSection(selected.id, updater)} reorder={(direction) => reorder(selected.id, direction)} duplicate={() => duplicate(selected)} /> : null}
          <p className="mt-5 border-t border-white/8 pt-4 text-[9px] leading-5 text-white/30">{status}</p>
        </aside>
      </div>
    </div>
  );
}

function pretty(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()).trim();
}
