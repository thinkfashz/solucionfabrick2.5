export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import ConstructionM2Calculator from '@/components/landing/ConstructionM2Calculator';
import StaticConstructionHero from '@/components/landing/StaticConstructionHero';
import LandingSections from '@/components/LandingSections';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';
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
    '@type': 'HomeAndConstructionBusiness',
    name: 'Soluciones Fabrick',
    description: 'Construcción, remodelación e instalaciones con cotización inicial, alcance definido y evaluación técnica.',
    url: 'https://www.solucionesfabrick.com',
    logo: 'https://www.solucionesfabrick.com/brand/soluciones-fabrick.svg',
    image: 'https://www.solucionesfabrick.com/brand/soluciones-fabrick-social.png',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Linares',
      addressRegion: 'Maule',
      addressCountry: 'CL',
    },
    areaServed: ['Región del Maule', 'Santiago', 'Chile'],
    priceRange: '$$',
    openingHours: 'Mo-Fr 08:00-18:00',
    serviceType: [
      'Construcción de viviendas',
      'Ampliaciones',
      'Remodelación integral',
      'Radier y obra base',
      'Techumbre',
      'Gasfitería',
      'Electricidad domiciliaria',
      'Climatización',
    ],
  };

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen overflow-x-hidden bg-[#080705] pb-[calc(6rem+env(safe-area-inset-bottom))] selection:bg-yellow-300 selection:text-black md:pb-0">
        <Navbar />
        <main>
          <StaticConstructionHero coverUrl={settings.hero_cover_url || undefined} />
          <ConstructionM2Calculator />
          <LandingSections copyrightText={copyrightText} socialLinks={socialLinks} />
        </main>
        <StoreBottomNav />
      </div>
    </>
  );
}
