'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteContent } from '@/hooks/useSiteContent';
import {
  VISUAL_CMS_GLOBAL_ROUTE,
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
  srcset: string | null;
  sizes: string | null;
  alt: string | null;
  iconSvg: SVGElement | null;
  iconSvgStyle: string | null;
};

const EDITOR_PARAM = 'cmsVisual';
const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HTML']);
const RUNTIME_ICON_ATTR = 'data-cms-runtime-icon';
const RUNTIME_MUTATION_COUNTS = new WeakMap<Node, number>();

function markRuntimeMutation(target: Node) {
  RUNTIME_MUTATION_COUNTS.set(target, (RUNTIME_MUTATION_COUNTS.get(target) || 0) + 1);
}

function consumeRuntimeMutation(target: Node) {
  const count = RUNTIME_MUTATION_COUNTS.get(target) || 0;
  if (count <= 0) return false;
  if (count === 1) RUNTIME_MUTATION_COUNTS.delete(target);
  else RUNTIME_MUTATION_COUNTS.set(target, count - 1);
  return true;
}

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
  const entries: Array<[keyof VisualCmsStylePatch, string]> = [
    ['color', 'color'],
    ['backgroundColor', 'background-color'],
    ['backgroundImage', 'background-image'],
    ['backgroundSize', 'background-size'],
    ['backgroundPosition', 'background-position'],
    ['backgroundRepeat', 'background-repeat'],
    ['fontFamily', 'font-family'],
    ['fontSize', 'font-size'],
    ['fontWeight', 'font-weight'],
    ['lineHeight', 'line-height'],
    ['letterSpacing', 'letter-spacing'],
    ['textAlign', 'text-align'],
    ['borderColor', 'border-color'],
    ['borderWidth', 'border-width'],
    ['borderRadius', 'border-radius'],
    ['padding', 'padding'],
    ['margin', 'margin'],
    ['width', 'width'],
    ['maxWidth', 'max-width'],
    ['height', 'height'],
    ['minHeight', 'min-height'],
    ['gap', 'gap'],
    ['opacity', 'opacity'],
    ['boxShadow', 'box-shadow'],
    ['objectFit', 'object-fit'],
    ['objectPosition', 'object-position'],
    ['transform', 'transform'],
    ['transformOrigin', 'transform-origin'],
  ];
  for (const [source, cssProperty] of entries) {
    const value = cleanCssValue(patch[source]);
    if (value !== undefined) element.style.setProperty(cssProperty, value);
  }
}

function snapshotElement(element: HTMLElement): Snapshot {
  const iconSvg = element.querySelector<SVGElement>('svg');
  return {
    element,
    style: element.getAttribute('style'),
    text: element.childElementCount === 0 ? element.textContent : null,
    href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
    src: element instanceof HTMLImageElement ? element.getAttribute('src') : null,
    srcset: element instanceof HTMLImageElement ? element.getAttribute('srcset') : null,
    sizes: element instanceof HTMLImageElement ? element.getAttribute('sizes') : null,
    alt: element instanceof HTMLImageElement ? element.getAttribute('alt') : null,
    iconSvg,
    iconSvgStyle: iconSvg?.getAttribute('style') ?? null,
  };
}

function restoreAttribute(element: Element, name: string, value: string | null) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreSnapshot(snapshot: Snapshot) {
  const { element } = snapshot;
  if (!element.isConnected) return;
  restoreAttribute(element, 'style', snapshot.style);
  if (snapshot.text !== null && element.childElementCount === 0 && element.textContent !== snapshot.text) {
    markRuntimeMutation(element);
    element.textContent = snapshot.text;
  }
  if (element instanceof HTMLAnchorElement) restoreAttribute(element, 'href', snapshot.href);
  if (element instanceof HTMLImageElement) {
    restoreAttribute(element, 'src', snapshot.src);
    restoreAttribute(element, 'srcset', snapshot.srcset);
    restoreAttribute(element, 'sizes', snapshot.sizes);
    restoreAttribute(element, 'alt', snapshot.alt);
  }
  element.querySelectorAll(`[${RUNTIME_ICON_ATTR}]`).forEach((node) => node.remove());
  if (snapshot.iconSvg?.isConnected) restoreAttribute(snapshot.iconSvg, 'style', snapshot.iconSvgStyle);
}

