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
  Smartphone,
  Tablet,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import InsforgeMediaPicker from '@/components/admin/editor/InsforgeMediaPicker';
import {
  DEFAULT_HOME_PAGE,
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualAnimation,
  type HomeVisualSection,
  type HomeVisualSectionStyle,
} from '@/lib/homeVisualCms';
import {
  clearDeviceLayout,
  clearElementStyle,
  clearElementTypography,
  getAdvancedStyle,
  getDeviceLayout,
  getElementStyle,
  getElementTypography,
  patchDeviceLayout,
  patchElementStyle,
  patchElementTypography,
  type AdvancedHomeVisualStyle,
  type VisualBackgroundFit,
  type VisualDevice,
  type VisualElementStyle,
  type VisualFontFamily,
  type VisualResponsiveLayout,
  type VisualResponsiveTypography,
  type VisualShadow,
  type VisualTextAlign,
  type VisualTextTransform,
} from '@/lib/homeVisualLayout';

const LOCAL_DRAFT_KEY = 'sf-home-visual-cms-draft-v1';
const HISTORY_LIMIT = 40;
const HISTORY_COALESCE_MS = 500;
const WIDTHS: Record<VisualDevice, string> = { mobile: '390px', tablet: '768px', desktop: '100%' };
const DEVICE_LABELS: Record<VisualDevice, string> = { mobile: 'Móvil', tablet: 'Tablet', desktop: 'PC' };
const ANIMATIONS: Array<{ value: HomeVisualAnimation; label: string }> = [
  { value: 'none', label: 'Sin animación' },
  { value: 'fade-up', label: 'Fade + subir' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Escala suave' },
  { value: 'slide-left', label: 'Desde izquierda' },
  { value: 'slide-right', label: 'Desde derecha' },
];
const SHADOWS: Array<{ value: VisualShadow; label: string }> = [
  { value: 'none', label: 'Sin sombra' },
  { value: 'soft', label: 'Suave' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Profunda' },
];
const FONTS: Array<{ value: VisualFontFamily; label: string }> = [
  { value: 'inherit', label: 'Heredar del diseño' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'serif', label: 'Serif editorial' },
  { value: 'mono', label: 'Monoespaciada' },
];
const inputCls = 'w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#FFB000]/55';
const labelCls = 'mb-1.5 block text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]/70';

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
    } catch (e) {
      replaceDraft(DEFAULT_HOME_PAGE, true);
      setPublished(DEFAULT_HOME_PAGE);
      setStatus(e instanceof Error ? `No se pudo cargar: ${e.message}` : 'No se pudo cargar.');
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

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; sectionId?: string; field?: string | null } | null;
      if (data?.type === 'cms:home-preview-ready') {
        setIframeReady(true);
        postDraft(draft);
        if (selectedId) postSelected(selectedId, selectedField);
      }
      if (data?.type === 'cms:home-select' && typeof data.sectionId === 'string') {
        setSelectedId(data.sectionId);
        setSelectedField(typeof data.field === 'string' ? data.field : null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [draft, postDraft, postSelected, selectedId, selectedField]);

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
    } catch (e) {
      setStatus(e instanceof Error ? `Error al publicar: ${e.message}` : 'Error al publicar.');
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

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[270px_minmax(0,1fr)_370px]">
        <aside className="border-b border-white/8 bg-[#0B0C0E] p-3 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Estructura</span><span className="text-[9px] text-white/25">{ordered.filter((section) => section.enabled).length}/{ordered.length}</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {ordered.map((section, index) => (
              <button key={section.id} type="button" draggable onDragStart={() => setDraggedId(section.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedId) moveSection(draggedId, section.id); setDraggedId(null); }} onClick={() => selectSection(section.id)} className={`min-w-[185px] rounded-xl border p-3 text-left transition lg:min-w-0 ${draggedId === section.id ? 'opacity-45' : ''} ${section.id === selected?.id ? 'border-[#FFB000]/55 bg-[#FFB000]/8' : 'border-white/8 bg-black/25 hover:border-white/20'}`}>
                <div className="flex items-center gap-2"><GripVertical className="h-3.5 w-3.5 shrink-0 text-white/20" /><span className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-[9px] font-black text-white/30">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 truncate text-xs font-black">{section.label}</span>{section.enabled ? <Eye className="h-3.5 w-3.5 text-emerald-300/70" /> : <EyeOff className="h-3.5 w-3.5 text-white/25" />}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 hidden rounded-xl border border-white/8 bg-black/30 p-3 text-[10px] leading-5 text-white/32 lg:block">Arrastra bloques para reordenar. Dentro de la vista previa, toca un título, párrafo o botón para editar ese elemento. El historial conserva hasta {HISTORY_LIMIT} pasos.</div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col bg-[#121315] p-2 sm:p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">Vista real</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-white/35">Editando {DEVICE_LABELS[device]}</span>
            <div className="ml-auto flex rounded-full border border-white/8 bg-black/30 p-1">
              {(['mobile', 'tablet', 'desktop'] as VisualDevice[]).map((item) => { const Icon = item === 'mobile' ? Smartphone : item === 'tablet' ? Tablet : Monitor; return <button key={item} type="button" onClick={() => setDevice(item)} className={`grid h-8 w-9 place-items-center rounded-full ${device === item ? 'bg-[#FFB000] text-black' : 'text-white/35'}`} aria-label={DEVICE_LABELS[item]}><Icon className="h-3.5 w-3.5" /></button>; })}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-black/60 p-2 sm:p-3">
            <iframe ref={iframeRef} src="/?cms=preview" title="Vista previa de Inicio" onLoad={() => setIframeReady(false)} className="min-h-[780px] max-w-full bg-white shadow-[0_20px_70px_rgba(0,0,0,.4)] transition-[width] duration-300" style={{ width: WIDTHS[device], border: 0 }} />
          </div>
        </section>

        <aside className="border-t border-white/8 bg-[#0B0C0E] p-4 lg:border-l lg:border-t-0">
          {selected ? <Inspector section={selected} device={device} selectedField={selectedField} setSelectedField={setSelectedField} patch={(updater) => patchSection(selected.id, updater)} reorder={(direction) => reorder(selected.id, direction)} duplicate={() => duplicate(selected)} /> : null}
          <p className="mt-5 border-t border-white/8 pt-4 text-[9px] leading-5 text-white/30">{status}</p>
        </aside>
      </div>
    </div>
  );
}

