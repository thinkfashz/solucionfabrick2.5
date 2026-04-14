import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import QuickAccessRoutes from '@/components/QuickAccessRoutes';
import LandingSections from '@/components/LandingSections';

export const metadata: Metadata = {
  title: 'Fabrick - Soluciones Integrales de Construccion y Remodelacion | Chile',
  description: 'Soluciones completas de construccion, remodelacion y suministro de materiales premium. Un solo equipo especializado, un solo estandar de excelencia.',
  keywords: ['construccion Chile', 'remodelacion residencial', 'materiales construccion', 'ingenieria residencial', 'fabrick'],
  authors: [{ name: 'Fabrick' }],
  openGraph: {
    title: 'Fabrick - Ingenieria Residencial Integral',
    description: 'Desde cimientos hasta acabados finales. Un equipo. Un estandar.',
    type: 'website',
    url: 'https://fabrick.cl',
    siteName: 'Fabrick',
  },
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1',
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Fabrick',
            description: 'Soluciones integrales de construccion y remodelacion',
            url: 'https://fabrick.cl',
            image: 'https://fabrick.cl/og-image.jpg',
            telephone: '+56912345678',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'CL',
            },
            areaServed: 'CL',
            serviceType: ['Construccion', 'Remodelacion', 'Suministro de Materiales'],
          }),
        }}
      />
      <div className="bg-gradient-to-b from-black via-zinc-950 to-black min-h-screen overflow-x-hidden">
        <Navbar />
        <Hero />
        <QuickAccessRoutes />
        <LandingSections />
      </div>
    </>
  );
}
