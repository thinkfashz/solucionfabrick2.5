export type VisualCmsDevice = 'desktop' | 'tablet' | 'mobile';
export const VISUAL_CMS_GLOBAL_ROUTE = '*';

export interface VisualCmsStylePatch {
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  padding?: string;
  margin?: string;
  width?: string;
  minHeight?: string;
  opacity?: string;
  boxShadow?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export interface VisualCmsElementOverride {
  selector: string;
  label?: string;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  hidden?: boolean;
  styles?: Partial<Record<VisualCmsDevice | 'all', VisualCmsStylePatch>>;
}

export interface VisualCmsPageOverride {
  route: string;
  label?: string;
  elements: Record<string, VisualCmsElementOverride>;
}

export interface VisualCmsOverridesContent {
  schemaVersion: 1;
  pages: Record<string, VisualCmsPageOverride>;
}

export const DEFAULT_VISUAL_CMS_OVERRIDES: VisualCmsOverridesContent = {
  schemaVersion: 1,
  pages: {},
};

export function normalizeVisualCmsOverrides(value: unknown): VisualCmsOverridesContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_VISUAL_CMS_OVERRIDES;
  const raw = value as Partial<VisualCmsOverridesContent>;
  const pagesInput = raw.pages && typeof raw.pages === 'object' && !Array.isArray(raw.pages) ? raw.pages : {};
  const pages: Record<string, VisualCmsPageOverride> = {};

  for (const [routeEntry, pageRaw] of Object.entries(pagesInput)) {
    if (!pageRaw || typeof pageRaw !== 'object' || Array.isArray(pageRaw)) continue;
    const page = pageRaw as Partial<VisualCmsPageOverride>;
    const route = routeKey(typeof page.route === 'string' && page.route.trim() ? page.route.trim() : routeEntry);
    const elementsInput = page.elements && typeof page.elements === 'object' && !Array.isArray(page.elements) ? page.elements : {};
    const elements: Record<string, VisualCmsElementOverride> = {};

    for (const [selectorKey, elementRaw] of Object.entries(elementsInput)) {
      if (!elementRaw || typeof elementRaw !== 'object' || Array.isArray(elementRaw)) continue;
      const element = elementRaw as Partial<VisualCmsElementOverride>;
      const selector = typeof element.selector === 'string' && element.selector.trim() ? element.selector.trim() : selectorKey;
      if (!selector) continue;
      elements[selector] = {
        selector,
        ...(typeof element.label === 'string' ? { label: element.label } : {}),
        ...(typeof element.text === 'string' ? { text: element.text } : {}),
        ...(typeof element.href === 'string' ? { href: element.href } : {}),
        ...(typeof element.src === 'string' ? { src: element.src } : {}),
        ...(typeof element.alt === 'string' ? { alt: element.alt } : {}),
        ...(typeof element.hidden === 'boolean' ? { hidden: element.hidden } : {}),
        ...(element.styles && typeof element.styles === 'object' && !Array.isArray(element.styles) ? { styles: element.styles } : {}),
      };
    }

    pages[route] = {
      route,
      ...(typeof page.label === 'string' ? { label: page.label } : {}),
      elements,
    };
  }

  return { schemaVersion: 1, pages };
}

export function routeKey(pathname: string): string {
  const raw = String(pathname || '').trim();
  if (raw === VISUAL_CMS_GLOBAL_ROUTE) return VISUAL_CMS_GLOBAL_ROUTE;
  const clean = raw.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function upsertVisualElement(
  content: VisualCmsOverridesContent,
  route: string,
  selector: string,
  patch: Partial<VisualCmsElementOverride>,
): VisualCmsOverridesContent {
  const normalized = normalizeVisualCmsOverrides(content);
  const key = routeKey(route);
  const page = normalized.pages[key] || { route: key, elements: {} };
  const current = page.elements[selector] || { selector };
  return {
    ...normalized,
    pages: {
      ...normalized.pages,
      [key]: {
        ...page,
        route: key,
        elements: {
          ...page.elements,
          [selector]: {
            ...current,
            ...patch,
            selector,
            styles: patch.styles ? { ...(current.styles || {}), ...patch.styles } : current.styles,
          },
        },
      },
    },
  };
}

export function removeVisualElement(
  content: VisualCmsOverridesContent,
  route: string,
  selector: string,
): VisualCmsOverridesContent {
  const normalized = normalizeVisualCmsOverrides(content);
  const key = routeKey(route);
  const page = normalized.pages[key];
  if (!page?.elements[selector]) return normalized;
  const elements = { ...page.elements };
  delete elements[selector];
  const pages = { ...normalized.pages };
  if (Object.keys(elements).length === 0) delete pages[key];
  else pages[key] = { ...page, elements };
  return { ...normalized, pages };
}
