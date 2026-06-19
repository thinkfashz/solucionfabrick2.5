import { withSentryConfig } from '@sentry/nextjs';

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

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  // Tree-shake bigger ecosystems (lucide-react ships hundreds of icons,
  // recharts pulls a heavy d3 graph) so admin bundles only ship what's used.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'date-fns'],
  },
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
    '@insforge/sdk',
    'isomorphic-dompurify',
    'jsdom',
    '@asamuzakjp/css-color',
    '@csstools/css-calc',
    '@csstools/css-color-parser',
    '@csstools/css-parser-algorithms',
    '@csstools/css-tokenizer',
    '@csstools/color-helpers',
    'playwright',
    '@playwright/test',
    'playwright-core',
    'chromium-bidi',
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      // Playwright and its native sub-packages must never be bundled by webpack.
      // pnpm's virtual-store paths make serverExternalPackages unreliable for
      // transitive deps, so we add an explicit externals function as a backstop.
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [
        ...existing,
        /** @param {{ request?: string }} ctx @param {Function} cb */
        ({ request }, cb) => {
          const pwPkgs = ['playwright', 'playwright-core', '@playwright/test', 'chromium-bidi'];
          if (request && pwPkgs.some((p) => request === p || request.startsWith(p + '/'))) {
            return cb(null, `commonjs ${request}`);
          }
          return cb();
        },
      ];
    }
    return config;
  },
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

const sentryOptions = {
  // Only print logs for uploading source maps in CI / Vercel builds.
  silent: !process.env.CI,
  // Sentry org/project + auth token are read from env (SENTRY_ORG, SENTRY_PROJECT,
  // SENTRY_AUTH_TOKEN). When not configured, avoid release/source-map work entirely.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Uploading a wider source-map set makes builds slower; only do it when Sentry is configured.
  widenClientFileUpload: true,
  // Route browser SDK requests through this Next.js path to bypass ad-blockers.
  tunnelRoute: '/monitoring',
  // Hide Sentry-injected source map comments from the generated client bundles.
  hideSourceMaps: true,
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
};

export default hasSentryAuthToken ? withSentryConfig(nextConfig, sentryOptions) : nextConfig;
