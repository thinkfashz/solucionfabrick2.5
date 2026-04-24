/**
 * Content-Security-Policy builder for Soluciones Fabrick.
 *
 * Strategy: nonce-based CSP backed by an explicit host allowlist. No
 * `'unsafe-inline'` or `'unsafe-eval'` for scripts. The middleware generates a
 * fresh nonce per navigation request and propagates it via the `x-nonce`
 * request header so that inline server-rendered `<script>` tags (currently
 * only JSON-LD) can opt-in.
 *
 * Trusted third-party origins are allowlisted explicitly:
 *  - Cloudflare Turnstile (bot protection on /contacto)
 *  - MercadoPago (checkout widget)
 *  - Vercel Analytics + Insights
 *  - InsForge backend (connect-src only)
 *  - Google Fonts (stylesheet + woff/woff2)
 *
 * We intentionally do NOT use `'strict-dynamic'`: it forces every script to be
 * gated by a nonce that matches the per-request value, but Next.js bakes nonces
 * into the HTML of statically prerendered routes at build time. Those
 * build-time nonces never match what middleware emits at request time, so
 * under `'strict-dynamic'` every `/_next/static/chunks/*.js` on an SSG route
 * would be blocked and the page would never hydrate. Instead we rely on
 * `'self'` for same-origin Next.js chunks, the nonce for inline JSON-LD, and
 * the explicit host allowlist for trusted third parties.
 */

export interface CspBuildOptions {
  nonce: string;
  isDev?: boolean;
}

const INSFORGE_HOSTS = ['https://*.insforge.app'];
const CLOUDFLARE_HOSTS = ['https://challenges.cloudflare.com'];
const MERCADOPAGO_HOSTS = [
  'https://*.mercadopago.com',
  'https://*.mercadolibre.com',
  'https://http2.mlstatic.com',
];
const VERCEL_HOSTS = [
  'https://vitals.vercel-insights.com',
  'https://va.vercel-scripts.com',
];
const GOOGLE_FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

/**
 * Build the CSP header value for a navigation response.
 *
 * @param nonce random per-request nonce; must be ≥ 128 bits of entropy base64-encoded.
 * @param isDev when true, allows `'unsafe-eval'` for scripts (Next.js dev HMR) and localhost ws:.
 */
export function buildCsp({ nonce, isDev = false }: CspBuildOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Trusted third-party script origins. Enforced directly (no `'strict-dynamic'`).
    ...CLOUDFLARE_HOSTS,
    ...MERCADOPAGO_HOSTS,
    ...VERCEL_HOSTS,
    // Needed by Next.js bootstrap + HMR in development.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const styleSrc = [
    "'self'",
    // Tailwind-generated inline styles and any CSS-in-JS utility that relies on
    // style attributes — browsers treat inline `style=""` attributes under
    // style-src-attr. We allow inline styles defensively; this does NOT weaken
    // script protection which is the primary XSS risk.
    "'unsafe-inline'",
    ...GOOGLE_FONT_HOSTS,
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https:', // images may come from product catalog CDNs managed by InsForge
  ];

  const fontSrc = ["'self'", 'data:', ...GOOGLE_FONT_HOSTS];

  const connectSrc = [
    "'self'",
    ...INSFORGE_HOSTS,
    ...VERCEL_HOSTS,
    ...MERCADOPAGO_HOSTS,
    'https://api.mercadopago.com',
    // Cloudflare Turnstile siteverify happens server-side, but the client SDK
    // communicates with challenges.cloudflare.com over fetch.
    ...CLOUDFLARE_HOSTS,
    // Dev-only WebSocket for Next.js HMR.
    ...(isDev ? ['ws:', 'wss:', 'http://localhost:*'] : []),
  ];

  const frameSrc = ["'self'", ...CLOUDFLARE_HOSTS, ...MERCADOPAGO_HOSTS];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'img-src': imgSrc,
    'font-src': fontSrc,
    'connect-src': connectSrc,
    'frame-src': frameSrc,
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'data:', 'blob:'],
  };

  const parts = Object.entries(directives).map(([key, values]) => `${key} ${values.join(' ')}`);
  // upgrade-insecure-requests is a standalone directive without values.
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/**
 * Generate a CSP nonce. Uses the global Web Crypto API (available in both
 * Edge and Node runtimes in Next.js).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16); // 128 bits
  crypto.getRandomValues(bytes);
  // base64 encode without padding (Edge runtime lacks Buffer.from for some paths).
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, '');
}
