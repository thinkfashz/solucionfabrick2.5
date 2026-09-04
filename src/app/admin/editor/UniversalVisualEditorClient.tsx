'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  Globe2,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  Link2,
  Loader2,
  Monitor,
  Paintbrush,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {
  DEFAULT_VISUAL_CMS_OVERRIDES,
  VISUAL_CMS_GLOBAL_ROUTE,
  normalizeVisualCmsOverrides,
  removeVisualElement,
  routeKey,
  upsertVisualElement,
  type VisualCmsDevice,
  type VisualCmsElementOverride,
  type VisualCmsOverridesContent,
  type VisualCmsStylePatch,
} from '@/lib/visualCmsOverrides';

const LOCAL_KEY = 'sf-visual-cms-universal-draft-v1';

const PAGE_PRESETS = [
  ['/', 'Inicio'],
  ['/tienda', 'Tienda'],
  ['/checkout', 'Checkout'],
  ['/tienda/catalogo', 'Catálogo'],
  ['/servicios', 'Servicios'],
  ['/presupuesto', 'Presupuesto'],
  ['/herramientas/aire-acondicionado', 'Aire acondicionado'],
  ['/herramientas/radier', 'Calculadora radier'],
  ['/proyectos', 'Proyectos'],
  ['/contacto', 'Contacto'],
  ['/evolucion', 'Evolución'],
  ['/nosotros', 'Nosotros'],
  ['/blog', 'Blog'],
] as const;

type Selection = {
  selector: string;
  similarSelector: string | null;
  similarCount: number;
  tag: string;
  label: string;
  text: string | null;
  textEditable: boolean;
  href: string | null;
  src: string | null;
  alt: string | null;
  isImage: boolean;
  isLink: boolean;
  isIcon: boolean;
  computed: VisualCmsStylePatch;
};

type StyleScope = 'all' | VisualCmsDevice;
type ElementScope = 'page' | 'global';
type TargetMode = 'single' | 'similar';
type MobilePanel = 'pages' | 'inspector' | null;
type InspectorTab = 'content' | 'appearance' | 'layout';
type NativeInspectorControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const widthFor: Record<VisualCmsDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

function Field({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="truncate text-[8px] font-black uppercase tracking-[.12em] text-white/38">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 min-w-0 rounded-lg border border-white/10 bg-black/30 px-2.5 text-[11px] text-white outline-none transition focus:border-[#FFB000]/60" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="truncate text-[8px] font-black uppercase tracking-[.12em] text-white/38">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-0 rounded-lg border border-white/10 bg-black/30 px-2.5 text-[11px] text-white outline-none transition focus:border-[#FFB000]/60">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <label className="grid min-w-0 gap-1">
      <span className="truncate text-[8px] font-black uppercase tracking-[.12em] text-white/38">{label}</span>
      <div className="flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-1.5">
        <input type="color" value={color} onChange={(event) => onChange(event.target.value)} className="h-6 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none" />
      </div>
    </label>
  );
}

function gradientParts(value: string): { first: string; second: string; angle: number } {
  const match = value.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(#[0-9a-f]{6})[^,]*,\s*(#[0-9a-f]{6})/i);
  return match
    ? { angle: Number(match[1]) || 135, first: match[2], second: match[3] }
    : { angle: 135, first: '#F5871F', second: '#08090A' };
}

function GradientField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parts = gradientParts(value);
  const update = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next };
    onChange(`linear-gradient(${merged.angle}deg, ${merged.first} 0%, ${merged.second} 100%)`);
  };
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
      <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/38">Degradado de dos colores</span><span className="h-7 w-16 rounded-lg border border-white/10" style={{ backgroundImage: `linear-gradient(${parts.angle}deg, ${parts.first}, ${parts.second})` }} /></div>
      <div className="grid grid-cols-2 gap-2"><ColorField label="Color inicial" value={parts.first} onChange={(first) => update({ first })} /><ColorField label="Color final" value={parts.second} onChange={(second) => update({ second })} /></div>
      <label className="grid gap-1"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/38">Dirección · {parts.angle}°</span><input type="range" min="0" max="360" step="1" value={parts.angle} onChange={(event) => update({ angle: Number(event.target.value) })} className="h-8 w-full accent-[#FFB000]" /></label>
      <button type="button" onClick={() => onChange('none')} className="h-8 rounded-lg border border-white/10 text-[8px] font-black text-white/45">Quitar degradado</button>
    </div>
  );
}

