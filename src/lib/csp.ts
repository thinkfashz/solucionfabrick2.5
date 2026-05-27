/**
 * Content-Security-Policy builder for Soluciones Fabrick.
 *
 * Strategy: nonce-based CSP backed by an explicit host allowlist. No
 * `'unsafe-inline'` or `'unsafe-eval'` for scripts. The middleware generates a
 * fresh nonce per navigation request and propagates it via the `x-nonce`
 * request header so that inline server-rendered `<script>` tags (currently
 * only JSON-LD) can opt-in.
 */

export interface CspBuildOptions {
  nonce: string;
  isDev?: boolean;
}

const INSFORGE_HOSTS = ['https://*.insforge.app'];
const CLOUDFLARE_HOSTS = ['https://challenges.cloudflare.com'];
const CLOUDINARY_HOSTS = [
  'https://api.cloudinary.com',
  'https://res.cloudinary.com',
  'https://*.cloudinary.com',
];
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
    ...CLOUDFLARE_HOSTS,
    ...MERCADOPAGO_HOSTS,
    ...VERCEL_HOSTS,
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    ...GOOGLE_FONT_HOSTS,
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ];

  const fontSrc = ["'self'", 'data:', ...GOOGLE_FONT_HOSTS];

  const connectSrc = [
    "'self'",
    ...INSFORGE_HOSTS,
    ...CLOUDINARY_HOSTS,
    ...VERCEL_HOSTS,
    ...MERCADOPAGO_HOSTS,
    'https://api.mercadopago.com',
    ...CLOUDFLARE_HOSTS,
    ...(isDev ? ['ws:', 'wss:', 'http://localhost:*'] : []),
  ];

  const frameSrc = [
    "'self'",
    ...CLOUDFLARE_HOSTS,
    ...MERCADOPAGO_HOSTS,
    'https://www.openstreetmap.org',
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'img-src': imgSrc,
    'font-src': fontSrc,
    'connect-src': connectSrc,
    'frame-src': frameSrc,
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'data:', 'blob:', ...CLOUDINARY_HOSTS],
  };

  const parts = Object.entries(directives).map(([key, values]) => `${key} ${values.join(' ')}`);
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/**
 * Generate a CSP nonce. Uses the global Web Crypto API (available in both
 * Edge and Node runtimes in Next.js).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, '');
}
