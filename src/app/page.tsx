import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import QuickAccessRoutes from '@/components/QuickAccessRoutes';
import LandingSections from '@/components/LandingSections';

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Soluciones Fabrick',
    description:
      'Empresa de construcción y remodelación residencial en la Región del Maule, Chile.',
    url: 'https://www.solucionesfabrick.com',
    image: 'https://www.solucionesfabrick.com/og-image.jpg',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Linares',
      addressRegion: 'Maule',
      addressCountry: 'CL',
    },
    areaServed: ['Maule', 'Santiago', 'Chile'],
    priceRange: '$$',
    openingHours: 'Mo-Fr 08:00-18:00',
    serviceType: [
      'Construcción residencial',
      'Remodelación residencial',
      'Estructura Metalcon',
      'Gasfitería',
      'Instalación eléctrica',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
