export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import ConstructionM2Calculator from '@/components/landing/ConstructionM2Calculator';
import StaticConstructionHero from '@/components/landing/StaticConstructionHero';
import LandingSections from '@/components/LandingSections';
import { getCmsSettings, renderCopyright } from '@/lib/cms';

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const settings = await getCmsSettings();
  const copyrightText = renderCopyright(settings.copyright_text);
  const socialLinks = {
    facebook: settings.social_facebook,
    instagram: settings.social_instagram,
    tiktok: settings.social_tiktok,
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Soluciones Fabrick',
    description: 'Soluciones para construcción, remodelación, equipamiento y mejoras del hogar en Chile.',
    url: 'https://www.solucionesfabrick.com',
    logo: 'https://www.solucionesfabrick.com/brand/soluciones-fabrick-transparent.png',
    image: 'https://www.solucionesfabrick.com/brand/soluciones-fabrick-transparent.png',
    address: { '@type': 'PostalAddress', addressLocality: 'Linares', addressRegion: 'Maule', addressCountry: 'CL' },
    areaServed: ['Maule', 'Santiago', 'Chile'],
    priceRange: '$$',
    openingHours: 'Mo-Fr 08:00-18:00',
    serviceType: ['Remodelación residencial', 'Mejoras del hogar', 'Estructura Metalcon', 'Gasfitería', 'Instalación eléctrica', 'Equipamiento del hogar'],
  };

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen overflow-x-hidden bg-[#050403] selection:bg-yellow-300 selection:text-black">
        <Navbar />
        <StaticConstructionHero coverUrl={settings.hero_cover_url || undefined} />
        <ConstructionM2Calculator />
        <LandingSections copyrightText={copyrightText} socialLinks={socialLinks} />
      </div>
    </>
  );
}
