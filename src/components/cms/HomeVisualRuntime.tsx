'use client';

import { useEffect, useMemo, useState } from 'react';
import StaticConstructionHero from '@/components/landing/StaticConstructionHero';
import CalculatorPlanShowcase from '@/components/landing/CalculatorPlanShowcase';
import ConstructionM2Calculator from '@/components/landing/ConstructionM2Calculator';
import LandingProcessSection from '@/components/landing/LandingProcessSection';
import FabrickStorySection from '@/components/landing/FabrickStorySection';
import MetalconSeismicStory from '@/components/landing/MetalconSeismicStory';
import {
  LandingContactSection,
  LandingFooterSection,
  LandingStoreSection,
} from '@/components/LandingSections';
import CmsSectionMotion from '@/components/cms/CmsSectionMotion';
import {
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';

interface HomeVisualRuntimeProps {
  initialConfig: HomePageContent;
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}

export default function HomeVisualRuntime({ initialConfig, copyrightText, socialLinks }: HomeVisualRuntimeProps) {
  const [config, setConfig] = useState(() => normalizeHomePage(initialConfig));

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('cms') === 'preview';
    if (!preview) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; content?: unknown } | null;
      if (data?.type === 'cms:home-preview') setConfig(normalizeHomePage(data.content));
    };
    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: 'cms:home-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    setConfig(normalizeHomePage(initialConfig));
  }, [initialConfig]);

  const sections = useMemo(
    () => [...config.sections].filter((section) => section.enabled).sort((a, b) => a.order - b.order),
    [config.sections],
  );

  return (
    <main data-cms-page="home">
      {sections.map((section) => (
        <CmsSectionMotion key={section.id} style={section.style}>
          <HomeBlock section={section} copyrightText={copyrightText} socialLinks={socialLinks} />
        </CmsSectionMotion>
      ))}
    </main>
  );
}

function HomeBlock({
  section,
  copyrightText,
  socialLinks,
}: {
  section: HomeVisualSection;
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}) {
  switch (section.type) {
    case 'hero':
      return <StaticConstructionHero section={section} />;
    case 'price-guide':
      return <CalculatorPlanShowcase section={section} />;
    case 'calculator':
      return (
        <div data-cms-section="home-calculator" style={{ backgroundColor: section.style.background || '#FFF9EE' }}>
          <ConstructionM2Calculator />
        </div>
      );
    case 'process':
      return <LandingProcessSection section={section} />;
    case 'story':
      return <FabrickStorySection section={section} />;
    case 'seismic':
      return <MetalconSeismicStory section={section} />;
    case 'store':
      return <LandingStoreSection section={section} />;
    case 'contact':
      return <LandingContactSection section={section} />;
    case 'footer':
      return <LandingFooterSection section={section} copyrightText={copyrightText} socialLinks={socialLinks} />;
    default:
      return null;
  }
}
