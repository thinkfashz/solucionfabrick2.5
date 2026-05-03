import 'server-only';

/**
 * Reference catalog of extensions surfaced by the marketplace UI.
 * Real entries get materialised into `app_extensions` on install.
 * Each entry has a `manifest.hooks` array describing which events it
 * subscribes to and how (URL or `internal:<name>`).
 */

export interface ExtensionManifestHook {
  hook: string;
  handler: string;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface ExtensionCatalogEntry {
  slug: string;
  name: string;
  description: string;
  type: 'snippet' | 'webhook' | 'oauth' | 'function';
  author: string;
  version: string;
  manifest: { hooks: ExtensionManifestHook[] };
}

export const EXTENSION_CATALOG: ExtensionCatalogEntry[] = [
  {
    slug: 'klaviyo',
    name: 'Klaviyo',
    description: 'Sincroniza clientes y pedidos para email marketing avanzado.',
    type: 'oauth',
    author: 'Comunidad',
    version: '0.1.0',
    manifest: {
      hooks: [
        { hook: 'order.paid', handler: 'https://example.com/klaviyo/order' },
        { hook: 'customer.signup', handler: 'https://example.com/klaviyo/customer' },
      ],
    },
  },
  {
    slug: 'discount-bar',
    name: 'Barra de descuentos',
    description: 'Inyecta una barra superior con cuentas regresivas y cupones.',
    type: 'snippet',
    author: 'Fabrick',
    version: '1.0.0',
    manifest: { hooks: [] },
  },
  {
    slug: 'shipday-webhook',
    name: 'Shipday · Webhook',
    description: 'Envía pedidos confirmados a Shipday para asignación de driver.',
    type: 'webhook',
    author: 'Comunidad',
    version: '0.2.0',
    manifest: {
      hooks: [{ hook: 'order.paid', handler: 'https://api.shipday.com/orders' }],
    },
  },
  {
    slug: 'tax-engine',
    name: 'Motor de impuestos',
    description: 'Calcula impuestos en checkout vía función sandboxed.',
    type: 'function',
    author: 'Fabrick Labs',
    version: '0.0.1-alpha',
    manifest: { hooks: [{ hook: 'checkout.before_pay', handler: 'internal:tax-engine' }] },
  },
];

export function getExtensionFromCatalog(slug: string): ExtensionCatalogEntry | null {
  return EXTENSION_CATALOG.find((e) => e.slug === slug) ?? null;
}
