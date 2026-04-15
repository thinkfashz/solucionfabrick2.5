import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata: Metadata = {
  title: 'FABRICK - Ingenieria Residencial de Precision',
  description: 'Construccion industrializada, revestimientos de lujo y soluciones de ingenieria residencial. 8 anos de excelencia en Chile.',
  keywords: 'construccion modular, Metalcom, Wall Panels, PVC Marmol, casas industrializadas, Fabrick 70',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fabrick',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/app-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/app-icon.svg', type: 'image/svg+xml' }],
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
      <body className="antialiased app-shell">
        <ThemeProvider>
          {children}
          <InstallAppPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
