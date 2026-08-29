'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteContent } from '@/hooks/useSiteContent';
import {
  normalizeVisualCmsOverrides,
  routeKey,
  type VisualCmsDevice,
  type VisualCmsElementOverride,
  type VisualCmsStylePatch,
} from '@/lib/visualCmsOverrides';

type Snapshot = {
  element: HTMLElement;
  style: string | null;
  text: string | null;
  href: string | null;
  src: string | null;
  alt: string | null;
};

const EDITOR_PARAM = 'cmsVisual';
const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HTML']);

function deviceForWidth(width: number): VisualCmsDevice {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

function cleanCssValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean || undefined;
}

function applyStylePatch(element: HTMLElement, patch: VisualCmsStylePatch | undefined) {
  if (!patch) return;
  const style = element.style;
  const entries: Array<[keyof VisualCmsStylePatch, keyof CSSStyleDeclaration]> = [
    ['color', 'color'],
    ['backgroundColor', 'backgroundColor'],
    ['fontFamily', 'fontFamily'],
    ['fontSize', 'fontSize'],
    ['fontWeight', 'fontWeight'],
    ['lineHeight', 'lineHeight'],
    ['letterSpacing', 'letterSpacing'],
    ['textAlign', 'textAlign'],
    ['borderColor', 'borderColor'],
    ['borderWidth', 'borderWidth'],
    ['borderRadius', 'borderRadius'],
    ['padding', 'padding'],
    ['margin', 'margin'],
    ['width', 'width'],
    ['minHeight', 'minHeight'],
    ['opacity', 'opacity'],
    ['boxShadow', 'boxShadow'],
    ['objectFit', 'objectFit'],
  ];
  for (const [source, target] of entries) {
    const value = cleanCssValue(patch[source]);
    if (value !== undefined) (style[target] as string) = value;
  }
}

function snapshotElement(element: HTMLElement): Snapshot {
  return {
    element,
    style: element.getAttribute('style'),
    text: element.childElementCount === 0 ? element.textContent : null,
    href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
    src: element instanceof HTMLImageElement ? element.getAttribute('src') : null,
    alt: element instanceof HTMLImageElement ? element.getAttribute('alt') : null,
  };
}

function restoreSnapshot(snapshot: Snapshot) {
  const { element } = snapshot;
  if (!element.isConnected) return;
  if (snapshot.style === null) element.removeAttribute('style');
  else element.setAttribute('style', snapshot.style);
  if (snapshot.text !== null && element.childElementCount === 0) element.textContent = snapshot.text;
  if (element instanceof HTMLAnchorElement) {
    if (snapshot.href === null) element.removeAttribute('href');
    else element.setAttribute('href', snapshot.href);
  }
  if (element instanceof HTMLImageElement) {
    if (snapshot.src === null) element.removeAttribute('src');
    else element.setAttribute('src', snapshot.src);
    if (snapshot.alt === null) element.removeAttribute('alt');
    else element.setAttribute('alt', snapshot.alt);
  }
}

function applyOverride(element: HTMLElement, override: VisualCmsElementOverride, device: VisualCmsDevice) {
  if (typeof override.text === 'string' && element.childElementCount === 0) element.textContent = override.text;
  if (element instanceof HTMLAnchorElement && typeof override.href === 'string') element.setAttribute('href', override.href);
  if (element instanceof HTMLImageElement) {
    if (typeof override.src === 'string') element.setAttribute('src', override.src);
    if (typeof override.alt === 'string') element.setAttribute('alt', override.alt);
  }
  if (override.hidden === true) element.style.display = 'none';
  applyStylePatch(element, override.styles?.all);
  applyStylePatch(element, override.styles?.[device]);
}

