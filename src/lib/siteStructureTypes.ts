/**
 * Universal CMS — section schemas + defaults.
 *
 * Each `section_key` row in the `site_structure` table stores a JSON blob
 * matching one of the interfaces below. The defaults exported from this file
 * are used as a fallback when:
 *   - the row does not exist yet (fresh DB, migration in flight),
 *   - the row's `content` is malformed,
 *   - or a public client renders before the SiteConfig provider has hydrated.
 *
 * Keep this file tiny and dependency-free so it can be imported from both
 * server components and client components.
 */

export const SECTION_KEYS = [
  'global-styles',
  'nav-menu',
  'footer',
  'checkout',
  'producto',
  'error-404',
  'custom-injection',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && (SECTION_KEYS as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalStylesContent {
  /** CSS color tokens exposed as CSS variables on :root. */
  colors: {
    accent: string;
    accentSoft: string;
    background: string;
    foreground: string;
  };
  /** Optional Google Fonts family name (e.g. "Inter"). */
  fontFamily?: string;
}

export interface NavLinkItem {
  label: string;
  href: string;
  badge?: string;
}

export interface NavMenuContent {
  brand: { label: string; logoUrl?: string };
  links: NavLinkItem[];
  cta: { label: string; href: string };
}

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterContent {
  tagline: string;
  legal: string;
  columns: FooterColumn[];
  social: { label: string; href: string }[];
}

export interface CheckoutStep {
  id: string;
  title: string;
  description: string;
}

export interface CheckoutPolicy {
  title: string;
  body: string;
}

export interface CheckoutContent {
  steps: CheckoutStep[];
  warrantyPolicies: CheckoutPolicy[];
  successMessages: {
    approved: string;
    pending: string;
    rejected: string;
  };
  legalNote: string;
}

export interface ProductTrustBadge {
  label: string;
  description: string;
}

export interface ProductContent {
  addToCartLabel: string;
  outOfStockLabel: string;
  shippingNote: string;
  relatedProductsHeading: string;
  trustBadges: ProductTrustBadge[];
}

export interface Error404Content {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface CustomInjectionContent {
  enabled: boolean;
  head: { html: string };
  bodyEnd: { html: string; js: string };
  css: string;
}

// Discriminated map.
export interface SectionContentMap {
  'global-styles': GlobalStylesContent;
  'nav-menu': NavMenuContent;
  footer: FooterContent;
  checkout: CheckoutContent;
  producto: ProductContent;
  'error-404': Error404Content;
  'custom-injection': CustomInjectionContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
//   These mirror the literal copy currently rendered by each component, so
//   that an empty `site_structure` table behaves identically to the
//   pre-CMS build. Editing the defaults is a code change; admins edit
//   their override through `/admin/editor`.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GLOBAL_STYLES: GlobalStylesContent = {
  colors: {
    accent: '#facc15',
    accentSoft: 'rgba(250, 204, 21, 0.18)',
    background: '#000000',
    foreground: '#ffffff',
  },
};

export const DEFAULT_NAV_MENU: NavMenuContent = {
  brand: { label: 'Soluciones Fabrick' },
  links: [
    { label: 'Servicios', href: '/servicios' },
    { label: 'Evolución', href: '/evolucion' },
    { label: 'Soluciones', href: '/soluciones' },
    { label: 'Tienda', href: '/tienda' },
    { label: 'Presupuesto', href: '/presupuesto' },
    { label: 'Proyectos', href: '/proyectos' },
    { label: 'Contacto', href: '/contacto' },
  ],
  cta: { label: 'Comienza tu proyecto', href: '/contacto' },
};

export const DEFAULT_FOOTER: FooterContent = {
  tagline: 'Soluciones Integrales para el Hogar Moderno.',
  legal: '© Soluciones Fabrick · Todos los derechos reservados',
  columns: [],
  social: [],
};

export const DEFAULT_CHECKOUT: CheckoutContent = {
  steps: [
    { id: 'datos', title: 'Datos', description: 'Tus datos de contacto y dirección de despacho.' },
    { id: 'envio', title: 'Envío', description: 'Elige cómo recibes tu pedido.' },
    { id: 'pago', title: 'Pago', description: 'Confirma de forma segura con Mercado Pago.' },
  ],
  warrantyPolicies: [
    {
      title: 'Garantía de calidad',
      body: 'Todos nuestros productos cuentan con respaldo del fabricante y revisión Fabrick.',
    },
    {
      title: 'Despacho asegurado',
      body: 'Entregamos en la Región del Maule y zonas aledañas. Coordinamos contigo el horario.',
    },
    {
      title: 'Pago protegido',
      body: 'Las transacciones se procesan a través de Mercado Pago con cifrado bancario.',
    },
  ],
  successMessages: {
    approved: '¡Pago aprobado! Estamos preparando tu pedido.',
    pending: 'Tu pago está en revisión. Te avisaremos por correo cuando se acredite.',
    rejected: 'No pudimos procesar el pago. Verifica los datos e intenta nuevamente.',
  },
  legalNote:
    'Al confirmar aceptas las políticas de despacho y devolución de Soluciones Fabrick.',
};

export const DEFAULT_PRODUCTO: ProductContent = {
  addToCartLabel: 'Añadir al Carrito',
  outOfStockLabel: 'Sin stock',
  shippingNote: 'Coordinamos despacho a todo el Maule y zonas aledañas.',
  relatedProductsHeading: 'Productos relacionados',
  trustBadges: [
    { label: 'Despacho coordinado', description: 'Te llamamos para coordinar la entrega.' },
    { label: 'Pago seguro', description: 'Procesamos con Mercado Pago.' },
  ],
};

export const DEFAULT_ERROR_404: Error404Content = {
  title: 'Pagina no encontrada',
  subtitle:
    'La ruta que buscas no existe o fue movida. Vuelve al inicio para seguir navegando en Fabrick.',
  imageUrl: '',
  ctaLabel: 'Volver al inicio',
  ctaHref: '/',
};

export const DEFAULT_CUSTOM_INJECTION: CustomInjectionContent = {
  enabled: false,
  head: { html: '' },
  bodyEnd: { html: '', js: '' },
  css: '',
};

export const SECTION_DEFAULTS: SectionContentMap = {
  'global-styles': DEFAULT_GLOBAL_STYLES,
  'nav-menu': DEFAULT_NAV_MENU,
  footer: DEFAULT_FOOTER,
  checkout: DEFAULT_CHECKOUT,
  producto: DEFAULT_PRODUCTO,
  'error-404': DEFAULT_ERROR_404,
  'custom-injection': DEFAULT_CUSTOM_INJECTION,
};

/**
 * Merge a partial JSON blob from the database into the typed default. Performs
 * a one-level shallow merge plus a second level for nested objects we care
 * about (so partial admin saves don't blow away unrelated fields). Unknown
 * keys are dropped silently.
 */
export function mergeWithDefault<K extends SectionKey>(
  key: K,
  raw: unknown,
): SectionContentMap[K] {
  const def = SECTION_DEFAULTS[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
  const result: Record<string, unknown> = { ...(def as unknown as Record<string, unknown>) };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!(k in result)) continue; // drop unknown keys
    const defValue = result[k];
    if (
      defValue &&
      typeof defValue === 'object' &&
      !Array.isArray(defValue) &&
      v &&
      typeof v === 'object' &&
      !Array.isArray(v)
    ) {
      result[k] = { ...(defValue as Record<string, unknown>), ...(v as Record<string, unknown>) };
    } else {
      result[k] = v;
    }
  }
  return result as unknown as SectionContentMap[K];
}

/** Public paths to invalidate when a given section changes. */
export function pathsForSection(key: SectionKey): string[] {
  switch (key) {
    case 'checkout':
      return ['/checkout'];
    case 'error-404':
      return ['/404-preview'];
    case 'producto':
      return ['/producto', '/tienda'];
    // nav-menu, footer, global-styles, custom-injection affect every page.
    default:
      return ['/'];
  }
}
