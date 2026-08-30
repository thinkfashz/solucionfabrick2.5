'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, Globe2, Image as ImageIcon, Layers3, Paintbrush, SlidersHorizontal, Type, X } from 'lucide-react';
import type { VisualCmsStylePatch } from '@/lib/visualCmsOverrides';

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

type QuickValues = {
  text: string;
  href: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  borderRadius: string;
};

type InspectorTab = 'Contenido' | 'Apariencia' | 'Medidas';

const QUICK_STYLE_ID = 'sf-visual-cms-context-style';

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function cssColorToHex(value: string | undefined, fallback = '#171612') {
  const clean = (value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  if (/^#[0-9a-f]{3}$/i.test(clean)) return `#${clean.slice(1).split('').map((char) => `${char}${char}`).join('')}`;
  const rgb = clean.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return fallback;
  return `#${[rgb[1], rgb[2], rgb[3]].map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0')).join('')}`;
}

function numberPart(value: string | undefined, fallback: string) {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? String(parsed) : fallback;
}

function findEditorRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('main[data-admin-content] h1'))
    .find((node) => normalizeText(node.textContent).startsWith('Editor universal'));
  return heading?.closest<HTMLElement>('div.relative.flex') || null;
}

function findButton(root: HTMLElement, text: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => normalizeText(button.textContent) === text) || null;
}

function findLabel(root: HTMLElement, caption: string) {
  return Array.from(root.querySelectorAll<HTMLLabelElement>('label')).find((label) => {
    const directSpan = label.querySelector<HTMLElement>(':scope > span');
    return normalizeText(directSpan?.textContent) === caption;
  }) || null;
}

function setNativeValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = control instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(control, value);
  else control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function activateTab(root: HTMLElement, tab: InspectorTab) {
  findButton(root, tab)?.click();
}

function withRetry(action: () => boolean, attempts = 8) {
  let count = 0;
  const run = () => {
    count += 1;
    if (action() || count >= attempts) return;
    window.setTimeout(run, 45);
  };
  run();
}

function setInspectorField(tab: InspectorTab, caption: string, value: string) {
  const root = findEditorRoot();
  if (!root) return;
  activateTab(root, tab);
  withRetry(() => {
    const label = findLabel(root, caption);
    if (!label) return false;
    const control = label.querySelector<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>('textarea, select, input:not([type="color"])');
    if (!control) return false;
    setNativeValue(control, value);
    return true;
  });
}

function clickInspectorAction(tab: InspectorTab, text: string) {
  const root = findEditorRoot();
  if (!root) return;
  activateTab(root, tab);
  withRetry(() => {
    const button = findButton(root, text);
    if (!button) return false;
    button.click();
    return true;
  });
}

function openCloudinaryFor(caption: 'URL / Cloudinary' | 'Reemplazar por SVG / PNG') {
  const root = findEditorRoot();
  if (!root) return;
  activateTab(root, 'Contenido');
  withRetry(() => {
    const label = findLabel(root, caption);
    const button = label?.querySelector<HTMLButtonElement>('[data-cloudinary-bridge-button="1"]');
    if (!button) return false;
    button.click();
    return true;
  });
}

function closeAutoInspectorPanel() {
  window.setTimeout(() => {
    const root = findEditorRoot();
    root?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar panel"]')?.click();
  }, 90);
}

