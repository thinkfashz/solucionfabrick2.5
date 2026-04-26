import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LandingSections from '@/components/LandingSections';

// Render dynamically so the per-request CSP nonce emitted by `middleware.ts`
// reaches the inline JSON-LD <script> below (and the framework's own RSC
// streaming scripts). Static prerenders bake a build-time nonce that never
// matches the runtime nonce, so the inline scripts get blocked and the page
// fails to hydrate (black screen until a reload happens to land on a fresh
// dynamic render). See src/lib/csp.ts for the full rationale.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
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
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-gradient-to-b from-black via-zinc-950 to-black min-h-screen overflow-x-hidden">
        <Navbar />
        <Hero />
        <LandingSections />
      </div>
    </>
  );
}
