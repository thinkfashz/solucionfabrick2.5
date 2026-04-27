import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import SmoothScrollProvider from '@/components/SmoothScrollProvider';
import PromoBanner from '@/components/PromoBanner';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import WhatsAppButton from '@/components/WhatsAppButton';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import Analytics from '@/components/Analytics';
import CmsRealtimeListener from '@/components/CmsRealtimeListener';

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
export const dynamic = 'force-dynamic';

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
    title: 'Soluciones Fabrick | Tu Obra en Buenas Manos',
    description:
      'Construcción y remodelación residencial en el Maule. Metalcon, gasfitería, electricidad y más. Evaluación gratuita.',
    url: 'https://www.solucionesfabrick.com',
    siteName: 'Soluciones Fabrick',
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soluciones Fabrick',
    description: 'Construcción y remodelación residencial en Chile',
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
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#facc15',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-black text-white antialiased app-shell">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <SmoothScrollProvider />
              {children}
              <ServiceWorkerRegister />
              <InstallAppPrompt />
              <PromoBanner />
              <WhatsAppButton />
              <Analytics />
              <CmsRealtimeListener />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
