import type { Metadata, Viewport } from 'next';

/**
 * Layout for `/editor`.
 *
 * The 3D editor takes the full viewport; we override the global viewport
 * settings so:
 *   • `maximumScale: 1` disables iOS double-tap-to-zoom (which would
 *     fire on quick taps during tool use)
 *   • `viewportFit: 'cover'` lets us draw under the iOS notch / home bar
 *     and use `env(safe-area-inset-*)` paddings.
 *
 * `force-dynamic` is needed at the route segment so the per-request CSP
 * nonce emitted by `middleware.ts` reaches the framework's RSC bootstrap
 * scripts. Static prerenders bake a build-time nonce that never matches
 * runtime — see `src/lib/csp.ts`.
 */
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'Editor 3D · Soluciones Fabrick',
  description:
    'Editor arquitectónico 3D de Soluciones Fabrick — diseña casas, fachadas y proyectos directamente en el navegador (WebGPU con respaldo a WebGL2).',
  openGraph: {
    title: 'Editor 3D · Soluciones Fabrick',
    description:
      'Editor arquitectónico 3D para diseñar y previsualizar proyectos de construcción y remodelación.',
    images: ['/logo-soluciones-fabrick.svg'],
    type: 'website',
  },
  robots: { index: false, follow: false },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
