export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import StaticConstructionHero from '@/components/landing/StaticConstructionHero';
import LandingSections from '@/components/LandingSections';
import HomeDynamicSections from '@/components/HomeDynamicSections';
import { getCmsSettings, getPublicHomeSections, renderCopyright } from '@/lib/cms';

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const [settings, sections] = await Promise.all([getCmsSettings(), getPublicHomeSections()]);
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
    description: 'Empresa de construcción y remodelación residencial en la Región del Maule, Chile.',
    url: 'https://www.solucionesfabrick.com',
    image: 'https://www.solucionesfabrick.com/og-image.jpg',
    address: { '@type': 'PostalAddress', addressLocality: 'Linares', addressRegion: 'Maule', addressCountry: 'CL' },
    areaServed: ['Maule', 'Santiago', 'Chile'],
    priceRange: '$$',
    openingHours: 'Mo-Fr 08:00-18:00',
    serviceType: ['Construcción residencial', 'Remodelación residencial', 'Estructura Metalcon', 'Gasfitería', 'Instalación eléctrica'],
  };

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen overflow-x-hidden bg-[#050505]">
        <Navbar />
        <StaticConstructionHero coverUrl={settings.hero_cover_url || undefined} />
        <HomeDynamicSections sections={sections} />
        <LandingSections copyrightText={copyrightText} socialLinks={socialLinks} />
      </div>
    </>
  );
}