function Inspector({ section, device, selectedField, setSelectedField, patch, reorder, duplicate }: {
  section: HomeVisualSection;
  device: VisualDevice;
  selectedField: string | null;
  setSelectedField: (field: string | null) => void;
  patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void;
  reorder: (direction: -1 | 1) => void;
  duplicate: () => void;
}) {
  const advanced = getAdvancedStyle(section.style);
  const responsive = getDeviceLayout(section.style, device);
  const setStyle = <K extends keyof HomeVisualSectionStyle>(key: K, value: HomeVisualSectionStyle[K]) => patch((current) => ({ ...current, style: { ...current.style, [key]: value } }));
  const setAdvanced = <K extends keyof AdvancedHomeVisualStyle>(key: K, value: AdvancedHomeVisualStyle[K]) => patch((current) => ({ ...current, style: { ...getAdvancedStyle(current.style), [key]: value } as HomeVisualSectionStyle }));
  const setResponsive = <K extends keyof VisualResponsiveLayout>(key: K, value: VisualResponsiveLayout[K]) => patch((current) => ({ ...current, style: patchDeviceLayout(current.style, device, key, value) }));
  const resetResponsive = () => patch((current) => ({ ...current, style: clearDeviceLayout(current.style, device) }));
  const setContent = (key: string, value: unknown) => patch((current) => ({ ...current, content: { ...current.content, [key]: value } }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Bloque seleccionado</p>
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputCls} font-black`} value={section.label} onChange={(event) => patch((current) => ({ ...current, label: event.target.value }))} />
          <button type="button" onClick={() => patch((current) => ({ ...current, enabled: !current.enabled }))} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${section.enabled ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-white/25'}`}>{section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2"><button type="button" onClick={() => reorder(-1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => reorder(1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={duplicate} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45" title="Duplicar bloque"><Copy className="h-4 w-4" /></button></div>
      </div>

      {selectedField ? <ElementInspector section={section} field={selectedField} device={device} patch={patch} setContent={setContent} close={() => setSelectedField(null)} /> : (
        <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-5 text-sky-100/55">Toca un texto o botón dentro de la vista previa para abrir su inspector tipográfico. También puedes enfocar un campo desde “Contenido”.</div>
      )}

      <details open className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Contenido</summary>
        <div className="mt-4 space-y-4"><ContentFields content={section.content} selectedField={selectedField} onSelect={setSelectedField} onChange={setContent} /></div>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Diseño del bloque</summary>
        <div className="mt-4 space-y-4">
          <ColorField label="Fondo" value={section.style.background || '#08090A'} onChange={(value) => setStyle('background', value)} />
          <ColorField label="Texto" value={section.style.textColor || '#FFF9EE'} onChange={(value) => setStyle('textColor', value)} />
          <ColorField label="Acento" value={section.style.accent || '#FFB000'} onChange={(value) => setStyle('accent', value)} />
          {section.type !== 'calculator' ? (
            <div>
              <label className={labelCls}>Imagen de fondo · Insforge</label>
              <InsforgeMediaPicker value={section.style.backgroundImage || ''} onChange={(url) => setStyle('backgroundImage', url)} folder="home" />
              {section.style.backgroundImage ? (
                <div className="mt-3 space-y-3">
                  <div className="aspect-[16/7] overflow-hidden rounded-xl border border-white/10 bg-black/60" style={{ backgroundImage: `url(${section.style.backgroundImage})`, backgroundSize: advanced.backgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: `${Number(advanced.backgroundPositionX ?? 50)}% ${Number(advanced.backgroundPositionY ?? 50)}%`, backgroundRepeat: 'no-repeat' }} />
                  <div><label className={labelCls}>Ajuste de imagen</label><select className={inputCls} value={advanced.backgroundFit || 'cover'} onChange={(event) => setAdvanced('backgroundFit', event.target.value as VisualBackgroundFit)}><option value="cover">Cubrir el bloque</option><option value="contain">Mostrar imagen completa</option></select></div>
                  <RangeField label="Foco horizontal" value={Number(advanced.backgroundPositionX ?? 50)} min={0} max={100} suffix="%" onChange={(value) => setAdvanced('backgroundPositionX', value)} />
                  <RangeField label="Foco vertical" value={Number(advanced.backgroundPositionY ?? 50)} min={0} max={100} suffix="%" onChange={(value) => setAdvanced('backgroundPositionY', value)} />
                  <RangeField label="Oscurecer imagen" value={Number(section.style.overlay ?? 35)} min={0} max={90} suffix="%" onChange={(value) => setStyle('overlay', value)} />
                  <button type="button" onClick={() => { setAdvanced('backgroundPositionX', 50); setAdvanced('backgroundPositionY', 50); }} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[.12em] text-white/40"><RotateCcw className="h-3 w-3" /> Centrar foco</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3"><NumberField label="Borde px" value={Number(advanced.borderWidth ?? 0)} min={0} max={16} onChange={(value) => setAdvanced('borderWidth', value)} /><NumberField label="Radio px" value={Number(advanced.borderRadius ?? 0)} min={0} max={96} onChange={(value) => setAdvanced('borderRadius', value)} /></div>
          {Number(advanced.borderWidth ?? 0) > 0 ? <ColorField label="Color del borde" value={advanced.borderColor || '#FFFFFF'} onChange={(value) => setAdvanced('borderColor', value)} /> : null}
          <NumberField label="Ancho máximo · 0 = completo" value={Number(advanced.maxWidth ?? 0)} min={0} max={2400} step={10} onChange={(value) => setAdvanced('maxWidth', value)} />
          <div><label className={labelCls}>Sombra</label><select className={inputCls} value={advanced.shadow || 'none'} onChange={(event) => setAdvanced('shadow', event.target.value as VisualShadow)}>{SHADOWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Responsive del bloque · {DEVICE_LABELS[device]}</summary>
        <div className="mt-3 rounded-xl border border-[#FFB000]/10 bg-[#FFB000]/5 p-2.5 text-[9px] leading-4 text-[#FFD879]/60">Estos valores solo afectan {DEVICE_LABELS[device]}.</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><NumberField label="Espacio arriba" value={Number(responsive.paddingTop ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingTop', value)} /><NumberField label="Espacio abajo" value={Number(responsive.paddingBottom ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingBottom', value)} /><NumberField label="Espacio lateral" value={Number(responsive.paddingInline ?? 0)} min={0} max={180} onChange={(value) => setResponsive('paddingInline', value)} /><NumberField label="Altura mínima" value={Number(responsive.minHeight ?? 0)} min={0} max={1600} step={10} onChange={(value) => setResponsive('minHeight', value)} /><NumberField label="Margen arriba" value={Number(responsive.marginTop ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginTop', value)} /><NumberField label="Margen abajo" value={Number(responsive.marginBottom ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginBottom', value)} /></div>
        <button type="button" onClick={resetResponsive} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[.12em] text-white/40"><RotateCcw className="h-3 w-3" /> Limpiar ajustes</button>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3"><summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Animación</summary><div className="mt-4 space-y-3"><div><label className={labelCls}>Entrada</label><select className={inputCls} value={section.style.animation || 'none'} onChange={(event) => setStyle('animation', event.target.value as HomeVisualAnimation)}>{ANIMATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className={labelCls}>Duración · {Number(section.style.duration || .6).toFixed(1)} s</label><input type="range" min="0.1" max="2" step="0.1" value={Number(section.style.duration || .6)} onChange={(event) => setStyle('duration', Number(event.target.value))} className="w-full accent-[#FFB000]" /></div></div></details>

      {section.type === 'calculator' ? <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-5 text-sky-100/55">La lógica de precios, IVA y fórmulas permanece protegida. El CMS controla posición, espacio, colores y animación sin permitir que un cambio visual altere un cálculo comercial.</div> : null}
    </div>
  );
}

function ElementInspector({ section, field, device, patch, setContent, close }: { section: HomeVisualSection; field: string; device: VisualDevice; patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void; setContent: (key: string, value: unknown) => void; close: () => void }) {
  const element = getElementStyle(section.style, field);
  const typography = getElementTypography(section.style, field, device);
  const directContent = section.content[field];
  const setElement = <K extends keyof Omit<VisualElementStyle, 'responsive'>>(key: K, value: VisualElementStyle[K]) => patch((current) => ({ ...current, style: patchElementStyle(current.style, field, key, value) }));
  const setTypography = <K extends keyof VisualResponsiveTypography>(key: K, value: VisualResponsiveTypography[K]) => patch((current) => ({ ...current, style: patchElementTypography(current.style, field, device, key, value) }));
  const clearDevice = () => patch((current) => ({ ...current, style: clearElementTypography(current.style, field, device) }));
  const clearAll = () => patch((current) => ({ ...current, style: clearElementStyle(current.style, field) }));

  return (
    <div className="rounded-2xl border border-sky-400/25 bg-sky-400/[.06] p-3">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/10 text-sky-200"><Type className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.15em] text-sky-200/55">Elemento seleccionado</p><b className="block truncate text-sm text-sky-100">{pretty(field)}</b></div><button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/40"><X className="h-3.5 w-3.5" /></button></div>
      {typeof directContent === 'string' ? <div className="mt-4"><label className={labelCls}>Contenido</label><textarea className={`${inputCls} min-h-20 resize-y`} value={directContent} onChange={(event) => setContent(field, event.target.value)} /></div> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Fuente</label><select className={inputCls} value={element.fontFamily || 'inherit'} onChange={(event) => setElement('fontFamily', event.target.value as VisualFontFamily)}>{FONTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <NumberField label="Peso" value={Number(element.fontWeight ?? 0)} min={0} max={900} step={100} onChange={(value) => setElement('fontWeight', value)} />
      </div>
      <div className="mt-3"><ColorField label="Color propio" value={element.color || section.style.textColor || '#FFFFFF'} onChange={(value) => setElement('color', value)} /></div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Alineación</label><select className={inputCls} value={element.textAlign || 'inherit'} onChange={(event) => setElement('textAlign', event.target.value as VisualTextAlign)}><option value="inherit">Heredar</option><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></div>
        <div><label className={labelCls}>Transformación</label><select className={inputCls} value={element.textTransform || 'none'} onChange={(event) => setElement('textTransform', event.target.value as VisualTextTransform)}><option value="none">Normal</option><option value="uppercase">Mayúsculas</option><option value="lowercase">Minúsculas</option><option value="capitalize">Capitalizar</option></select></div>
      </div>
      <div className="mt-4 border-t border-sky-300/10 pt-4"><p className="mb-3 text-[9px] font-black uppercase tracking-[.14em] text-sky-200/50">Tipografía · {DEVICE_LABELS[device]}</p><div className="grid grid-cols-2 gap-3"><NumberField label="Tamaño px · 0 hereda" value={Number(typography.fontSize ?? 0)} min={0} max={180} onChange={(value) => setTypography('fontSize', value)} /><NumberField label="Line height · 0 hereda" value={Number(typography.lineHeight ?? 0)} min={0} max={3} step={0.05} onChange={(value) => setTypography('lineHeight', value)} /><NumberField label="Tracking px" value={Number(typography.letterSpacing ?? 0)} min={-8} max={20} step={0.1} onChange={(value) => setTypography('letterSpacing', value)} /><NumberField label="Ancho máx px · 0 hereda" value={Number(typography.maxWidth ?? 0)} min={0} max={1800} step={10} onChange={(value) => setTypography('maxWidth', value)} /></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={clearDevice} className="rounded-full border border-white/10 px-3 py-2 text-[9px] font-black text-white/40">Reset {DEVICE_LABELS[device]}</button><button type="button" onClick={clearAll} className="rounded-full border border-red-400/15 px-3 py-2 text-[9px] font-black text-red-200/45">Reset elemento</button></div>
    </div>
  );
}

function ContentFields({ content, selectedField, onSelect, onChange }: { content: Record<string, unknown>; selectedField: string | null; onSelect: (field: string) => void; onChange: (key: string, value: unknown) => void }) {
  return <>{Object.entries(content).map(([key, value]) => <ContentField key={key} fieldKey={key} value={value} selected={selectedField === key} onSelect={() => onSelect(key)} onChange={(next) => onChange(key, next)} />)}</>;
}

function ContentField({ fieldKey, value, selected, onSelect, onChange }: { fieldKey: string; value: unknown; selected: boolean; onSelect: () => void; onChange: (next: unknown) => void }) {
  const title = pretty(fieldKey);
  if (typeof value === 'string') {
    const long = value.length > 72 || /(description|paragraph|text|note|subtitle)/i.test(fieldKey);
    return <div className={selected ? 'rounded-xl ring-1 ring-sky-400/35 p-2 -m-2' : ''}><label className={labelCls}>{title}</label>{long ? <textarea onFocus={onSelect} className={`${inputCls} min-h-24 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} /> : <input onFocus={onSelect} className={inputCls} value={value} onChange={(event) => onChange(event.target.value)} />}</div>;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) {
      const list = value as string[];
      return <div><label className={labelCls}>{title}</label><div className="space-y-2">{list.map((item, index) => <div key={index} className="flex gap-2"><input className={inputCls} value={item} onChange={(event) => onChange(list.map((current, i) => i === index ? event.target.value : current))} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="w-9 shrink-0 rounded-lg border border-red-500/20 text-red-300/60">×</button></div>)}<button type="button" onClick={() => onChange([...list, 'Nuevo texto'])} className="text-[10px] font-black text-[#FFB000]">+ Añadir texto</button></div></div>;
    }
    if (value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      const list = value as Array<Record<string, unknown>>;
      return <div><label className={labelCls}>{title}</label><div className="space-y-2">{list.map((item, index) => <div key={index} className="rounded-xl border border-white/8 bg-black/25 p-2.5"><input className={inputCls} value={typeof item.title === 'string' ? item.title : ''} placeholder="Título" onChange={(event) => onChange(list.map((current, i) => i === index ? { ...current, title: event.target.value } : current))} /><textarea className={`${inputCls} mt-2 min-h-20 resize-y`} value={typeof item.text === 'string' ? item.text : ''} placeholder="Texto" onChange={(event) => onChange(list.map((current, i) => i === index ? { ...current, text: event.target.value } : current))} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="mt-2 text-[9px] font-black uppercase text-red-300/55">Eliminar</button></div>)}<button type="button" onClick={() => onChange([...list, { title: 'Nuevo', text: 'Describe este elemento.' }])} className="text-[10px] font-black text-[#FFB000]">+ Añadir elemento</button></div></div>;
    }
  }
  return null;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return <div><label className={labelCls}>{label}</label><div className="flex gap-2"><input type="color" value={safe} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-black p-1" /><input className={inputCls} value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <div><label className={labelCls}>{label}</label><input type="number" className={inputCls} min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} /></div>;
}

function RangeField({ label, value, min, max, suffix = '', onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  const safe = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  return <div><div className="mb-1.5 flex items-center justify-between"><label className="text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]/70">{label}</label><span className="text-[9px] font-bold text-white/35">{Math.round(safe)}{suffix}</span></div><input type="range" min={min} max={max} step="1" value={safe} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#FFB000]" /></div>;
}

function pretty(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()).trim();
}
