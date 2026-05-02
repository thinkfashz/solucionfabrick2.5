/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Note: the Content-Security-Policy and X-Frame-Options equivalents
  // (`frame-ancestors 'none'`) are emitted per-request by middleware.ts so that
  // each navigation gets a fresh nonce for inline JSON-LD scripts.
];

const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  // The pascal-editor packages ship modern ESM that imports `three` and other
  // ESM-only deps. Transpile them through Next so SSR / RSC builds don't choke.
  transpilePackages: ['@pascal-app/core', '@pascal-app/viewer', 'three'],
  // jsdom (pulled in by isomorphic-dompurify, used to sanitise rendered Markdown
  // in admin/blog routes) transitively depends on @asamuzakjp/css-color, which
  // is published as CommonJS but `require()`s the ESM-only @csstools/css-calc
  // build. When Next bundles this for the serverless target on Vercel, the
  // resulting `require()` of an .mjs file throws ERR_REQUIRE_ESM at runtime
  // (turning /api/admin/blog into an HTML 500). Marking these as external
  // server packages tells Next to leave them as runtime imports so Node's
  // native loader resolves the ESM↔CJS boundary correctly.
  serverExternalPackages: [
    'isomorphic-dompurify',
    'jsdom',
    '@asamuzakjp/css-color',
    '@csstools/css-calc',
    '@csstools/css-color-parser',
    '@csstools/css-parser-algorithms',
    '@csstools/css-tokenizer',
    '@csstools/color-helpers',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Service worker must be served with a no-cache policy so updates ship fast
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

export default nextConfig;
