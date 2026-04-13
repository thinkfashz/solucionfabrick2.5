import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LandingSections from '@/components/LandingSections';

export const metadata: Metadata = {
  title: 'Fabrick — Soluciones Integrales de Construcción y Remodelación | Chile',
  description: 'Soluciones completas de construcción, remodelación y suministro de materiales premium. Un solo equipo especializado, un solo estándar de excelencia.',
  keywords: ['construcción Chile', 'remodelación residencial', 'materiales construcción', 'ingeniería residencial', 'fabrick'],
  authors: [{ name: 'Fabrick' }],
  openGraph: {
    title: 'Fabrick — Ingeniería Residencial Integral',
    description: 'Desde cimientos hasta acabados finales. Un equipo. Un estándar.',
    type: 'website',
    url: 'https://fabrick.cl',
    siteName: 'Fabrick',
  },
  robots: 'index, follow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function Home() {
  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Fabrick',
            description: 'Soluciones integrales de construcción y remodelación',
            url: 'https://fabrick.cl',
            image: 'https://fabrick.cl/og-image.jpg',
            telephone: '+56912345678',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'CL',
            },
            areaServed: 'CL',
            serviceType: ['Construcción', 'Remodelación', 'Suministro de Materiales'],
          }),
        }}
      />
      <div className="bg-gradient-to-b from-black via-zinc-950 to-black min-h-screen overflow-x-hidden">
        <Navbar />
        <Hero />
        <LandingSections />
      </div>
    </>
  );
}
