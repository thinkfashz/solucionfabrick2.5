export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import HomePremiumV10 from '@/components/landing/HomePremiumV10';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';
import { getCmsSettings, renderCopyright } from '@/lib/cms';
import { buildFabrickHomeJsonLd } from '@/lib/seo';

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const settings = await getCmsSettings();
  const copyrightText = renderCopyright(settings.copyright_text);
  const socialLinks = {
    facebook: settings.social_facebook || 'https://www.facebook.com/FabrickSoluciones',
    instagram: settings.social_instagram || 'https://www.instagram.com/solucionesfabrick/',
    tiktok: settings.social_tiktok,
  };
  const jsonLd = buildFabrickHomeJsonLd({ socialLinks });

  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen overflow-x-hidden bg-[#08090A] pb-[calc(6rem+env(safe-area-inset-bottom))] selection:bg-[#FFE600] selection:text-[#08090A] md:pb-0">
        <Navbar />
        <HomePremiumV10 copyrightText={copyrightText} socialLinks={socialLinks} />
        <StoreBottomNav />
      </div>
    </>
  );
}