function applyIconOverride(element: HTMLElement, override: VisualCmsElementOverride) {
  const iconUrl = override.iconUrl?.trim();
  if (!iconUrl) return;
  const svg = element.querySelector<SVGElement>('svg');
  if (!svg) return;

  const parent = svg.parentElement;
  if (!parent) return;
  const rect = svg.getBoundingClientRect();
  svg.style.setProperty('display', 'none', 'important');

  let replacement = parent.querySelector<HTMLImageElement>(`img[${RUNTIME_ICON_ATTR}="1"]`);
  if (!replacement) {
    replacement = document.createElement('img');
    replacement.setAttribute(RUNTIME_ICON_ATTR, '1');
    replacement.setAttribute('data-cms-editor-ignore', 'true');
    replacement.decoding = 'async';
    replacement.loading = 'eager';
    svg.insertAdjacentElement('afterend', replacement);
  }
  replacement.src = iconUrl;
  replacement.alt = override.iconAlt || '';
  replacement.style.width = `${Math.max(12, Math.round(rect.width || 18))}px`;
  replacement.style.height = `${Math.max(12, Math.round(rect.height || 18))}px`;
  replacement.style.objectFit = 'contain';
  replacement.style.flex = '0 0 auto';
  replacement.style.display = 'inline-block';
}

function applyOverride(element: HTMLElement, override: VisualCmsElementOverride, device: VisualCmsDevice) {
  if (typeof override.text === 'string' && element.childElementCount === 0 && element.textContent !== override.text) {
    markRuntimeMutation(element);
    element.textContent = override.text;
  }
  if (element instanceof HTMLAnchorElement && typeof override.href === 'string') element.setAttribute('href', override.href);
  if (element instanceof HTMLImageElement) {
    if (typeof override.src === 'string') {
      element.removeAttribute('srcset');
      element.removeAttribute('sizes');
      element.setAttribute('src', override.src);
    }
    if (typeof override.alt === 'string') element.setAttribute('alt', override.alt);
  }
  if (override.hidden === true) element.style.display = 'none';
  applyStylePatch(element, override.styles?.all);
  applyStylePatch(element, override.styles?.[device]);
  applyIconOverride(element, override);
}