function installContextStyles() {
  if (document.getElementById(QUICK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = QUICK_STYLE_ID;
  style.textContent = `
    [data-sf-visual-editor-root="1"] {
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    [data-sf-visual-editor-root="1"] > header {
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    [data-sf-visual-editor-root="1"] > div.relative.grid > main {
      background: transparent !important;
    }
    [data-sf-visual-editor-root="1"] > div.relative.grid > main > div:nth-child(2) {
      padding: 0 !important;
      background: rgba(23, 22, 18, .055) !important;
    }
    [data-sf-visual-editor-root="1"] > div.relative.grid > main > div:nth-child(2) > div {
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    [data-sf-visual-editor-root="1"] > div.relative.grid > aside {
      box-shadow: none !important;
    }
    @media (min-width: 1280px) {
      [data-sf-visual-editor-root="1"][data-context-advanced="0"] > div.relative.grid {
        grid-template-columns: 190px minmax(0, 1fr) !important;
      }
      [data-sf-visual-editor-root="1"][data-context-advanced="0"] > div.relative.grid > aside:last-of-type {
        display: none !important;
      }
      [data-sf-visual-editor-root="1"][data-context-advanced="1"] > div.relative.grid {
        grid-template-columns: 190px minmax(0, 1fr) 320px !important;
      }
      [data-sf-visual-editor-root="1"][data-context-advanced="1"] > div.relative.grid > aside:last-of-type {
        display: block !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function VisualCmsContextEditorBridge() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [quick, setQuick] = useState<QuickValues>({
    text: '', href: '', color: '#171612', backgroundColor: '#ffffff', fontSize: '16', fontWeight: '400', textAlign: 'left', borderRadius: '0',
  });
  const [similar, setSimilar] = useState(false);
  const [siteWide, setSiteWide] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [advanced, setAdvanced] = useState(false);

  const selectionTitle = useMemo(() => selection ? (selection.label || selection.tag || 'Elemento') : '', [selection]);

  useEffect(() => {
    installContextStyles();
    const mark = () => {
      const root = findEditorRoot();
      if (!root) return;
      root.dataset.sfVisualEditorRoot = '1';
      root.dataset.contextAdvanced = advanced ? '1' : '0';
    };
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [advanced]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; element?: Selection } | null;
      if (data?.type !== 'cms:visual-select' || !data.element) return;
      const selected = data.element;
      setSelection(selected);
      setQuick({
        text: selected.text || '',
        href: selected.href || '',
        color: cssColorToHex(selected.computed?.color, '#171612'),
        backgroundColor: cssColorToHex(selected.computed?.backgroundColor, '#ffffff'),
        fontSize: numberPart(selected.computed?.fontSize, '16'),
        fontWeight: numberPart(selected.computed?.fontWeight, '400'),
        textAlign: String(selected.computed?.textAlign || 'left'),
        borderRadius: numberPart(selected.computed?.borderRadius, '0'),
      });
      setSimilar(false);
      setSiteWide(false);
      setExpanded(true);
      setAdvanced(false);

      window.setTimeout(() => {
        clickInspectorAction('Contenido', 'Solo este');
        clickInspectorAction('Contenido', 'Esta página');
      }, 35);
      closeAutoInspectorPanel();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const root = findEditorRoot();
    if (!root) return;
    root.dataset.contextAdvanced = advanced ? '1' : '0';
    if (advanced && window.innerWidth < 1280) {
      const inspectorButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
        .find((button) => normalizeText(button.textContent) === 'Inspector');
      inspectorButton?.click();
    }
  }, [advanced]);

  if (!selection) return null;

  function updateQuick<K extends keyof QuickValues>(key: K, value: QuickValues[K]) {
    setQuick((current) => ({ ...current, [key]: value }));
  }

  function toggleSimilar(next: boolean) {
    const currentSelection = selection;
    if (!currentSelection) return;
    setSimilar(next);
    clickInspectorAction('Contenido', next ? `${currentSelection.similarCount} similares` : 'Solo este');
  }

  function toggleSiteWide(next: boolean) {
    setSiteWide(next);
    clickInspectorAction('Contenido', next ? 'Todo el sitio' : 'Esta página');
  }

  return (
    <div className="fixed inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-[125] mx-auto w-auto max-w-[920px] sm:inset-x-4" aria-label="Editor contextual del elemento seleccionado">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-[rgba(255,250,241,.94)] text-[#171612] shadow-[0_18px_60px_rgba(43,32,12,.22)] backdrop-blur-xl">
        <div className="flex min-h-11 items-center gap-2 border-b border-black/8 px-2.5 sm:px-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ffb000] text-black"><Paintbrush className="h-3.5 w-3.5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black">{selectionTitle}</p>
            <p className="truncate text-[8px] font-bold uppercase tracking-[.08em] text-black/35">{selection.tag} · solo este elemento por defecto</p>
          </div>
          {selection.similarSelector && selection.similarCount > 1 ? (
            <button type="button" onClick={() => toggleSimilar(!similar)} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[8px] font-black ${similar ? 'bg-[#ffb000] text-black' : 'border border-black/10 bg-white/55 text-black/55'}`} title="Aplicar también a elementos similares"><Layers3 className="h-3 w-3" />{similar ? `${selection.similarCount} similares` : 'Solo este'}</button>
          ) : null}
          <button type="button" onClick={() => toggleSiteWide(!siteWide)} className={`hidden h-8 items-center gap-1 rounded-lg px-2 text-[8px] font-black sm:inline-flex ${siteWide ? 'bg-[#ffb000] text-black' : 'border border-black/10 bg-white/55 text-black/55'}`} title="Cambiar alcance"><Globe2 className="h-3 w-3" />{siteWide ? 'Todo sitio' : 'Página'}</button>
          <button type="button" onClick={() => setAdvanced((value) => !value)} className={`grid h-8 w-8 place-items-center rounded-lg border ${advanced ? 'border-[#ffb000] bg-[#ffb000]/15 text-[#9a6200]' : 'border-black/10 bg-white/55 text-black/45'}`} title="Inspector avanzado"><SlidersHorizontal className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setExpanded((value) => !value)} className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white/55 text-black/45" title={expanded ? 'Contraer controles' : 'Mostrar controles'}><ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => setSelection(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white/55 text-black/45" aria-label="Cerrar editor contextual"><X className="h-3.5 w-3.5" /></button>
        </div>

        {expanded ? (
          <div className="max-h-[43dvh] overflow-y-auto p-2.5 sm:max-h-[230px] sm:p-3">
            {selection.textEditable && !similar ? (
              <label className="mb-2 grid gap-1">
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.08em] text-black/38"><Type className="h-3 w-3" /> Texto seleccionado</span>
                <textarea value={quick.text} rows={2} onChange={(event) => { const value = event.target.value; updateQuick('text', value); setInspectorField('Contenido', 'Texto', value); }} className="min-h-12 resize-none rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-[11px] leading-4 text-[#171612] outline-none focus:border-[#ffb000]" />
              </label>
            ) : null}

            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <label className="flex h-12 min-w-[112px] items-center gap-2 rounded-xl border border-black/8 bg-white/65 px-2.5">
                <input type="color" value={quick.color} onChange={(event) => { const value = event.target.value; updateQuick('color', value); setInspectorField('Apariencia', 'Texto / icono', value); }} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" />
                <span><b className="block text-[8px]">Color</b><small className="text-[7px] text-black/35">Texto/icono</small></span>
              </label>

              <label className="flex h-12 min-w-[112px] items-center gap-2 rounded-xl border border-black/8 bg-white/65 px-2.5">
                <input type="color" value={quick.backgroundColor} onChange={(event) => { const value = event.target.value; updateQuick('backgroundColor', value); setInspectorField('Apariencia', 'Fondo', value); }} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" />
                <span><b className="block text-[8px]">Fondo</b><small className="text-[7px] text-black/35">Solo selección</small></span>
              </label>

              {selection.textEditable ? (
                <label className="flex h-12 min-w-[104px] items-center gap-1.5 rounded-xl border border-black/8 bg-white/65 px-2.5">
                  <span className="text-[8px] font-black">px</span>
                  <input type="number" min="8" max="120" step="1" value={quick.fontSize} onChange={(event) => { const value = event.target.value; updateQuick('fontSize', value); if (value) setInspectorField('Apariencia', 'Tamaño', `${value}px`); }} className="w-12 bg-transparent text-[11px] font-black outline-none" />
                  <small className="text-[7px] text-black/35">Tamaño</small>
                </label>
              ) : null}

              {selection.textEditable ? (
                <label className="grid h-12 min-w-[108px] content-center rounded-xl border border-black/8 bg-white/65 px-2.5">
                  <small className="text-[7px] font-black text-black/35">Peso</small>
                  <select value={quick.fontWeight} onChange={(event) => { const value = event.target.value; updateQuick('fontWeight', value); setInspectorField('Apariencia', 'Peso', value); }} className="bg-transparent text-[10px] font-black outline-none">
                    <option value="300">Ligera</option><option value="400">Normal</option><option value="500">Media</option><option value="600">Semi</option><option value="700">Negrita</option><option value="800">Extra</option><option value="900">Black</option>
                  </select>
                </label>
              ) : null}

              {selection.textEditable ? (
                <div className="flex h-12 min-w-[118px] items-center justify-center gap-1 rounded-xl border border-black/8 bg-white/65 px-2">
                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([value, Icon]) => (
                    <button key={value} type="button" onClick={() => { updateQuick('textAlign', value); setInspectorField('Apariencia', 'Alineación', value); }} className={`grid h-8 w-8 place-items-center rounded-lg ${quick.textAlign === value ? 'bg-[#ffb000] text-black' : 'text-black/42'}`} title={`Alinear ${value}`}><Icon className="h-3.5 w-3.5" /></button>
                  ))}
                </div>
              ) : null}

              <label className="flex h-12 min-w-[118px] items-center gap-1.5 rounded-xl border border-black/8 bg-white/65 px-2.5">
                <span className="text-[8px] font-black">R</span>
                <input type="number" min="0" max="120" step="1" value={quick.borderRadius} onChange={(event) => { const value = event.target.value; updateQuick('borderRadius', value); if (value !== '') setInspectorField('Apariencia', 'Radio', `${value}px`); }} className="w-12 bg-transparent text-[11px] font-black outline-none" />
                <small className="text-[7px] text-black/35">Radio</small>
              </label>

              {selection.isImage && !similar ? <button type="button" onClick={() => openCloudinaryFor('URL / Cloudinary')} className="inline-flex h-12 min-w-[132px] items-center justify-center gap-1.5 rounded-xl border border-[#ffb000]/35 bg-[#ffb000]/12 px-3 text-[8px] font-black text-[#8b5900]"><ImageIcon className="h-3.5 w-3.5" /> Cambiar imagen</button> : null}
              {selection.isIcon ? <button type="button" onClick={() => openCloudinaryFor('Reemplazar por SVG / PNG')} className="inline-flex h-12 min-w-[132px] items-center justify-center gap-1.5 rounded-xl border border-[#ffb000]/35 bg-[#ffb000]/12 px-3 text-[8px] font-black text-[#8b5900]"><ImageIcon className="h-3.5 w-3.5" /> Cambiar icono</button> : null}
            </div>

            {selection.isLink && !similar ? (
              <label className="mt-2 grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <span className="text-[8px] font-black uppercase tracking-[.08em] text-black/38">Enlace</span>
                <input value={quick.href} onChange={(event) => { const value = event.target.value; updateQuick('href', value); setInspectorField('Contenido', 'Destino del enlace', value); }} className="h-9 rounded-xl border border-black/10 bg-white/75 px-3 text-[10px] outline-none focus:border-[#ffb000]" placeholder="/contacto" />
              </label>
            ) : null}

            <div className="mt-2 flex items-center gap-2 sm:hidden">
              <button type="button" onClick={() => toggleSiteWide(!siteWide)} className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[8px] font-black ${siteWide ? 'bg-[#ffb000] text-black' : 'border border-black/10 bg-white/55 text-black/55'}`}><Globe2 className="h-3 w-3" />{siteWide ? 'Todo el sitio' : 'Solo esta página'}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
