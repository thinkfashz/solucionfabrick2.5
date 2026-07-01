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

/**
 * Sentry pulls OpenTelemetry instrumentation packages for server tracing. Those
 * packages intentionally use dynamic require/import patterns that webpack cannot
 * statically analyse, so Vercel prints noisy "Critical dependency" warnings even
 * though the build is valid. Keep the warnings suppressed only for this known
 * dependency chain so real app warnings still surface.
 */
function isKnownSentryInstrumentationWarning(warning = {}) {
  const message = String(warning.message || warning.details || '');
  const moduleName = String(
    warning.module?.resource ||
    (typeof warning.module?.identifier === 'function' ? warning.module.identifier() : '') ||
    warning.file ||
    '',
  );

  return /Critical dependency/i.test(message) && (
    /@opentelemetry[\\/]instrumentation/.test(moduleName) ||
    /require-in-the-middle/.test(moduleName) ||
    /@sentry[\\/]node/.test(moduleName)
  );
}

const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  // Vercel was failing with OOM after compilation while running the full lint
  // phase. Keep lint available through `pnpm lint`, but do not run it inside
  // `next build` so production deploys finish within the build container RAM.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep TypeScript as a hard gate. If Vercel still runs out of memory, switch
  // this to true only as a temporary emergency workaround.
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
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
    const existingIgnoredWarnings = Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : [];
    config.ignoreWarnings = [
      ...existingIgnoredWarnings,
      isKnownSentryInstrumentationWarning,
    ];

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
  // Keep Sentry quiet and light during Vercel builds. Source-map upload can be
  // re-enabled later when production is stable and SENTRY_AUTH_TOKEN is present.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: false,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  sourcemaps: {
    disable: true,
  },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
