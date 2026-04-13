import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FABRICK — Ingeniería Residencial de Precisión',
  description: 'Construcción industrializada, revestimientos de lujo y soluciones de ingeniería residencial. 8 años de excelencia en Chile.',
  keywords: 'construcción modular, Metalcom, Wall Panels, PVC Mármol, casas industrializadas, Fabrick 70',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
