'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
} from 'lucide-react';
import InsforgeMediaPicker from '@/components/admin/editor/InsforgeMediaPicker';
import {
  DEFAULT_HOME_PAGE,
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualAnimation,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

const LOCAL_DRAFT_KEY = 'sf-home-visual-cms-draft-v1';
type Device = 'mobile' | 'tablet' | 'desktop';
const WIDTHS: Record<Device, string> = { mobile: '390px', tablet: '768px', desktop: '100%' };
const ANIMATIONS: Array<{ value: HomeVisualAnimation; label: string }> = [
  { value: 'none', label: 'Sin animación' },
  { value: 'fade-up', label: 'Fade + subir' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Escala suave' },
  { value: 'slide-left', label: 'Desde izquierda' },
  { value: 'slide-right', label: 'Desde derecha' },
];

const inputCls = 'w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#FFB000]/55';
const labelCls = 'mb-1.5 block text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]/70';

export default function HomeVisualEditorClient() {
  const [draft, setDraft] = useState<HomePageContent>(DEFAULT_HOME_PAGE);
  const [published, setPublished] = useState<HomePageContent>(DEFAULT_HOME_PAGE);
  const [selectedId, setSelectedId] = useState(DEFAULT_HOME_PAGE.sections[0].id);
  const [device, setDevice] = useState<Device>('desktop');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('Cargando configuración…');
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
          setDraft(local);
          setSelectedId(local.sections[0]?.id || live.sections[0]?.id || 'home-hero');
          setStatus('Borrador local recuperado. La web pública no ha cambiado.');
        } catch {
          setDraft(live);
          setStatus('Configuración publicada cargada.');
        }
      } else {
        setDraft(live);
        setStatus('Configuración publicada cargada.');
      }
    } catch (e) {
      setDraft(DEFAULT_HOME_PAGE);
      setPublished(DEFAULT_HOME_PAGE);
      setStatus(e instanceof Error ? `No se pudo cargar: ${e.message}` : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPublished(); }, [loadPublished]);

  useEffect(() => {
    if (loading) return;
    window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, loading]);

  const postDraft = useCallback((next: HomePageContent) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'cms:home-preview', content: next }, window.location.origin);
  }, []);

  useEffect(() => {
    if (iframeReady) postDraft(draft);
  }, [draft, iframeReady, postDraft]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === 'cms:home-preview-ready') {
        setIframeReady(true);
        postDraft(draft);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [draft, postDraft]);

  const ordered = useMemo(() => [...draft.sections].sort((a, b) => a.order - b.order), [draft.sections]);
  const selected = ordered.find((section) => section.id === selectedId) || ordered[0];
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);

  function patchSection(id: string, updater: (section: HomeVisualSection) => HomeVisualSection) {
    setDraft((current) => ({ ...current, sections: current.sections.map((section) => section.id === id ? updater(section) : section) }));
  }

  function reorder(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const list = [...current.sections].sort((a, b) => a.order - b.order);
      const index = list.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return current;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...current, sections: list.map((section, i) => ({ ...section, order: (i + 1) * 10 })) };
    });
  }

  function duplicate(section: HomeVisualSection) {
    const copy: HomeVisualSection = {
      ...section,
      id: `${section.type}-${Date.now().toString(36)}`,
      label: `${section.label} copia`,
      order: section.order + 5,
      style: { ...section.style },
      content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
    };
    setDraft((current) => ({ ...current, sections: [...current.sections, copy] }));
    setSelectedId(copy.id);
  }

  async function publish() {
    setPublishing(true);
    setStatus('Publicando en Insforge…');
    try {
      const normalized = normalizeHomePage(draft);
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
      setDraft(saved);
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      setStatus('Publicado. Los visitantes ya reciben esta versión desde Insforge.');
    } catch (e) {
      setStatus(e instanceof Error ? `Error al publicar: ${e.message}` : 'Error al publicar.');
    } finally {
      setPublishing(false);
    }
  }

  function restorePublished() {
    setDraft(published);
    setSelectedId(published.sections[0]?.id || 'home-hero');
    window.localStorage.removeItem(LOCAL_DRAFT_KEY);
    setStatus('Borrador descartado. Volviste a la versión publicada.');
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
        <div className="ml-auto flex items-center gap-2">
          <span className={`hidden rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] sm:inline-flex ${dirty ? 'bg-[#FFB000]/12 text-[#FFB000]' : 'bg-emerald-500/10 text-emerald-300'}`}>{dirty ? 'Cambios sin publicar' : 'Publicado'}</span>
          <button type="button" onClick={restorePublished} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] font-black text-white/55 disabled:opacity-25"><RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Restaurar</span></button>
          <button type="button" onClick={publish} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FFB000] px-4 text-[10px] font-black text-black disabled:opacity-35">{publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Publicar</button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[260px_minmax(0,1fr)_330px]">
        <aside className="border-b border-white/8 bg-[#0B0C0E] p-3 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Estructura</span>
            <span className="text-[9px] text-white/25">{ordered.filter((s) => s.enabled).length}/{ordered.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {ordered.map((section, index) => (
              <button key={section.id} type="button" onClick={() => setSelectedId(section.id)} className={`min-w-[180px] rounded-xl border p-3 text-left transition lg:min-w-0 ${section.id === selected?.id ? 'border-[#FFB000]/55 bg-[#FFB000]/8' : 'border-white/8 bg-black/25 hover:border-white/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-[9px] font-black text-white/30">{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-black">{section.label}</span>
                  {section.enabled ? <Eye className="h-3.5 w-3.5 text-emerald-300/70" /> : <EyeOff className="h-3.5 w-3.5 text-white/25" />}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 hidden rounded-xl border border-white/8 bg-black/30 p-3 text-[10px] leading-5 text-white/32 lg:block">
            Selecciona un bloque. Los cambios aparecen en la vista previa antes de publicarlos.
          </div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col bg-[#121315] p-2 sm:p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">Vista real</span>
            <div className="ml-auto flex rounded-full border border-white/8 bg-black/30 p-1">
              {(['mobile', 'tablet', 'desktop'] as Device[]).map((item) => {
                const Icon = item === 'mobile' ? Smartphone : item === 'tablet' ? Tablet : Monitor;
                return <button key={item} type="button" onClick={() => setDevice(item)} className={`grid h-8 w-9 place-items-center rounded-full ${device === item ? 'bg-[#FFB000] text-black' : 'text-white/35'}`} aria-label={item}><Icon className="h-3.5 w-3.5" /></button>;
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-black/60 p-2 sm:p-3">
            <iframe
              ref={iframeRef}
              src="/?cms=preview"
              title="Vista previa de Inicio"
              onLoad={() => setIframeReady(false)}
              className="min-h-[780px] max-w-full bg-white shadow-[0_20px_70px_rgba(0,0,0,.4)]"
              style={{ width: WIDTHS[device], border: 0 }}
            />
          </div>
        </section>

        <aside className="border-t border-white/8 bg-[#0B0C0E] p-4 lg:border-l lg:border-t-0">
          {selected ? <Inspector section={selected} patch={(updater) => patchSection(selected.id, updater)} reorder={(dir) => reorder(selected.id, dir)} duplicate={() => duplicate(selected)} /> : null}
          <p className="mt-5 border-t border-white/8 pt-4 text-[9px] leading-5 text-white/30">{status}</p>
        </aside>
      </div>
    </div>
  );
}

function Inspector({
  section,
  patch,
  reorder,
  duplicate,
}: {
  section: HomeVisualSection;
  patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void;
  reorder: (dir: -1 | 1) => void;
  duplicate: () => void;
}) {
  const setStyle = (key: string, value: string | number) => patch((current) => ({ ...current, style: { ...current.style, [key]: value } }));
  const setContent = (key: string, value: unknown) => patch((current) => ({ ...current, content: { ...current.content, [key]: value } }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Bloque seleccionado</p>
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputCls} font-black`} value={section.label} onChange={(e) => patch((current) => ({ ...current, label: e.target.value }))} />
          <button type="button" onClick={() => patch((current) => ({ ...current, enabled: !current.enabled }))} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${section.enabled ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-white/25'}`}>{section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => reorder(-1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => reorder(1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={duplicate} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45" title="Duplicar bloque"><Copy className="h-4 w-4" /></button>
        </div>
      </div>

      <details open className="group rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Contenido</summary>
        <div className="mt-4 space-y-4"><ContentFields content={section.content} onChange={setContent} /></div>
      </details>

      <details open className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Diseño</summary>
        <div className="mt-4 space-y-4">
          <ColorField label="Fondo" value={section.style.background || '#08090A'} onChange={(value) => setStyle('background', value)} />
          <ColorField label="Texto" value={section.style.textColor || '#FFF9EE'} onChange={(value) => setStyle('textColor', value)} />
          <ColorField label="Acento" value={section.style.accent || '#FFB000'} onChange={(value) => setStyle('accent', value)} />
          {section.type === 'hero' ? (
            <div>
              <label className={labelCls}>Imagen de fondo · Insforge</label>
              <InsforgeMediaPicker value={section.style.backgroundImage || ''} onChange={(url) => setStyle('backgroundImage', url)} folder="home" />
              <label className={`${labelCls} mt-3`}>Oscurecer imagen · {Math.round(Number(section.style.overlay ?? 58))}%</label>
              <input type="range" min="0" max="90" step="1" value={Number(section.style.overlay ?? 58)} onChange={(e) => setStyle('overlay', Number(e.target.value))} className="w-full accent-[#FFB000]" />
            </div>
          ) : null}
        </div>
      </details>

      <details open className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Animación</summary>
        <div className="mt-4 space-y-3">
          <div><label className={labelCls}>Entrada</label><select className={inputCls} value={section.style.animation || 'none'} onChange={(e) => setStyle('animation', e.target.value)}>{ANIMATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div><label className={labelCls}>Duración · {Number(section.style.duration || .6).toFixed(1)} s</label><input type="range" min="0.1" max="2" step="0.1" value={Number(section.style.duration || .6)} onChange={(e) => setStyle('duration', Number(e.target.value))} className="w-full accent-[#FFB000]" /></div>
        </div>
      </details>

      {section.type === 'calculator' ? <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-5 text-sky-100/55">La lógica de precios, IVA y fórmulas permanece protegida. El CMS controla el bloque visual sin permitir que un cambio de diseño altere un cálculo comercial.</div> : null}
    </div>
  );
}

function ContentFields({ content, onChange }: { content: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  return <>{Object.entries(content).map(([key, value]) => <ContentField key={key} fieldKey={key} value={value} onChange={(next) => onChange(key, next)} />)}</>;
}

function ContentField({ fieldKey, value, onChange }: { fieldKey: string; value: unknown; onChange: (next: unknown) => void }) {
  const title = pretty(fieldKey);
  if (typeof value === 'string') {
    const long = value.length > 72 || /(description|paragraph|text|note|subtitle)/i.test(fieldKey);
    return <div><label className={labelCls}>{title}</label>{long ? <textarea className={`${inputCls} min-h-24 resize-y`} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />}</div>;
  }
  if (Array.isArray(value)) {
    const strings = value.every((item) => typeof item === 'string');
    if (strings) {
      const list = value as string[];
      return <div><label className={labelCls}>{title}</label><div className="space-y-2">{list.map((item, index) => <div key={index} className="flex gap-2"><input className={inputCls} value={item} onChange={(e) => onChange(list.map((current, i) => i === index ? e.target.value : current))} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="w-9 shrink-0 rounded-lg border border-red-500/20 text-red-300/60">×</button></div>)}<button type="button" onClick={() => onChange([...list, 'Nuevo texto'])} className="text-[10px] font-black text-[#FFB000]">+ Añadir texto</button></div></div>;
    }
    const objects = value.every((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (objects) {
      const list = value as Array<Record<string, unknown>>;
      return <div><label className={labelCls}>{title}</label><div className="space-y-2">{list.map((item, index) => <div key={index} className="rounded-xl border border-white/8 bg-black/25 p-2.5"><input className={inputCls} value={typeof item.title === 'string' ? item.title : ''} placeholder="Título" onChange={(e) => onChange(list.map((current, i) => i === index ? { ...current, title: e.target.value } : current))} /><textarea className={`${inputCls} mt-2 min-h-20 resize-y`} value={typeof item.text === 'string' ? item.text : ''} placeholder="Texto" onChange={(e) => onChange(list.map((current, i) => i === index ? { ...current, text: e.target.value } : current))} /><button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="mt-2 text-[9px] font-black uppercase text-red-300/55">Eliminar</button></div>)}<button type="button" onClick={() => onChange([...list, { title: 'Nuevo', text: 'Describe este elemento.' }])} className="text-[10px] font-black text-[#FFB000]">+ Añadir elemento</button></div></div>;
    }
  }
  return null;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return <div><label className={labelCls}>{label}</label><div className="flex gap-2"><input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-black p-1" /><input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} /></div></div>;
}

function pretty(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()).trim();
}