function escapeSelector(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function uniqueAttributeSelector(element: HTMLElement, attribute: string): string | null {
  const value = element.getAttribute(attribute)?.trim();
  if (!value) return null;
  const selector = `${element.tagName.toLowerCase()}[${attribute}="${escapeAttributeValue(value)}"]`;
  try {
    return document.querySelectorAll(selector).length === 1 ? selector : null;
  } catch {
    return null;
  }
}

function setCmsId(element: HTMLElement | null, id: string) {
  if (element && !element.dataset.cmsId) element.dataset.cmsId = id;
}

function ensureStableCmsIds() {
  const navCandidates = Array.from(document.querySelectorAll<HTMLElement>('nav'));
  const primaryNavbar = navCandidates.find((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.position === 'fixed' && rect.top <= 32 && rect.width >= window.innerWidth * 0.7;
  }) || null;
  setCmsId(primaryNavbar, 'site-navbar');

  const footer = document.querySelector<HTMLElement>('footer');
  setCmsId(footer, 'site-footer');

  const brand = document.querySelector<HTMLElement>('[aria-label="Soluciones Fabrick — inicio"]');
  setCmsId(brand, 'site-navbar-brand');

  const desktopCart = document.querySelector<HTMLElement>('[aria-label^="Carrito de compras"]');
  setCmsId(desktopCart, 'site-navbar-cart');
}

function uniqueSelector(element: HTMLElement): string {
  const cmsId = element.dataset.cmsId;
  if (cmsId) return `[data-cms-id="${escapeSelector(cmsId)}"]`;
  if (element.id) {
    const idSelector = `#${escapeSelector(element.id)}`;
    try { if (document.querySelectorAll(idSelector).length === 1) return idSelector; } catch { /* noop */ }
  }

  const semanticSelector = uniqueAttributeSelector(element, 'aria-label')
    || uniqueAttributeSelector(element, 'name')
    || uniqueAttributeSelector(element, 'href')
    || uniqueAttributeSelector(element, 'title');
  if (semanticSelector) return semanticSelector;

  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const currentElement: HTMLElement = current;
    const currentCmsId = currentElement.dataset.cmsId;
    if (currentCmsId) {
      parts.unshift(`[data-cms-id="${escapeSelector(currentCmsId)}"]`);
      return parts.join(' > ');
    }
    const tag = currentElement.tagName.toLowerCase();
    const parentElement: HTMLElement | null = currentElement.parentElement;
    if (!parentElement) break;
    const siblings = Array.from(parentElement.children).filter((child) => child.tagName === currentElement.tagName);
    const index = siblings.indexOf(currentElement) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, index)})`);
    current = parentElement;
    if (parts.length >= 7) break;
  }
  return `body > ${parts.join(' > ')}`;
}

function relativePath(ancestor: HTMLElement, element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== ancestor) {
    const currentElement: HTMLElement = current;
    const parentElement: HTMLElement | null = currentElement.parentElement;
    if (!parentElement) return '';
    const siblings = Array.from(parentElement.children).filter((child) => child.tagName === currentElement.tagName);
    const index = siblings.indexOf(currentElement) + 1;
    parts.unshift(`${currentElement.tagName.toLowerCase()}:nth-of-type(${Math.max(1, index)})`);
    current = parentElement;
  }
  return current === ancestor ? parts.join(' > ') : '';
}

function repeatedRootSelector(element: HTMLElement): { selector: string; root: HTMLElement; count: number } | null {
  let root: HTMLElement | null = element;
  for (let depth = 0; root && root.parentElement && depth < 5; depth += 1) {
    const currentRoot: HTMLElement = root;
    const parentElement: HTMLElement | null = currentRoot.parentElement;
    if (!parentElement) break;
    const tag = currentRoot.tagName.toLowerCase();
    const currentTagName = currentRoot.tagName;
    const sameTag = Array.from(parentElement.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === currentTagName);
    if (sameTag.length >= 2) {
      const classes = Array.from(currentRoot.classList)
        .filter((className) => sameTag.filter((sibling) => sibling.classList.contains(className)).length >= 2)
        .slice(0, 3);
      const classSelector = classes.map((className) => `.${escapeSelector(className)}`).join('');
      const parentSelector = uniqueSelector(parentElement);
      const selector = `${parentSelector} > ${tag}${classSelector}`;
      try {
        const count = document.querySelectorAll(selector).length;
        if (count >= 2 && count <= 80) return { selector, root: currentRoot, count };
      } catch {
        // Try the next ancestor.
      }
    }
    root = parentElement;
  }
  return null;
}

function similarSelectorFor(element: HTMLElement): { selector: string; count: number } | null {
  const repeated = repeatedRootSelector(element);
  if (!repeated) return null;
  const path = relativePath(repeated.root, element);
  const selector = path ? `${repeated.selector} > ${path}` : repeated.selector;
  try {
    const count = document.querySelectorAll(selector).length;
    return count >= 2 && count <= 80 ? { selector, count } : null;
  } catch {
    return null;
  }
}

function selectionPayload(element: HTMLElement) {
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const textEditable = element.childElementCount === 0 && !['IMG', 'INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'CANVAS', 'SVG'].includes(element.tagName);
  const similar = similarSelectorFor(element);
  return {
    selector: uniqueSelector(element),
    similarSelector: similar?.selector || null,
    similarCount: similar?.count || 0,
    tag: element.tagName.toLowerCase(),
    label: element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim().slice(0, 70) || element.tagName.toLowerCase(),
    text: textEditable ? element.textContent || '' : null,
    textEditable,
    href: element instanceof HTMLAnchorElement ? element.getAttribute('href') || '' : null,
    src: element instanceof HTMLImageElement ? element.currentSrc || element.getAttribute('src') || '' : null,
    alt: element instanceof HTMLImageElement ? element.getAttribute('alt') || '' : null,
    isImage: element instanceof HTMLImageElement,
    isLink: element instanceof HTMLAnchorElement,
    isIcon: Boolean(element.querySelector('svg')) || Boolean(element.closest('svg')),
    computed: {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      backgroundSize: computed.backgroundSize,
      backgroundPosition: computed.backgroundPosition,
      backgroundRepeat: computed.backgroundRepeat,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign as VisualCmsStylePatch['textAlign'],
      borderColor: computed.borderColor,
      borderWidth: computed.borderWidth,
      borderRadius: computed.borderRadius,
      padding: computed.padding,
      margin: computed.margin,
      width: `${Math.round(rect.width)}px`,
      maxWidth: computed.maxWidth,
      height: `${Math.round(rect.height)}px`,
      minHeight: computed.minHeight,
      gap: computed.gap,
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      objectFit: computed.objectFit as VisualCmsStylePatch['objectFit'],
      objectPosition: computed.objectPosition,
      transform: computed.transform === 'none' ? 'scale(1)' : computed.transform,
      transformOrigin: computed.transformOrigin,
    },
  };
}

function runtimeOnlyMutation(mutation: MutationRecord): boolean {
  if (consumeRuntimeMutation(mutation.target)) return true;
  const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  return nodes.length > 0 && nodes.every((node) => node instanceof HTMLElement && node.hasAttribute(RUNTIME_ICON_ATTR));
}

function elementsForSelector(selector: string): HTMLElement[] {
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => !BLOCKED_TAGS.has(element.tagName));
  } catch {
    return [];
  }
}

export default function VisualCmsRuntime() {
  const pathname = usePathname() || '/';
  const stored = useSiteContent('visual-overrides');
  const content = useMemo(() => normalizeVisualCmsOverrides(stored), [stored]);
  const snapshotsRef = useRef<Map<HTMLElement, Snapshot>>(new Map());
  const selectedRef = useRef<HTMLElement | null>(null);
  const [domEpoch, setDomEpoch] = useState(0);

  useEffect(() => {
    let frame = 0;
    const invalidate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setDomEpoch((value) => value + 1));
    };
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList' && !runtimeOnlyMutation(mutation) && (mutation.addedNodes.length || mutation.removedNodes.length))) invalidate();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', invalidate, { passive: true });
    window.addEventListener('orientationchange', invalidate);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('orientationchange', invalidate);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const snapshots = snapshotsRef.current;
    for (const snapshot of snapshots.values()) restoreSnapshot(snapshot);
    snapshots.clear();

    ensureStableCmsIds();
    const currentRoute = routeKey(pathname);
    const layers = [content.pages[VISUAL_CMS_GLOBAL_ROUTE], content.pages[currentRoute]].filter(Boolean);
    if (!layers.length) return;
    const device = deviceForWidth(window.innerWidth);

    for (const layer of layers) {
      const resolved = Object.values(layer!.elements)
        .map((override) => ({ override, elements: elementsForSelector(override.selector) }))
        .filter((entry) => entry.elements.length > 0)
        .sort((a, b) => b.elements.length - a.elements.length);

      for (const { override, elements } of resolved) {
        for (const element of elements) {
          if (!snapshots.has(element)) snapshots.set(element, snapshotElement(element));
          applyOverride(element, override, device);
        }
      }
    }

    return () => {
      for (const snapshot of snapshots.values()) restoreSnapshot(snapshot);
      snapshots.clear();
    };
  }, [content, pathname, domEpoch]);

  useEffect(() => {
    let preview = false;
    try { preview = new URLSearchParams(window.location.search).get(EDITOR_PARAM) === '1'; } catch { /* noop */ }
    if (!preview || window.parent === window) return;

    ensureStableCmsIds();

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

    const resolveElement = (target: EventTarget | null): HTMLElement | null => {
      if (target instanceof HTMLElement) return target;
      if (target instanceof SVGElement) {
        const svg = target.closest('svg');
        return svg?.parentElement || target.parentElement;
      }
      return null;
    };

    const click = (event: MouseEvent) => {
      if (didDrag) {
        didDrag = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const element = resolveElement(event.target);
      if (!element || BLOCKED_TAGS.has(element.tagName) || element.closest('[data-cms-editor-ignore]')) return;
      event.preventDefault();
      event.stopPropagation();
      ensureStableCmsIds();
      mark(element);
      window.parent.postMessage({
        type: 'cms:visual-select',
        route: routeKey(pathname),
        element: selectionPayload(element),
      }, window.location.origin);
    };

    const hover = (event: MouseEvent) => {
      const element = resolveElement(event.target);
      if (!element || BLOCKED_TAGS.has(element.tagName) || element.closest('[data-cms-editor-ignore]')) return;
      element.style.setProperty('cursor', 'crosshair', 'important');
    };

    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let didDrag = false;
    let imageDrag: { pointerId: number; element: HTMLImageElement; startX: number; startY: number; originX: number; originY: number } | null = null;
    const imagePosition = (element: HTMLImageElement) => {
      const match = window.getComputedStyle(element).objectPosition.match(/([\d.]+)%\s+([\d.]+)%/);
      return { x: match ? Number(match[1]) : 50, y: match ? Number(match[2]) : 50 };
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !event.isPrimary) return;
      const selected = selectedRef.current;
      if (!(selected instanceof HTMLImageElement) || event.target !== selected) return;
      const origin = imagePosition(selected);
      imageDrag = { pointerId: event.pointerId, element: selected, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y };
      selected.setPointerCapture?.(event.pointerId);
      selected.style.setProperty('touch-action', 'none', 'important');
      selected.style.setProperty('cursor', 'move', 'important');
    };
    const pointerMove = (event: PointerEvent) => {
      if (!imageDrag || event.pointerId !== imageDrag.pointerId || pinchStartDistance) return;
      const rect = imageDrag.element.getBoundingClientRect();
      const dx = event.clientX - imageDrag.startX;
      const dy = event.clientY - imageDrag.startY;
      if (Math.abs(dx) + Math.abs(dy) < 3) return;
      event.preventDefault();
      didDrag = true;
      const x = Math.min(100, Math.max(0, imageDrag.originX + dx / Math.max(1, rect.width) * 100));
      const y = Math.min(100, Math.max(0, imageDrag.originY + dy / Math.max(1, rect.height) * 100));
      window.parent.postMessage({ type: 'cms:visual-image-position', selector: uniqueSelector(imageDrag.element), x, y }, window.location.origin);
    };
    const pointerUp = (event: PointerEvent) => {
      if (!imageDrag || event.pointerId !== imageDrag.pointerId) return;
      imageDrag.element.releasePointerCapture?.(event.pointerId);
      imageDrag = null;
    };
    const distance = (touches: TouchList) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
    const scaleFrom = (value: string) => {
      const matrix = value.match(/^matrix\(([^)]+)\)$/);
      if (matrix) return Number.parseFloat(matrix[1].split(',')[0]) || 1;
      const match = value.match(/scale\(([-\d.]+)\)/);
      return match ? Number.parseFloat(match[1]) || 1 : 1;
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !selectedRef.current) return;
      imageDrag = null;
      pinchStartDistance = Math.max(1, distance(event.touches));
      pinchStartScale = scaleFrom(window.getComputedStyle(selectedRef.current).transform);
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !selectedRef.current || !pinchStartDistance) return;
      event.preventDefault();
      const scale = Math.min(3, Math.max(0.35, pinchStartScale * distance(event.touches) / pinchStartDistance));
      window.parent.postMessage({ type: 'cms:visual-pinch', selector: uniqueSelector(selectedRef.current), scale: Number(scale.toFixed(3)) }, window.location.origin);
    };
    const touchEnd = () => { pinchStartDistance = 0; };

    document.addEventListener('click', click, true);
    document.addEventListener('mouseover', hover, true);
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('pointermove', pointerMove, { capture: true, passive: false });
    document.addEventListener('pointerup', pointerUp, true);
    document.addEventListener('pointercancel', pointerUp, true);
    document.addEventListener('touchstart', touchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    document.addEventListener('touchend', touchEnd, true);
    window.parent.postMessage({ type: 'cms:visual-ready', route: routeKey(pathname) }, window.location.origin);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('mouseover', hover, true);
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('pointermove', pointerMove, true);
      document.removeEventListener('pointerup', pointerUp, true);
      document.removeEventListener('pointercancel', pointerUp, true);
      document.removeEventListener('touchstart', touchStart, true);
      document.removeEventListener('touchmove', touchMove, true);
      document.removeEventListener('touchend', touchEnd, true);
      mark(null);
    };
  }, [pathname, domEpoch]);

  return null;
}