function escapeSelector(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function uniqueSelector(element: HTMLElement): string {
  const cmsId = element.dataset.cmsId;
  if (cmsId) return `[data-cms-id="${escapeSelector(cmsId)}"]`;
  if (element.id) {
    const idSelector = `#${escapeSelector(element.id)}`;
    try { if (document.querySelectorAll(idSelector).length === 1) return idSelector; } catch { /* noop */ }
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child) => child.tagName === current!.tagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, index)})`);
    current = parent;
    if (parts.length >= 7) break;
  }
  return `body > ${parts.join(' > ')}`;
}

function selectionPayload(element: HTMLElement) {
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const textEditable = element.childElementCount === 0 && !['IMG', 'INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'CANVAS', 'SVG'].includes(element.tagName);
  return {
    selector: uniqueSelector(element),
    tag: element.tagName.toLowerCase(),
    label: element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim().slice(0, 70) || element.tagName.toLowerCase(),
    text: textEditable ? element.textContent || '' : null,
    textEditable,
    href: element instanceof HTMLAnchorElement ? element.getAttribute('href') || '' : null,
    src: element instanceof HTMLImageElement ? element.currentSrc || element.getAttribute('src') || '' : null,
    alt: element instanceof HTMLImageElement ? element.getAttribute('alt') || '' : null,
    isImage: element instanceof HTMLImageElement,
    isLink: element instanceof HTMLAnchorElement,
    isIcon: element.tagName === 'SVG' || Boolean(element.closest('svg')),
    computed: {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      borderColor: computed.borderColor,
      borderWidth: computed.borderWidth,
      borderRadius: computed.borderRadius,
      padding: computed.padding,
      margin: computed.margin,
      width: `${Math.round(rect.width)}px`,
      minHeight: computed.minHeight,
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      objectFit: computed.objectFit,
    },
  };
}

export default function VisualCmsRuntime() {
  const pathname = usePathname() || '/';
  const stored = useSiteContent('visual-overrides');
  const content = useMemo(() => normalizeVisualCmsOverrides(stored), [stored]);
  const snapshotsRef = useRef<Map<string, Snapshot>>(new Map());
  const selectedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const snapshots = snapshotsRef.current;
    for (const snapshot of snapshots.values()) restoreSnapshot(snapshot);
    snapshots.clear();

    const page = content.pages[routeKey(pathname)];
    if (!page) return;
    const device = deviceForWidth(window.innerWidth);

    for (const override of Object.values(page.elements)) {
      try {
        const element = document.querySelector<HTMLElement>(override.selector);
        if (!element || BLOCKED_TAGS.has(element.tagName)) continue;
        snapshots.set(override.selector, snapshotElement(element));
        applyOverride(element, override, device);
      } catch {
        // A stale selector must never break the public page.
      }
    }

    return () => {
      for (const snapshot of snapshots.values()) restoreSnapshot(snapshot);
      snapshots.clear();
    };
  }, [content, pathname]);

  useEffect(() => {
    let preview = false;
    try { preview = new URLSearchParams(window.location.search).get(EDITOR_PARAM) === '1'; } catch { /* noop */ }
    if (!preview || window.parent === window) return;

    const mark = (next: HTMLElement | null) => {
      if (selectedRef.current && selectedRef.current !== next) {
        selectedRef.current.style.removeProperty('outline');
        selectedRef.current.style.removeProperty('outline-offset');
      }
      selectedRef.current = next;
      if (next) {
        next.style.setProperty('outline', '2px solid #ffb000', 'important');
        next.style.setProperty('outline-offset', '3px', 'important');
      }
    };

    const click = (event: MouseEvent) => {
      const raw = event.target;
      const element = raw instanceof HTMLElement ? raw : raw instanceof SVGElement ? raw.parentElement : null;
      if (!element || BLOCKED_TAGS.has(element.tagName) || element.closest('[data-cms-editor-ignore]')) return;
      event.preventDefault();
      event.stopPropagation();
      mark(element);
      window.parent.postMessage({
        type: 'cms:visual-select',
        route: routeKey(pathname),
        element: selectionPayload(element),
      }, window.location.origin);
    };

    const hover = (event: MouseEvent) => {
      const raw = event.target;
      const element = raw instanceof HTMLElement ? raw : raw instanceof SVGElement ? raw.parentElement : null;
      if (!element || BLOCKED_TAGS.has(element.tagName) || element.closest('[data-cms-editor-ignore]')) return;
      element.style.setProperty('cursor', 'crosshair', 'important');
    };

    document.addEventListener('click', click, true);
    document.addEventListener('mouseover', hover, true);
    window.parent.postMessage({ type: 'cms:visual-ready', route: routeKey(pathname) }, window.location.origin);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('mouseover', hover, true);
      mark(null);
    };
  }, [pathname]);

  return null;
}
