export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './tenant-public-theme.css';
import './responsive-safety.css';
import './remove-obsolete-sections.css';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import SmoothScrollProvider from '@/components/SmoothScrollProvider';
import SplashScreen from '@/components/SplashScreen';

import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { QuoteCartProvider } from '@/context/QuoteCartContext';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import AIAgentChat from '@/components/AIAgentChat';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import Analytics from '@/components/Analytics';
import CmsRealtimeListener from '@/components/CmsRealtimeListener';
import CustomInjectionRoot from '@/components/CustomInjectionRoot';
import GlobalStylesRoot from '@/components/GlobalStylesRoot';
import CmsPreviewOverlay from '@/components/admin/cms/CmsPreviewOverlay';
import { TenantBrandingBar } from '@/components/tenant/TenantBrandingBar';
import { TenantThemeRuntime } from '@/components/tenant/TenantThemeRuntime';
import { TenantCopyRuntime } from '@/components/tenant/TenantCopyRuntime';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { getSiteSection } from '@/lib/siteStructure';

// Force per-request rendering for every route in the app.
//
// Why: `src/middleware.ts` emits a strict, nonce-based Content-Security-Policy
// on every HTML response (see `src/lib/csp.ts`). Next.js 15 injects inline
// `<script>self.__next_f.push(...)</script>` tags into every server-rendered
// page to stream the React Server Component payload. Those inline scripts must
// carry the same nonce as the CSP header — otherwise the browser blocks them,
// React never hydrates, and users see a black screen until they happen to land
// on a fresh dynamic render.
//
// On a *statically prerendered* route, the nonce is baked into the HTML at
// build time and can never match the per-request nonce that middleware emits.
// Setting `dynamic = 'force-dynamic'` at the root layout cascades to every
// nested segment, ensuring Next.js renders each request server-side and stamps
// the inline scripts with the runtime nonce. This is the canonical Next.js
// pattern paired with strict nonce CSP. See the README of @next/csp examples
// and the middleware source in this repo for the full rationale.

export const metadata: Metadata = {
  metadataBase: new URL('https://www.solucionesfabrick.com'),
  title: {
    default: 'Soluciones Fabrick | Construcción y Remodelación en Maule, Chile',
    template: '%s | Soluciones Fabrick',
  },
  description:
    'Empresa de construcción y remodelación residencial en la Región del Maule, Chile. Estructura Metalcon, gasfitería, electricidad y proyectos llave en mano. 8 años de experiencia. Evaluación gratuita.',
  keywords: [
    'construcción Maule',
    'remodelación Linares',
    'construcción Longaví',
    'Metalcon Chile',
    'empresa construcción Talca',
    'remodelación residencial Chile',
    'construcción llave en mano Maule',
    'gasfitería Linares',
    'electricidad Maule',
    'ampliación vivienda Chile',
  ],
  authors: [{ name: 'Soluciones Fabrick' }],
  openGraph: {
    title: 'Soluciones Fabrick | Construye con un precio claro desde el inicio',
    description:
      'Calcula kits, cabañas, ampliaciones y casas llave en mano. Construcción, remodelación y equipamiento para el hogar en Maule y Santiago.',
    url: 'https://www.solucionesfabrick.com',
    siteName: 'Soluciones Fabrick',
    locale: 'es_CL',
    type: 'website',
    images: [{
      url: '/brand/soluciones-fabrick-social.png',
      width: 1200,
      height: 630,
      alt: 'Soluciones Fabrick — construcción, remodelación y equipamiento del hogar',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soluciones Fabrick | Construcción con claridad',
    description: 'Calcula tu proyecto, compara alternativas y avanza con un alcance claro.',
    images: ['/brand/soluciones-fabrick-social.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.solucionesfabrick.com',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fabrick',
  },
  icons: {
    icon: [
      { url: '/app-icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/app-icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/brand/soluciones-fabrick.svg', type: 'image/svg+xml', sizes: '1040x260' },
    ],
    apple: [
      { url: '/app-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/app-icon.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0907',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Pre-fetch the sections that are needed on every page so the SiteConfig
  // provider hydrates flicker-free. Other sections lazy-load via
  // `useSiteContent` when their consumers mount.
  const [navMenu, globalStyles] = await Promise.all([
    getSiteSection('nav-menu'),
    getSiteSection('global-styles'),
  ]);
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <GlobalStylesRoot />
        <CustomInjectionRoot slot="head" />
      </head>
      <body className="bg-black text-white antialiased app-shell">
        <SplashScreen />
        <SiteConfigProvider initial={{ 'nav-menu': navMenu, 'global-styles': globalStyles }}>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <QuoteCartProvider>
                  <SmoothScrollProvider />
                  <TenantThemeRuntime />
                  <TenantCopyRuntime />
                  {children}
                  <TenantBrandingBar />
                  <ServiceWorkerRegister />
                  <InstallAppPrompt />
                  <AIAgentChat hideOn={['/admin', '/auth', '/checkout', '/presupuestos', '/p/']} />
                  <CookieConsentBanner />
                  <Analytics />
                  <CmsRealtimeListener />
                  <CmsPreviewOverlay />
                </QuoteCartProvider>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </SiteConfigProvider>
        <CustomInjectionRoot slot="bodyEnd" />
      </body>
    </html>
  );
}