function extractBackgroundUrl(value: string): string {
  const clean = value.trim();
  if (!clean || clean === 'none') return '';
  const match = clean.match(/^url\(["']?(.*?)["']?\)$/i);
  return match?.[1] || clean;
}

function normalizeCaption(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export default function UniversalVisualEditorClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [published, setPublished] = useState<VisualCmsOverridesContent>(DEFAULT_VISUAL_CMS_OVERRIDES);
  const [draft, setDraft] = useState<VisualCmsOverridesContent>(DEFAULT_VISUAL_CMS_OVERRIDES);
  const [route, setRoute] = useState('/');
  const [routeInput, setRouteInput] = useState('/');
  const [device, setDevice] = useState<VisualCmsDevice>('desktop');
  const [styleScope, setStyleScope] = useState<StyleScope>('desktop');
  const [elementScope, setElementScope] = useState<ElementScope>('page');
  const [targetMode, setTargetMode] = useState<TargetMode>('single');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('content');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('Cargando Visual CMS…');
  const [iframeReady, setIframeReady] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);
  const currentRoute = routeKey(route);
  const targetRoute = elementScope === 'global' ? VISUAL_CMS_GLOBAL_ROUTE : currentRoute;
  const targetSelector = targetMode === 'similar' && selection?.similarSelector ? selection.similarSelector : selection?.selector || '';
  const targetPage = draft.pages[targetRoute];
  const override = targetSelector ? targetPage?.elements[targetSelector] : undefined;
  const activeStyle = override?.styles?.[styleScope] || {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/site-structure/visual-overrides', { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      const live = normalizeVisualCmsOverrides(body.content);
      setPublished(live);
      const local = window.localStorage.getItem(LOCAL_KEY);
      if (local) {
        try {
          setDraft(normalizeVisualCmsOverrides(JSON.parse(local)));
          setStatus('Borrador local recuperado.');
        } catch {
          window.localStorage.removeItem(LOCAL_KEY);
          setDraft(live);
          setStatus('Configuración publicada cargada.');
        }
      } else {
        setDraft(live);
        setStatus('Configuración publicada cargada.');
      }
    } catch (error) {
      setDraft(DEFAULT_VISUAL_CMS_OVERRIDES);
      setPublished(DEFAULT_VISUAL_CMS_OVERRIDES);
      setStatus(error instanceof Error ? `No se pudo cargar: ${error.message}` : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 640) {
      setDevice('mobile');
      setStyleScope('mobile');
    } else if (window.innerWidth < 1180) {
      setDevice('tablet');
      setStyleScope('tablet');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (dirty) window.localStorage.setItem(LOCAL_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(LOCAL_KEY);
  }, [draft, dirty, loading]);

  const sendPreview = useCallback((content: VisualCmsOverridesContent) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'cms:preview', section_key: 'visual-overrides', content }, window.location.origin);
  }, []);

  useEffect(() => { if (iframeReady) sendPreview(draft); }, [draft, iframeReady, sendPreview]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; route?: string; element?: Selection; action?: string; value?: string; selector?: string; x?: number; y?: number } | null;
      if (data?.type === 'cms:preview-ready' || data?.type === 'cms:visual-ready') {
        setIframeReady(true);
        sendPreview(draft);
        if (data.type === 'cms:visual-ready') setStatus('Vista lista. Toca cualquier elemento para editarlo.');
      }
      if (data?.type === 'cms:visual-select' && data.element) {
        const selected = data.element;
        setSelection(selected);
        setTargetMode('single');
        setInspectorTab('content');
        const hasPageOverride = Boolean(draft.pages[currentRoute]?.elements[selected.selector]);
        const hasGlobalOverride = Boolean(draft.pages[VISUAL_CMS_GLOBAL_ROUTE]?.elements[selected.selector]);
        setElementScope(hasPageOverride ? 'page' : hasGlobalOverride ? 'global' : 'page');
        setStatus(`Editando ${selected.tag}: ${selected.label || selected.selector}`);
        if (window.innerWidth < 1280) setMobilePanel('inspector');
      }
      if (data?.type === 'cms:visual-inline-action' && selection) {
        const value = typeof data.value === 'string' ? data.value : '';
        switch (data.action) {
          case 'text': updateSelected({ text: value }); break;
          case 'color': patchStyle('color', value); break;
          case 'background': patchStyle('backgroundColor', value); break;
          case 'font-size': patchStyle('fontSize', value); break;
          case 'font-weight': patchStyle('fontWeight', value); break;
          case 'text-align': patchStyle('textAlign', value); break;
          case 'border-radius': patchStyle('borderRadius', value); break;
          case 'image':
          case 'focus-text': setInspectorTab('content'); break;
          case 'advanced': setInspectorTab('appearance'); break;
          default: break;
        }
        if (window.innerWidth < 1280) setMobilePanel('inspector');
      }
      if (data?.type === 'cms:visual-image-position' && selection?.isImage && typeof data.x === 'number' && typeof data.y === 'number') {
        if (!data.selector || data.selector === selection.selector) {
          patchStyle('objectPosition', `${Math.round(data.x)}% ${Math.round(data.y)}%`);
          setStatus(`Imagen reposicionada: ${Math.round(data.x)}% · ${Math.round(data.y)}%`);
        }
      }
      if (data?.type === 'cms:visual-pinch' && typeof (data as { scale?: unknown }).scale === 'number' && selection) {
        const pinch = data as { selector?: string; scale: number };
        if (!pinch.selector || pinch.selector === selection.selector) {
          const scale = Math.min(3, Math.max(0.35, pinch.scale));
          const nextStyle = {
            ...(override?.styles?.[device] || {}),
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          };
          setStyleScope(device);
          updateSelected({ styles: { [device]: nextStyle } });
          setStatus(`Escala táctil: ${Math.round(scale * 100)}% · ${device}`);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentRoute, device, draft, override, selection, sendPreview]);

  function updateSelected(patch: Partial<VisualCmsElementOverride>) {
    if (!selection || !targetSelector) return;
    setDraft((current) => upsertVisualElement(current, targetRoute, targetSelector, { label: selection.label, ...patch }));
  }

  function patchStyle(field: keyof VisualCmsStylePatch, value: string) {
    if (!selection || !targetSelector) return;
    const nextStyle = { ...(override?.styles?.[styleScope] || {}), [field]: value };
    updateSelected({ styles: { [styleScope]: nextStyle } });
  }

  function patchBackgroundImage(value: string) {
    if (!selection || !targetSelector) return;
    const clean = value.trim();
    const backgroundImage = clean ? `url("${clean.replace(/"/g, '\\"')}")` : 'none';
    const nextStyle = {
      ...(override?.styles?.[styleScope] || {}),
      backgroundImage,
      ...(clean ? { backgroundRepeat: 'no-repeat' } : {}),
    };
    updateSelected({ styles: { [styleScope]: nextStyle } });
  }

  // The contextual quick editor lives in a sibling component and updates the
  // advanced inspector controls programmatically. React 19 can legitimately
  // ignore those synthetic value changes in some cases. Listen to the native
  // input/change events as a reliability bridge so the draft remains the one
  // source of truth even when the contextual toolbar initiated the edit.
  useEffect(() => {
    const handler = (event: Event) => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return;
      if (!control.closest('[data-visual-cms-editor-root="1"]')) return;
      const label = control.closest('label');
      const caption = normalizeCaption(label?.querySelector<HTMLElement>(':scope > span')?.textContent);
      if (!caption) return;
      const value = control.value;

      switch (caption) {
        case 'Texto': updateSelected({ text: value }); break;
        case 'Destino del enlace': updateSelected({ href: value }); break;
        case 'URL / Cloudinary': updateSelected({ src: value }); break;
        case 'Texto alternativo': updateSelected({ alt: value }); break;
        case 'Reemplazar por SVG / PNG': updateSelected({ iconUrl: value }); break;
        case 'Descripción accesible': updateSelected({ iconAlt: value }); break;
        case 'Texto / icono': patchStyle('color', value); break;
        case 'Fondo': patchStyle('backgroundColor', value); break;
        case 'Imagen de fondo': patchBackgroundImage(value); break;
        case 'Ajuste fondo': patchStyle('backgroundSize', value); break;
        case 'Posición': patchStyle('backgroundPosition', value); break;
        case 'Tipografía': patchStyle('fontFamily', value); break;
        case 'Tamaño': patchStyle('fontSize', value); break;
        case 'Peso': patchStyle('fontWeight', value); break;
        case 'Interlineado': patchStyle('lineHeight', value); break;
        case 'Tracking': patchStyle('letterSpacing', value); break;
        case 'Alineación': patchStyle('textAlign', value); break;
        case 'Radio': patchStyle('borderRadius', value); break;
        case 'Grosor borde': patchStyle('borderWidth', value); break;
        case 'Color borde': patchStyle('borderColor', value); break;
        case 'Sombra': patchStyle('boxShadow', value); break;
        case 'Ajuste': patchStyle('objectFit', value); break;
        case 'Encuadre': patchStyle('objectPosition', value); break;
        case 'Padding': patchStyle('padding', value); break;
        case 'Margen': patchStyle('margin', value); break;
        case 'Ancho': patchStyle('width', value); break;
        case 'Ancho máx.': patchStyle('maxWidth', value); break;
        case 'Altura': patchStyle('height', value); break;
        case 'Altura mín.': patchStyle('minHeight', value); break;
        case 'Gap': patchStyle('gap', value); break;
        case 'Opacidad': patchStyle('opacity', value); break;
        default: break;
      }
    };

    document.addEventListener('input', handler, true);
    document.addEventListener('change', handler, true);
    return () => {
      document.removeEventListener('input', handler, true);
      document.removeEventListener('change', handler, true);
    };
  }, [selection, targetSelector, targetRoute, styleScope, override]);

  function resetSelected() {
    if (!selection || !targetSelector) return;
    setDraft((current) => removeVisualElement(current, targetRoute, targetSelector));
    const targetLabel = targetMode === 'similar' ? `${selection.similarCount} elementos similares` : 'este elemento';
    setStatus(`Personalización de ${targetLabel} eliminada${elementScope === 'global' ? ' globalmente' : ' de esta página'}.`);
  }

  function navigate(nextRoute: string) {
    const clean = routeKey(nextRoute || '/');
    setRoute(clean);
    setRouteInput(clean);
    setSelection(null);
    setElementScope('page');
    setTargetMode('single');
    setIframeReady(false);
    setMobilePanel(null);
    setStatus(`Abriendo ${clean}…`);
  }

  function chooseDevice(next: VisualCmsDevice) {
    setDevice(next);
    setStyleScope(next);
  }

  async function publish() {
    setPublishing(true);
    setStatus('Publicando y verificando cambios visuales…');
    try {
      const normalized = normalizeVisualCmsOverrides(draft);
      const response = await fetch('/api/admin/site-structure/visual-overrides', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: normalized }),
      });
      const body = await response.json().catch(() => ({})) as { content?: unknown; error?: string; verified?: boolean };
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      if (body.verified !== true) throw new Error('El servidor no confirmó la persistencia del cambio.');

      const verifyResponse = await fetch(`/api/admin/site-structure/visual-overrides?verify=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const verifyBody = await verifyResponse.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!verifyResponse.ok) throw new Error(verifyBody.error || `Verificación HTTP ${verifyResponse.status}`);
      const saved = normalizeVisualCmsOverrides(verifyBody.content ?? body.content ?? normalized);

      setPublished(saved);
      setDraft(saved);
      sendPreview(saved);
      window.localStorage.removeItem(LOCAL_KEY);
      setStatus('Publicado y verificado. El cambio quedó guardado en el sitio.');
    } catch (error) {
      setStatus(error instanceof Error ? `Error al publicar: ${error.message}` : 'Error al publicar.');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className="grid h-[calc(100dvh-6rem)] min-h-[520px] place-items-center bg-[#08090A] text-white"><div className="flex items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Preparando Visual CMS universal…</div></div>;
  }

  const previewSrc = `${route}${route.includes('?') ? '&' : '?'}cms=preview&cmsVisual=1`;
  const computed = selection?.computed || {};
  const valueFor = (key: keyof VisualCmsStylePatch) => String(activeStyle[key] ?? computed[key] ?? '');
  const backgroundUrl = extractBackgroundUrl(valueFor('backgroundImage'));
  const editingSimilar = targetMode === 'similar' && Boolean(selection?.similarSelector);

  const pagesPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 pb-2">
        <div><p className="text-[8px] font-black uppercase tracking-[.18em] text-[#FFB000]">Navegación</p><h2 className="text-xs font-black">Páginas del frontend</h2></div>
        <span className="max-w-[120px] truncate rounded-full bg-white/5 px-2 py-1 text-[8px] font-bold text-white/35">{currentRoute}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 [scrollbar-width:thin]">
        <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-1">
          {PAGE_PRESETS.map(([href, label]) => (
            <button key={href} type="button" onClick={() => navigate(href)} className={`rounded-lg border px-2.5 py-2 text-left text-[10px] font-black transition ${route === href ? 'border-[#FFB000]/60 bg-[#FFB000]/10 text-[#FFB000]' : 'border-white/8 bg-black/25 text-white/55 hover:border-white/20'}`}>
              {label}<span className="mt-0.5 block truncate text-[8px] font-medium text-white/25">{href}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-1.5">
          <Field label="Abrir cualquier ruta" value={routeInput} onChange={setRouteInput} placeholder="/servicios/metalcon" />
          <button type="button" onClick={() => navigate(routeInput)} className="h-9 rounded-lg bg-white/8 text-[9px] font-black text-white/70">Abrir ruta</button>
        </div>
        <div className="mt-3 rounded-lg border border-[#FFB000]/15 bg-[#FFB000]/5 p-2.5 text-[9px] leading-4 text-white/42">Toca directamente cualquier elemento del preview. No se reemplaza la lógica de carrito, checkout, formularios ni navegación.</div>
      </div>
    </div>
  );

  const styleScopeControl = (
    <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/8 bg-black/25 p-1">
      {([['all', 'Todos'], ['desktop', 'PC'], ['tablet', 'Tablet'], ['mobile', 'Móvil']] as Array<[StyleScope, string]>).map(([key, label]) => (
        <button key={key} type="button" onClick={() => setStyleScope(key)} className={`h-8 rounded-md text-[8px] font-black ${styleScope === key ? 'bg-[#FFB000] text-black' : 'text-white/40'}`}>{label}</button>
      ))}
    </div>
  );

  const inspectorPanel = !selection ? (
    <div className="grid h-full min-h-[220px] place-items-center rounded-xl border border-dashed border-white/10 p-5 text-center">
      <div><Eye className="mx-auto h-6 w-6 text-[#FFB000]/50" /><h2 className="mt-2 text-xs font-black">Selecciona un elemento</h2><p className="mt-1.5 max-w-xs text-[10px] leading-4 text-white/35">Toca un texto, card, botón, imagen, icono, navbar, footer o sección dentro del preview.</p></div>
    </div>
  ) : (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 pb-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFB000] text-black"><Paintbrush className="h-3.5 w-3.5" /></span>
        <div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-[.12em] text-white/30">{selection.tag}{selection.isIcon ? ' · icono' : ''}</p><h2 className="truncate text-xs font-black">{selection.label}</h2></div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-1">
        {([['content', 'Contenido'], ['appearance', 'Apariencia'], ['layout', 'Medidas']] as Array<[InspectorTab, string]>).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setInspectorTab(key)} className={`h-8 rounded-md text-[8px] font-black ${inspectorTab === key ? 'bg-white/10 text-white' : 'text-white/35'}`}>{label}</button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 [scrollbar-width:thin]">
        {inspectorTab === 'content' ? (
          <div className="grid gap-2">
            {selection.similarSelector && selection.similarCount > 1 ? (
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/8 bg-black/25 p-1">
                <button type="button" onClick={() => setTargetMode('single')} className={`h-8 rounded-md text-[8px] font-black ${targetMode === 'single' ? 'bg-white/10 text-white' : 'text-white/35'}`}>Solo este</button>
                <button type="button" onClick={() => setTargetMode('similar')} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md text-[8px] font-black ${targetMode === 'similar' ? 'bg-[#FFB000] text-black' : 'text-white/35'}`}><Layers3 className="h-3 w-3" /> {selection.similarCount} similares</button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/8 bg-black/25 p-1">
              <button type="button" onClick={() => setElementScope('page')} className={`h-8 rounded-md text-[8px] font-black ${elementScope === 'page' ? 'bg-white/10 text-white' : 'text-white/35'}`}>Esta página</button>
              <button type="button" onClick={() => setElementScope('global')} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md text-[8px] font-black ${elementScope === 'global' ? 'bg-[#FFB000] text-black' : 'text-white/35'}`}><Globe2 className="h-3 w-3" /> Todo el sitio</button>
            </div>

            {!editingSimilar && selection.textEditable ? <label className="grid gap-1"><span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.12em] text-white/38"><Type className="h-3 w-3" /> Texto</span><textarea value={override?.text ?? selection.text ?? ''} onChange={(event) => updateSelected({ text: event.target.value })} rows={3} className="min-h-20 resize-y rounded-lg border border-white/10 bg-black/30 p-2.5 text-[11px] leading-4 text-white outline-none focus:border-[#FFB000]/60" /></label> : null}
            {!editingSimilar && selection.isLink ? <Field label="Destino del enlace" value={override?.href ?? selection.href ?? ''} onChange={(value) => updateSelected({ href: value })} placeholder="/contacto" /> : null}
            {!editingSimilar && selection.isImage ? <div className="grid gap-2 rounded-xl border border-[#FFB000]/15 bg-[#FFB000]/5 p-2.5"><div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.12em] text-[#FFB000]"><ImageIcon className="h-3.5 w-3.5" /> Imagen seleccionada</div><Field label="URL / Cloudinary" value={override?.src ?? selection.src ?? ''} onChange={(value) => updateSelected({ src: value })} /><div className="grid grid-cols-2 gap-1.5"><Field label="Texto alternativo" value={override?.alt ?? selection.alt ?? ''} onChange={(value) => updateSelected({ alt: value })} /><SelectField label="Ajuste" value={valueFor('objectFit') || 'cover'} onChange={(value) => patchStyle('objectFit', value)} options={[["cover","Cubrir"],["contain","Contener"],["fill","Estirar"],["none","Original"],["scale-down","Reducir"]]} /></div><Field label="Encuadre" value={valueFor('objectPosition') || '50% 50%'} onChange={(value) => patchStyle('objectPosition', value)} placeholder="50% 50%" /><div className="grid grid-cols-3 gap-1">{[["0% 0%","↖"],["50% 0%","↑"],["100% 0%","↗"],["0% 50%","←"],["50% 50%","•"],["100% 50%","→"],["0% 100%","↙"],["50% 100%","↓"],["100% 100%","↘"]].map(([position, label]) => <button key={position} type="button" onClick={() => patchStyle('objectPosition', position)} className={`h-8 rounded-lg border text-xs ${valueFor('objectPosition') === position ? 'border-[#FFB000] bg-[#FFB000] text-black' : 'border-white/10 bg-black/20 text-white/55'}`} aria-label={`Encuadre ${position}`}>{label}</button>)}</div><p className="text-[8px] leading-4 text-white/42">Arrastra la imagen con mouse o un dedo para mover el encuadre. Ábrela o ciérrala con dos dedos para cambiar su escala sin alterar el espacio del texto.</p></div> : null}
            {selection.isIcon ? <div className="grid gap-1.5 rounded-lg border border-[#FFB000]/12 bg-[#FFB000]/5 p-2"><div className="flex items-center gap-1 text-[8px] font-black uppercase text-[#FFB000]"><ImageIcon className="h-3 w-3" /> Icono</div><Field label="Reemplazar por SVG / PNG" value={override?.iconUrl ?? ''} onChange={(value) => updateSelected({ iconUrl: value })} placeholder="https://.../icono.svg" /><Field label="Descripción accesible" value={override?.iconAlt ?? ''} onChange={(value) => updateSelected({ iconAlt: value })} /></div> : null}

            <label className="flex items-center justify-between rounded-lg border border-white/8 bg-black/25 px-2.5 py-2"><span><b className="block text-[9px]">Ocultar {editingSimilar ? `${selection.similarCount} similares` : 'elemento'}</b><small className="text-[8px] text-white/30">No elimina lógica ni datos</small></span><input type="checkbox" checked={override?.hidden === true} onChange={(event) => updateSelected({ hidden: event.target.checked })} /></label>
            <button type="button" onClick={resetSelected} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/5 text-[9px] font-black text-red-200/70"><Trash2 className="h-3 w-3" /> Quitar personalización</button>
          </div>
        ) : null}

        {inspectorTab === 'appearance' ? (
          <div className="grid gap-2">
            {styleScopeControl}
            <div className="grid grid-cols-2 gap-1.5"><ColorField label="Texto / icono" value={valueFor('color')} onChange={(value) => patchStyle('color', value)} /><ColorField label="Fondo" value={valueFor('backgroundColor')} onChange={(value) => patchStyle('backgroundColor', value)} /></div>
            <Field label="Imagen de fondo" value={backgroundUrl} onChange={patchBackgroundImage} placeholder="https://.../fondo.webp" />
            <GradientField value={valueFor('backgroundImage')} onChange={(value) => patchStyle('backgroundImage', value)} />
            <div className="grid grid-cols-2 gap-1.5"><SelectField label="Ajuste fondo" value={valueFor('backgroundSize') || 'cover'} onChange={(value) => patchStyle('backgroundSize', value)} options={[["cover","Cubrir"],["contain","Contener"],["auto","Original"]]} /><Field label="Posición" value={valueFor('backgroundPosition')} onChange={(value) => patchStyle('backgroundPosition', value)} placeholder="center center" /></div>
            <Field label="Tipografía" value={valueFor('fontFamily')} onChange={(value) => patchStyle('fontFamily', value)} placeholder="Manrope, sans-serif" />
            <div className="grid grid-cols-2 gap-1.5"><Field label="Tamaño" value={valueFor('fontSize')} onChange={(value) => patchStyle('fontSize', value)} placeholder="16px" /><Field label="Peso" value={valueFor('fontWeight')} onChange={(value) => patchStyle('fontWeight', value)} placeholder="700" /></div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Interlineado" value={valueFor('lineHeight')} onChange={(value) => patchStyle('lineHeight', value)} placeholder="1.4" /><Field label="Tracking" value={valueFor('letterSpacing')} onChange={(value) => patchStyle('letterSpacing', value)} placeholder="0px" /></div>
            <SelectField label="Alineación" value={valueFor('textAlign') || 'left'} onChange={(value) => patchStyle('textAlign', value)} options={[["left","Izquierda"],["center","Centro"],["right","Derecha"],["justify","Justificado"]]} />
            <div className="grid grid-cols-2 gap-1.5"><Field label="Radio" value={valueFor('borderRadius')} onChange={(value) => patchStyle('borderRadius', value)} placeholder="20px" /><Field label="Grosor borde" value={valueFor('borderWidth')} onChange={(value) => patchStyle('borderWidth', value)} placeholder="1px" /></div>
            <ColorField label="Color borde" value={valueFor('borderColor')} onChange={(value) => patchStyle('borderColor', value)} />
            <Field label="Sombra" value={valueFor('boxShadow')} onChange={(value) => patchStyle('boxShadow', value)} placeholder="0 20px 60px rgba(0,0,0,.2)" />
          </div>
        ) : null}

        {inspectorTab === 'layout' ? (
          <div className="grid gap-2">
            {styleScopeControl}
            <div className="rounded-lg border border-[#FFB000]/12 bg-[#FFB000]/5 p-2 text-[8px] leading-4 text-white/38">Edita medidas por dispositivo. Seleccionar Móvil, Tablet o PC en el visor también cambia automáticamente esta capa.</div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Padding" value={valueFor('padding')} onChange={(value) => patchStyle('padding', value)} placeholder="24px" /><Field label="Margen" value={valueFor('margin')} onChange={(value) => patchStyle('margin', value)} placeholder="0 auto" /></div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Ancho" value={valueFor('width')} onChange={(value) => patchStyle('width', value)} placeholder="100%" /><Field label="Ancho máx." value={valueFor('maxWidth')} onChange={(value) => patchStyle('maxWidth', value)} placeholder="1280px" /></div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Altura" value={valueFor('height')} onChange={(value) => patchStyle('height', value)} placeholder="auto" /><Field label="Altura mín." value={valueFor('minHeight')} onChange={(value) => patchStyle('minHeight', value)} placeholder="240px" /></div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Gap" value={valueFor('gap')} onChange={(value) => patchStyle('gap', value)} placeholder="16px" /><Field label="Opacidad" value={valueFor('opacity')} onChange={(value) => patchStyle('opacity', value)} placeholder="1" /></div>
            <div className="grid grid-cols-2 gap-1.5"><Field label="Escala" value={valueFor('transform')} onChange={(value) => patchStyle('transform', value)} placeholder="scale(1)" /><Field label="Origen escala" value={valueFor('transformOrigin')} onChange={(value) => patchStyle('transformOrigin', value)} placeholder="center center" /></div>
            <p className="rounded-lg border border-white/8 bg-black/25 p-2 text-[8px] leading-4 text-white/38">En móvil también puedes seleccionar el elemento y abrir o cerrar dos dedos sobre él. La escala queda guardada en la capa del dispositivo activo.</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div data-visual-cms-editor-root="1" className="relative flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-[#08090A] text-white sm:rounded-xl xl:h-[calc(100dvh-6rem)] xl:min-h-[620px]">
      <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/8 bg-[#08090A]/96 px-2.5 py-1.5 backdrop-blur-xl sm:min-h-14 sm:px-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#FFB000]" /><p className="text-[8px] font-black uppercase tracking-[.15em] text-[#FFB000]">Visual CMS</p></div>
          <h1 className="truncate text-[11px] font-black sm:text-sm">Editor universal · <span className="text-white/45">{currentRoute}</span></h1>
        </div>
        <Link href="/admin/editor/home-structure" className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[9px] font-black text-white/55 lg:inline-flex"><LayoutGrid className="h-3.5 w-3.5" /> Estructura Home</Link>
        <button type="button" onClick={() => { setDraft(published); setStatus('Borrador restaurado a la versión publicada.'); }} disabled={!dirty || publishing} className="hidden h-10 shrink-0 items-center rounded-xl border border-white/10 px-3 text-[9px] font-black text-white/50 disabled:opacity-25 sm:inline-flex" title="Restaurar versión publicada"><RotateCcw className="h-3.5 w-3.5" /><span className="ml-1.5">Restaurar</span></button>
        <button type="button" onClick={publish} disabled={!dirty || publishing} className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#FFB000] px-4 text-[9px] font-black text-black shadow-[0_8px_30px_rgba(255,176,0,.18)] disabled:opacity-35 sm:inline-flex">{publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}<span>Publicar</span></button>
      </header>

      <div className="relative grid min-h-0 flex-1 xl:grid-cols-[228px_minmax(0,1fr)_340px] 2xl:grid-cols-[252px_minmax(0,1fr)_380px]">
        <aside className="hidden min-h-0 overflow-hidden border-r border-white/8 bg-[#0B0C0E] p-2.5 xl:block">{pagesPanel}</aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-[#111214]">
          <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-white/7 px-2 py-1.5">
            <button type="button" onClick={() => setMobilePanel('pages')} className="hidden h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-[8px] font-black text-white/60 sm:inline-flex xl:hidden"><LayoutGrid className="h-3.5 w-3.5" /> Páginas</button>
            <div className="flex rounded-lg border border-white/10 bg-black/25 p-0.5">
              {(['mobile', 'tablet', 'desktop'] as VisualCmsDevice[]).map((item) => {
                const Icon = item === 'mobile' ? Smartphone : item === 'tablet' ? Tablet : Monitor;
                return <button key={item} type="button" onClick={() => chooseDevice(item)} className={`grid h-8 w-9 place-items-center rounded-lg transition ${device === item ? 'bg-[#FFB000] text-black shadow-sm' : 'text-white/38 hover:text-white/70'}`} title={item}><Icon className="h-3.5 w-3.5" /></button>;
              })}
            </div>
            <span className="hidden max-w-[34vw] truncate text-[8px] font-bold text-white/30 sm:block">{status}</span>
            <span className={`ml-auto rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[.1em] ${dirty ? 'bg-[#FFB000]/12 text-[#FFB000]' : 'bg-emerald-500/10 text-emerald-300'}`}>{dirty ? 'Sin publicar' : 'Publicado'}</span>
            <button type="button" onClick={() => setMobilePanel('inspector')} className={`hidden h-9 items-center gap-1.5 rounded-xl border px-3 text-[8px] font-black sm:inline-flex xl:hidden ${selection ? 'border-[#FFB000]/35 bg-[#FFB000]/8 text-[#FFB000]' : 'border-white/10 text-white/45'}`}><SlidersHorizontal className="h-3.5 w-3.5" /> Inspector</button>
          </div>

          <div className="flex min-h-0 flex-1 justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,176,0,.08),transparent_34%),#050506] p-0 sm:p-2.5">
            <div className="h-full min-h-0 overflow-hidden bg-white shadow-2xl transition-[width] duration-300 sm:rounded-xl sm:ring-1 sm:ring-white/10" style={{ width: widthFor[device], maxWidth: '100%' }}>
              <iframe ref={iframeRef} key={`${route}-${device}`} src={previewSrc} title={`Visual CMS ${route}`} className="h-full min-h-0 w-full border-0 bg-white" onLoad={() => setIframeReady(true)} />
            </div>
          </div>

          <div className="hidden min-h-9 shrink-0 items-center gap-2 border-t border-white/7 px-2 text-[8px] text-white/28 sm:flex xl:hidden">
            <span className="truncate">{status}</span>
            {selection ? <button type="button" onClick={() => setMobilePanel('inspector')} className="ml-auto shrink-0 font-black text-[#FFB000]">Editar selección</button> : <span className="ml-auto shrink-0">Toca un elemento</span>}
          </div>
        </main>

        <aside className="hidden min-h-0 overflow-hidden border-l border-white/8 bg-[#0B0C0E] p-2.5 xl:block">{inspectorPanel}</aside>

        {mobilePanel ? (
          <div className="absolute inset-0 z-40 flex flex-col bg-black/65 backdrop-blur-sm xl:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setMobilePanel(null); }}>
            <div className="mt-auto flex max-h-[86%] min-h-[360px] flex-col rounded-t-[24px] border-t border-white/12 bg-[#0B0C0E] pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_80px_rgba(0,0,0,.65)] sm:max-h-[78%]">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/8 px-3">
                <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/55">{mobilePanel === 'pages' ? 'Páginas' : 'Inspector'}</span>
                <span className="truncate text-[8px] text-white/25">{mobilePanel === 'inspector' && selection ? selection.label : currentRoute}</span>
                <button type="button" onClick={() => setMobilePanel(null)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/55" aria-label="Cerrar panel"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3">{mobilePanel === 'pages' ? pagesPanel : inspectorPanel}</div>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="grid min-h-[62px] shrink-0 grid-cols-4 border-t border-white/10 bg-[#0B0C0E]/98 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden" aria-label="Herramientas del editor móvil">
        <button type="button" onClick={() => setMobilePanel('pages')} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-black text-white/55"><LayoutGrid className="h-4 w-4" />Páginas</button>
        <button type="button" onClick={() => setMobilePanel('inspector')} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-black ${selection ? 'text-[#FFB000]' : 'text-white/40'}`}><SlidersHorizontal className="h-4 w-4" />Editar</button>
        <button type="button" onClick={() => { setDraft(published); setStatus('Borrador restaurado a la versión publicada.'); }} disabled={!dirty || publishing} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-black text-white/45 disabled:opacity-25"><RotateCcw className="h-4 w-4" />Restaurar</button>
        <button type="button" onClick={publish} disabled={!dirty || publishing} className="m-1 flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl bg-[#FFB000] text-[8px] font-black text-black disabled:opacity-35">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Publicar</button>
      </nav>
    </div>
  );
}
