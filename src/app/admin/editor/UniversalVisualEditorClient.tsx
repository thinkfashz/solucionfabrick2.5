'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  Globe2,
  Image as ImageIcon,
  Link2,
  Loader2,
  Monitor,
  Paintbrush,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Type,
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
  ['/servicios', 'Servicios'],
  ['/presupuesto', 'Presupuesto'],
  ['/proyectos', 'Proyectos'],
  ['/contacto', 'Contacto'],
  ['/evolucion', 'Evolución'],
  ['/nosotros', 'Nosotros'],
  ['/blog', 'Blog'],
] as const;

type Selection = {
  selector: string;
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

const widthFor: Record<VisualCmsDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

function Field({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none transition focus:border-[#FFB000]/60" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none transition focus:border-[#FFB000]/60">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <label className="grid gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</span>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2">
        <input type="color" value={color} onChange={(event) => onChange(event.target.value)} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none" />
      </div>
    </label>
  );
}

function extractBackgroundUrl(value: string): string {
  const clean = value.trim();
  if (!clean || clean === 'none') return '';
  const match = clean.match(/^url\(["']?(.*?)["']?\)$/i);
  return match?.[1] || clean;
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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('Cargando Visual CMS…');
  const [iframeReady, setIframeReady] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);
  const currentRoute = routeKey(route);
  const targetRoute = elementScope === 'global' ? VISUAL_CMS_GLOBAL_ROUTE : currentRoute;
  const targetPage = draft.pages[targetRoute];
  const override = selection ? targetPage?.elements[selection.selector] : undefined;
  const activeStyle = selection ? override?.styles?.[styleScope] || {} : {};

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
      const data = event.data as { type?: string; route?: string; element?: Selection } | null;
      if (data?.type === 'cms:visual-ready') {
        setIframeReady(true);
        sendPreview(draft);
        setStatus('Vista lista. Toca cualquier elemento para editarlo.');
      }
      if (data?.type === 'cms:visual-select' && data.element) {
        const selected = data.element;
        setSelection(selected);
        const hasPageOverride = Boolean(draft.pages[currentRoute]?.elements[selected.selector]);
        const hasGlobalOverride = Boolean(draft.pages[VISUAL_CMS_GLOBAL_ROUTE]?.elements[selected.selector]);
        setElementScope(hasPageOverride ? 'page' : hasGlobalOverride ? 'global' : 'page');
        setStatus(`Editando ${selected.tag}: ${selected.label || selected.selector}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentRoute, draft, sendPreview]);

  function updateSelected(patch: Partial<VisualCmsElementOverride>) {
    if (!selection) return;
    setDraft((current) => upsertVisualElement(current, targetRoute, selection.selector, { label: selection.label, ...patch }));
  }

  function patchStyle(field: keyof VisualCmsStylePatch, value: string) {
    if (!selection) return;
    const nextStyle = { ...(override?.styles?.[styleScope] || {}), [field]: value };
    updateSelected({ styles: { [styleScope]: nextStyle } });
  }

  function patchBackgroundImage(value: string) {
    if (!selection) return;
    const clean = value.trim();
    const backgroundImage = clean ? `url("${clean.replace(/"/g, '\\"')}")` : 'none';
    const nextStyle = {
      ...(override?.styles?.[styleScope] || {}),
      backgroundImage,
      ...(clean ? { backgroundRepeat: 'no-repeat' } : {}),
    };
    updateSelected({ styles: { [styleScope]: nextStyle } });
  }

  function resetSelected() {
    if (!selection) return;
    setDraft((current) => removeVisualElement(current, targetRoute, selection.selector));
    setStatus(elementScope === 'global' ? 'Personalización global eliminada.' : 'Personalización de esta página eliminada.');
  }

  function navigate(nextRoute: string) {
    const clean = routeKey(nextRoute || '/');
    setRoute(clean);
    setRouteInput(clean);
    setSelection(null);
    setElementScope('page');
    setIframeReady(false);
    setStatus(`Abriendo ${clean}…`);
  }

  async function publish() {
    setPublishing(true);
    setStatus('Publicando cambios visuales…');
    try {
      const normalized = normalizeVisualCmsOverrides(draft);
      const response = await fetch('/api/admin/site-structure/visual-overrides', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: normalized }),
      });
      const body = await response.json().catch(() => ({})) as { content?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      const saved = normalizeVisualCmsOverrides(body.content ?? normalized);
      setPublished(saved);
      setDraft(saved);
      window.localStorage.removeItem(LOCAL_KEY);
      setStatus('Publicado. Los cambios ya están disponibles en el frontend.');
    } catch (error) {
      setStatus(error instanceof Error ? `Error al publicar: ${error.message}` : 'Error al publicar.');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[72vh] place-items-center bg-[#08090A] text-white"><div className="flex items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Preparando Visual CMS universal…</div></div>;
  }

  const previewSrc = `${route}${route.includes('?') ? '&' : '?'}cms=preview&cmsVisual=1`;
  const computed = selection?.computed || {};
  const valueFor = (key: keyof VisualCmsStylePatch) => String(activeStyle[key] ?? computed[key] ?? '');
  const backgroundUrl = extractBackgroundUrl(valueFor('backgroundImage'));

  return (
    <div className="min-h-screen bg-[#08090A] text-white">
      <header className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center gap-3 border-b border-white/8 bg-[#08090A]/95 px-3 py-2 backdrop-blur-xl sm:px-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Fabrick Visual CMS</p>
          <h1 className="truncate text-sm font-black sm:text-base">Editor universal del frontend</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/admin/editor/home-structure" className="hidden h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-[10px] font-black text-white/60 md:inline-flex"><Type className="h-3.5 w-3.5" /> Estructura Home</Link>
          <button type="button" onClick={() => { setDraft(published); setStatus('Borrador restaurado a la versión publicada.'); }} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] font-black text-white/55 disabled:opacity-25"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Restaurar</span></button>
          <button type="button" onClick={publish} disabled={!dirty || publishing} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FFB000] px-4 text-[10px] font-black text-black disabled:opacity-35">{publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Publicar</button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="border-b border-white/8 bg-[#0B0C0E] p-3 xl:border-b-0 xl:border-r">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[.18em] text-white/35">Páginas</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1">
            {PAGE_PRESETS.map(([href, label]) => <button key={href} type="button" onClick={() => navigate(href)} className={`rounded-xl border px-3 py-2.5 text-left text-[11px] font-black transition ${route === href ? 'border-[#FFB000]/60 bg-[#FFB000]/10 text-[#FFB000]' : 'border-white/8 bg-black/25 text-white/55 hover:border-white/20'}`}>{label}<span className="mt-0.5 block truncate text-[9px] font-medium text-white/25">{href}</span></button>)}
          </div>
          <div className="mt-4 grid gap-2">
            <Field label="Abrir cualquier ruta" value={routeInput} onChange={setRouteInput} placeholder="/servicios/metalcon" />
            <button type="button" onClick={() => navigate(routeInput)} className="h-10 rounded-xl bg-white/8 text-[10px] font-black text-white/70">Abrir ruta</button>
          </div>
          <div className="mt-4 rounded-xl border border-[#FFB000]/15 bg-[#FFB000]/5 p-3 text-[10px] leading-5 text-white/45">Este modo edita cualquier página existente sin reescribir su lógica. Haz clic en textos, cards, botones, imágenes, iconos, navbar, footer o fondos dentro de la vista.</div>
        </aside>

        <main className="flex min-h-[680px] min-w-0 flex-col bg-[#121315] p-2 sm:p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/10 bg-black/25 p-1">
              {(['mobile', 'tablet', 'desktop'] as VisualCmsDevice[]).map((item) => {
                const Icon = item === 'mobile' ? Smartphone : item === 'tablet' ? Tablet : Monitor;
                return <button key={item} type="button" onClick={() => { setDevice(item); setStyleScope(item); }} className={`grid h-8 w-9 place-items-center rounded-full ${device === item ? 'bg-[#FFB000] text-black' : 'text-white/40'}`} title={item}><Icon className="h-3.5 w-3.5" /></button>;
              })}
            </div>
            <span className="truncate text-[10px] font-bold text-white/35">{status}</span>
            <span className={`ml-auto rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] ${dirty ? 'bg-[#FFB000]/12 text-[#FFB000]' : 'bg-emerald-500/10 text-emerald-300'}`}>{dirty ? 'Sin publicar' : 'Publicado'}</span>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl border border-white/8 bg-[#050506] p-1.5 sm:p-3">
            <div className="h-full min-h-[620px] overflow-hidden rounded-xl bg-white shadow-2xl transition-[width] duration-300" style={{ width: widthFor[device], maxWidth: '100%' }}>
              <iframe ref={iframeRef} key={`${route}-${device}`} src={previewSrc} title={`Visual CMS ${route}`} className="h-full min-h-[620px] w-full border-0 bg-white" onLoad={() => setIframeReady(true)} />
            </div>
          </div>
        </main>

        <aside className="border-t border-white/8 bg-[#0B0C0E] p-3 xl:border-l xl:border-t-0 xl:p-4">
          {!selection ? (
            <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><Eye className="mx-auto h-7 w-7 text-[#FFB000]/50" /><h2 className="mt-3 text-sm font-black">Selecciona un elemento</h2><p className="mt-2 text-xs leading-5 text-white/35">Toca cualquier parte de la página. El inspector detectará el tipo de elemento y sus estilos actuales.</p></div></div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 border-b border-white/8 pb-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFB000] text-black"><Paintbrush className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">{selection.tag}{selection.isIcon ? ' · icono' : ''}</p><h2 className="truncate text-sm font-black">{selection.label}</h2><p className="mt-1 truncate text-[9px] text-white/25">{selection.selector}</p></div></div>

              <div className="rounded-xl border border-white/8 bg-black/25 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => setElementScope('page')} className={`rounded-lg px-2 py-2 text-[9px] font-black ${elementScope === 'page' ? 'bg-white/10 text-white' : 'text-white/35'}`}>Solo {currentRoute}</button>
                  <button type="button" onClick={() => setElementScope('global')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[9px] font-black ${elementScope === 'global' ? 'bg-[#FFB000] text-black' : 'text-white/35'}`}><Globe2 className="h-3 w-3" /> Todo el sitio</button>
                </div>
                <p className="px-2 pb-1 pt-2 text-[9px] leading-4 text-white/28">Usa “Todo el sitio” para navbar, footer, botones compartidos o identidad global. La personalización de una página siempre puede sobreescribirla.</p>
              </div>

              {selection.textEditable ? <label className="grid gap-1.5"><span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-white/38"><Type className="h-3 w-3" /> Texto</span><textarea value={override?.text ?? selection.text ?? ''} onChange={(event) => updateSelected({ text: event.target.value })} rows={4} className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-white outline-none focus:border-[#FFB000]/60" /></label> : null}
              {selection.isLink ? <div className="grid gap-2"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-white/38"><Link2 className="h-3 w-3" /> Enlace</p><Field label="Destino" value={override?.href ?? selection.href ?? ''} onChange={(value) => updateSelected({ href: value })} placeholder="/contacto" /></div> : null}
              {selection.isImage ? <div className="grid gap-2"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-white/38"><ImageIcon className="h-3 w-3" /> Imagen</p><Field label="URL / Cloudinary" value={override?.src ?? selection.src ?? ''} onChange={(value) => updateSelected({ src: value })} /><Field label="Texto alternativo" value={override?.alt ?? selection.alt ?? ''} onChange={(value) => updateSelected({ alt: value })} /><SelectField label="Ajuste de imagen" value={valueFor('objectFit') || 'cover'} onChange={(value) => patchStyle('objectFit', value)} options={[["cover","Cubrir"],["contain","Contener"],["fill","Estirar"],["none","Original"],["scale-down","Reducir"]]} /></div> : null}

              <div className="grid gap-2">
                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">Estilos</p><select value={styleScope} onChange={(event) => setStyleScope(event.target.value as StyleScope)} className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-[9px] font-bold text-white/60"><option value="all">Todos</option><option value="desktop">PC</option><option value="tablet">Tablet</option><option value="mobile">Móvil</option></select></div>
                <div className="grid grid-cols-2 gap-2"><ColorField label="Texto / icono" value={valueFor('color')} onChange={(value) => patchStyle('color', value)} /><ColorField label="Fondo" value={valueFor('backgroundColor')} onChange={(value) => patchStyle('backgroundColor', value)} /></div>
                <Field label="Imagen de fondo" value={backgroundUrl} onChange={patchBackgroundImage} placeholder="https://.../fondo.webp" />
                <div className="grid grid-cols-2 gap-2"><SelectField label="Ajuste fondo" value={valueFor('backgroundSize') || 'cover'} onChange={(value) => patchStyle('backgroundSize', value)} options={[["cover","Cubrir"],["contain","Contener"],["auto","Original"]]} /><Field label="Posición fondo" value={valueFor('backgroundPosition')} onChange={(value) => patchStyle('backgroundPosition', value)} placeholder="center center" /></div>
                <Field label="Tipografía" value={valueFor('fontFamily')} onChange={(value) => patchStyle('fontFamily', value)} placeholder="Manrope, sans-serif" />
                <div className="grid grid-cols-2 gap-2"><Field label="Tamaño" value={valueFor('fontSize')} onChange={(value) => patchStyle('fontSize', value)} placeholder="16px" /><Field label="Peso" value={valueFor('fontWeight')} onChange={(value) => patchStyle('fontWeight', value)} placeholder="700" /></div>
                <div className="grid grid-cols-2 gap-2"><Field label="Interlineado" value={valueFor('lineHeight')} onChange={(value) => patchStyle('lineHeight', value)} placeholder="1.4" /><Field label="Espaciado letras" value={valueFor('letterSpacing')} onChange={(value) => patchStyle('letterSpacing', value)} placeholder="0px" /></div>
                <SelectField label="Alineación de texto" value={valueFor('textAlign') || 'left'} onChange={(value) => patchStyle('textAlign', value)} options={[["left","Izquierda"],["center","Centro"],["right","Derecha"],["justify","Justificado"]]} />
                <div className="grid grid-cols-2 gap-2"><Field label="Radio" value={valueFor('borderRadius')} onChange={(value) => patchStyle('borderRadius', value)} placeholder="20px" /><Field label="Borde" value={valueFor('borderWidth')} onChange={(value) => patchStyle('borderWidth', value)} placeholder="1px" /></div>
                <ColorField label="Color del borde" value={valueFor('borderColor')} onChange={(value) => patchStyle('borderColor', value)} />
                <Field label="Padding" value={valueFor('padding')} onChange={(value) => patchStyle('padding', value)} placeholder="24px" />
                <Field label="Margen" value={valueFor('margin')} onChange={(value) => patchStyle('margin', value)} placeholder="0 auto" />
                <div className="grid grid-cols-2 gap-2"><Field label="Ancho" value={valueFor('width')} onChange={(value) => patchStyle('width', value)} placeholder="100%" /><Field label="Ancho máximo" value={valueFor('maxWidth')} onChange={(value) => patchStyle('maxWidth', value)} placeholder="1280px" /></div>
                <div className="grid grid-cols-2 gap-2"><Field label="Altura" value={valueFor('height')} onChange={(value) => patchStyle('height', value)} placeholder="auto" /><Field label="Altura mínima" value={valueFor('minHeight')} onChange={(value) => patchStyle('minHeight', value)} placeholder="240px" /></div>
                <div className="grid grid-cols-2 gap-2"><Field label="Separación / gap" value={valueFor('gap')} onChange={(value) => patchStyle('gap', value)} placeholder="16px" /><Field label="Opacidad" value={valueFor('opacity')} onChange={(value) => patchStyle('opacity', value)} placeholder="1" /></div>
                <Field label="Sombra" value={valueFor('boxShadow')} onChange={(value) => patchStyle('boxShadow', value)} placeholder="0 20px 60px rgba(0,0,0,.2)" />
              </div>

              <label className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"><span><b className="block text-[10px]">Ocultar elemento</b><small className="text-[9px] text-white/30">No elimina su lógica ni datos</small></span><input type="checkbox" checked={override?.hidden === true} onChange={(event) => updateSelected({ hidden: event.target.checked })} /></label>
              <button type="button" onClick={resetSelected} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/5 text-[10px] font-black text-red-200/70"><Trash2 className="h-3.5 w-3.5" /> Quitar personalización {elementScope === 'global' ? 'global' : 'de esta página'}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
