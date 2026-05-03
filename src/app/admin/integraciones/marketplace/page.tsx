import type { Metadata } from 'next';
import MarketplaceClient from './MarketplaceClient';

export const metadata: Metadata = {
  title: 'Marketplace de extensiones · Admin Fabrick',
  robots: { index: false, follow: false },
};

/**
 * /admin/integraciones/marketplace — App store estilo Shopify Apps.
 *
 * Modelo (ver scripts/create-tables.sql):
 *  - public.app_extensions (slug, name, version, status, manifest)
 *  - public.extension_hooks (extension_id, hook, handler, enabled)
 *
 * Tipos de extensión soportados:
 *   1. Snippets de código (HTML/CSS/JS) en scope global/checkout/producto
 *   2. Webhooks salientes firmados HMAC
 *   3. Webhooks entrantes /api/extensions/[slug]
 *   4. OAuth-based apps (token persistido en `integrations`)
 *   5. Functions sandboxed (fase 2)
 *
 * Esta primera entrega es el andamiaje: cards visuales del catálogo +
 * "Mis extensiones" + explicación de cómo funcionan los hooks.
 */
export default function AdminMarketplacePage() {
  return <MarketplaceClient />;
}
