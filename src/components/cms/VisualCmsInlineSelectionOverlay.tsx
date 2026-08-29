'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type SelectionLevel = 'element' | 'container' | 'section';
type HomeStructureAction = 'move-up' | 'move-down' | 'duplicate';

type OverlayRect = { top: number; left: number; width: number; height: number };
type HomeStructureState = { dirty: boolean; busy: boolean; status: string };

const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HTML', 'BODY']);

function resolveElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target instanceof SVGElement) {
    const svg = target.closest('svg');
    return svg?.parentElement || target.parentElement;
  }
  return null;
}

function isEditorElement(element: HTMLElement | null) {
  return Boolean(element?.closest('[data-cms-editor-ignore]'));
}

function clearLegacyOutline(element: HTMLElement | null) {
  if (!element) return;
  element.style.removeProperty('outline');
  element.style.removeProperty('outline-offset');
}

function rectOf(element: HTMLElement | null): OverlayRect | null {
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function containerFor(element: HTMLElement): HTMLElement | null {
  const managed = element.closest<HTMLElement>('[data-cms-container]');
  if (managed && managed !== document.body && !isEditorElement(managed)) return managed;

  const sourceRect = element.getBoundingClientRect();
  let current = element.parentElement;
  for (let depth = 0; current && current !== document.body && depth < 6; depth += 1) {
    if (!isEditorElement(current) && !['MAIN', 'HEADER', 'FOOTER', 'NAV'].includes(current.tagName)) {
      const rect = current.getBoundingClientRect();
      const meaningfulSize = rect.width >= Math.max(88, sourceRect.width + 8) || rect.height >= Math.max(52, sourceRect.height + 8);
      const structuralTag = ['DIV', 'LI', 'ARTICLE', 'ASIDE', 'FIGURE'].includes(current.tagName);
      if (meaningfulSize && structuralTag && current.childElementCount > 0) return current;
    }
    current = current.parentElement;
  }
  return null;
}

function sectionFor(element: HTMLElement): HTMLElement | null {
  const managed = element.closest<HTMLElement>('[data-cms-block-id]');
  if (managed && managed !== document.body && !isEditorElement(managed)) return managed;

  const semantic = element.closest<HTMLElement>('[data-cms-section], section, article, aside, header, footer, nav');
  if (semantic && semantic !== document.body && !isEditorElement(semantic)) return semantic;

  let current = element.parentElement;
  for (let depth = 0; current && current !== document.body && depth < 7; depth += 1) {
    if (!isEditorElement(current) && current.tagName !== 'MAIN') {
      const rect = current.getBoundingClientRect();
      if (current.childElementCount >= 2 && (rect.width >= window.innerWidth * 0.62 || rect.height >= 260)) return current;
    }
    current = current.parentElement;
  }
  return null;
}

function cssColorToHex(value: string | undefined, fallback: string) {
  const clean = (value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  if (/^#[0-9a-f]{3}$/i.test(clean)) return `#${clean.slice(1).split('').map((char) => `${char}${char}`).join('')}`;
  const rgb = clean.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return fallback;
  return `#${[rgb[1], rgb[2], rgb[3]].map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0')).join('')}`;
}

function shortLabel(element: HTMLElement | null) {
  if (!element) return '';
  const semantic = element.getAttribute('aria-label') || element.getAttribute('title');
  if (semantic) return semantic.slice(0, 46);
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 46);
  return element.tagName.toLowerCase();
}

function mutationTouchesOnlyEditorUi(mutation: MutationRecord) {
  if (mutation.target instanceof HTMLElement && isEditorElement(mutation.target)) return true;
  const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  return nodes.length > 0 && nodes.every((node) => node instanceof HTMLElement && (node.matches('[data-cms-editor-ignore]') || isEditorElement(node)));
}

export default function VisualCmsInlineSelectionOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [base, setBase] = useState<HTMLElement | null>(null);
  const [level, setLevel] = useState<SelectionLevel>('element');
  const [rect, setRect] = useState<OverlayRect | null>(null);
  const [homeStructure, setHomeStructure] = useState<HomeStructureState>({ dirty: false, busy: false, status: '' });
  const suppressBaseResetRef = useRef(false);

  useEffect(() => {
    let preview = false;
    try { preview = new URLSearchParams(window.location.search).get('cmsVisual') === '1'; } catch { /* noop */ }
    setEnabled(preview && window.parent !== window);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; dirty?: boolean; busy?: boolean; status?: string } | null;
      if (data?.type !== 'cms:visual-home-structure-state') return;
      setHomeStructure({ dirty: data.dirty === true, busy: data.busy === true, status: typeof data.status === 'string' ? data.status : '' });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;

    const updateRect = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setRect(rectOf(selected)));
    };

    const handleClick = (event: MouseEvent) => {
      const element = resolveElement(event.target);
      if (!element || BLOCKED_TAGS.has(element.tagName) || isEditorElement(element)) return;
      setSelected(element);
      if (!suppressBaseResetRef.current) {
        setBase(element);
        setLevel('element');
      }
      window.requestAnimationFrame(() => {
        clearLegacyOutline(element);
        updateRect();
      });
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, true);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !mutationTouchesOnlyEditorUi(mutation))) updateRect();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    updateRect();

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, selected]);

  const candidates = useMemo(() => {
    if (!base) return { element: null, container: null, section: null };
    return { element: base, container: containerFor(base), section: sectionFor(base) };
  }, [base]);

  if (!enabled || !selected || !rect || typeof document === 'undefined') return null;

  const computed = window.getComputedStyle(selected);
  const textColor = cssColorToHex(computed.color, '#171612');
  const backgroundColor = cssColorToHex(computed.backgroundColor, '#ffffff');
  const fontSize = Number.parseFloat(computed.fontSize || '16') || 16;
  const managedSectionId = level === 'section' ? selected.dataset.cmsBlockId || null : null;
  const rawManagedContainer = level === 'container' ? selected.dataset.cmsContainer || null : null;
  const managedContainer = rawManagedContainer && /^.+-\d+$/.test(rawManagedContainer) ? rawManagedContainer : null;
  const managedContainerSectionId = managedContainer ? selected.closest<HTMLElement>('[data-cms-block-id]')?.dataset.cmsBlockId || null : null;
  const hasManagedStructure = Boolean(managedSectionId || (managedContainer && managedContainerSectionId));
  const toolbarWidth = Math.min(hasManagedStructure ? 760 : 590, Math.max(300, window.innerWidth - 16));
  const toolbarLeft = Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, rect.left));
  const toolbarTop = rect.top > 58 ? rect.top - 48 : Math.min(window.innerHeight - 52, rect.top + rect.height + 8);

  const selectLevel = (nextLevel: SelectionLevel) => {
    const target = candidates[nextLevel];
    if (!target) return;
    suppressBaseResetRef.current = true;
    setLevel(nextLevel);
    setSelected(target);
    setRect(rectOf(target));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    window.requestAnimationFrame(() => {
      clearLegacyOutline(target);
      suppressBaseResetRef.current = false;
    });
  };

  const send = (action: string, value?: string) => {
    window.parent.postMessage({ type: 'cms:visual-inline-action', action, value }, window.location.origin);
  };

  const sendHomeStructure = (action: HomeStructureAction) => {
    if (homeStructure.busy) return;
    if (managedSectionId) {
      window.parent.postMessage({ type: 'cms:visual-home-structure-action', sectionId: managedSectionId, action }, window.location.origin);
      return;
    }
    if (managedContainer && managedContainerSectionId) {
      window.parent.postMessage({ type: 'cms:visual-home-card-structure-action', sectionId: managedContainerSectionId, container: managedContainer, action }, window.location.origin);
    }
  };

  const publishHomeStructure = () => {
    if (!homeStructure.dirty || homeStructure.busy) return;
    window.parent.postMessage({ type: 'cms:visual-home-structure-publish' }, window.location.origin);
  };

  return createPortal(
    <div data-cms-editor-ignore="true" className="pointer-events-none fixed inset-0 z-[2147483000] font-sans">
      <div
        className="absolute border-2 border-[#ffb000] shadow-[0_0_0_1px_rgba(0,0,0,.18),0_0_0_4px_rgba(255,176,0,.12)]"
        style={{ top: rect.top - 2, left: rect.left - 2, width: rect.width + 4, height: rect.height + 4 }}
      >
        <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-black/35 bg-[#ffb000]" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-black/35 bg-[#ffb000]" />
        <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-[3px] border border-black/35 bg-[#ffb000]" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 translate-x-1/2 translate-y-1/2 rounded-[3px] border border-black/35 bg-[#ffb000]" />
        <span className="absolute left-0 top-0 max-w-[240px] -translate-y-full truncate rounded-t-md bg-[#ffb000] px-2 py-1 text-[9px] font-black uppercase tracking-[.05em] text-black">
          {level === 'element' ? 'Elemento' : level === 'container' ? 'Contenedor' : 'Sección'} · {shortLabel(selected)}
        </span>
      </div>

      <div
        className="pointer-events-auto absolute flex h-10 items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#15140f]/95 p-1 text-[#fff8e9] shadow-[0_16px_42px_rgba(0,0,0,.34)] backdrop-blur-xl [scrollbar-width:none]"
        style={{ top: toolbarTop, left: toolbarLeft, width: toolbarWidth }}
        title={homeStructure.status || undefined}
      >
        <button type="button" onClick={() => selectLevel('element')} className={`h-8 shrink-0 rounded-lg px-2 text-[9px] font-black ${level === 'element' ? 'bg-[#ffb000] text-black' : 'bg-white/5 text-white/70'}`}>Elemento</button>
        {candidates.container ? <button type="button" onClick={() => selectLevel('container')} className={`h-8 shrink-0 rounded-lg px-2 text-[9px] font-black ${level === 'container' ? 'bg-[#ffb000] text-black' : 'bg-white/5 text-white/70'}`}>Contenedor</button> : null}
        {candidates.section && candidates.section !== candidates.container ? <button type="button" onClick={() => selectLevel('section')} className={`h-8 shrink-0 rounded-lg px-2 text-[9px] font-black ${level === 'section' ? 'bg-[#ffb000] text-black' : 'bg-white/5 text-white/70'}`}>Sección</button> : null}

        {hasManagedStructure ? (
          <>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-[#ffb000]/25" />
            <span className="hidden shrink-0 px-1 text-[7px] font-black uppercase tracking-[.08em] text-[#ffd77a]/60 sm:inline">{managedSectionId ? 'Sección' : 'Card'}</span>
            <button type="button" disabled={homeStructure.busy} onClick={() => sendHomeStructure('move-up')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ffb000]/12 text-[13px] font-black text-[#ffd77a] disabled:opacity-35" title={`Mover ${managedSectionId ? 'sección' : 'tarjeta'} hacia arriba`}>↑</button>
            <button type="button" disabled={homeStructure.busy} onClick={() => sendHomeStructure('move-down')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ffb000]/12 text-[13px] font-black text-[#ffd77a] disabled:opacity-35" title={`Mover ${managedSectionId ? 'sección' : 'tarjeta'} hacia abajo`}>↓</button>
            <button type="button" disabled={homeStructure.busy} onClick={() => sendHomeStructure('duplicate')} className="h-8 shrink-0 rounded-lg bg-[#ffb000]/12 px-2 text-[8px] font-black text-[#ffd77a] disabled:opacity-35" title={`Duplicar ${managedSectionId ? 'sección' : 'tarjeta'}`}>Duplicar</button>
            {homeStructure.dirty ? <button type="button" disabled={homeStructure.busy} onClick={publishHomeStructure} className="h-8 shrink-0 rounded-lg bg-[#ffb000] px-2.5 text-[8px] font-black text-black disabled:opacity-45">{homeStructure.busy ? 'Guardando…' : 'Publicar estructura'}</button> : null}
          </>
        ) : null}

        <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />
        <button type="button" onClick={() => send('focus-text')} className="h-8 shrink-0 rounded-lg bg-white/5 px-2 text-[9px] font-black text-white/70">Texto</button>
        <label className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-white/5 px-1.5 text-[8px] font-bold text-white/60" title="Color de texto/icono">
          <input type="color" value={textColor} onChange={(event) => send('color', event.target.value)} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" /> T
        </label>
        <label className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-white/5 px-1.5 text-[8px] font-bold text-white/60" title="Color de fondo">
          <input type="color" value={backgroundColor} onChange={(event) => send('background', event.target.value)} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" /> BG
        </label>
        <button type="button" onClick={() => send('font-size', `${Math.max(8, fontSize - 1)}px`)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[10px] font-black text-white/70">A−</button>
        <button type="button" onClick={() => send('font-size', `${Math.min(160, fontSize + 1)}px`)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[10px] font-black text-white/70">A+</button>
        {selected instanceof HTMLImageElement ? <button type="button" onClick={() => send('image')} className="h-8 shrink-0 rounded-lg bg-[#ffb000]/15 px-2 text-[9px] font-black text-[#ffd77a]">Imagen</button> : null}
        <button type="button" onClick={() => send('advanced')} className="ml-auto h-8 shrink-0 rounded-lg border border-[#ffb000]/25 bg-[#ffb000]/10 px-2 text-[9px] font-black text-[#ffd77a]">Avanzado</button>
      </div>
    </div>,
    document.body,
  );
}
