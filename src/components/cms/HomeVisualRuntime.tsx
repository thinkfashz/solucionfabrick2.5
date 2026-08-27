'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
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
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('cms') === 'preview';
    setPreviewMode(preview);
    if (!preview) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; content?: unknown; sectionId?: string } | null;
      if (data?.type === 'cms:home-preview') setConfig(normalizeHomePage(data.content));
      if (data?.type === 'cms:home-selected' && typeof data.sectionId === 'string') setSelectedPreviewId(data.sectionId);
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

  function selectFromPreview(event: MouseEvent<HTMLDivElement>, sectionId: string) {
    if (!previewMode) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('a')) event.preventDefault();
    setSelectedPreviewId(sectionId);
    window.parent?.postMessage({ type: 'cms:home-select', sectionId }, window.location.origin);
  }

  return (
    <main data-cms-page="home">
      {sections.map((section) => (
        <div
          key={section.id}
          data-cms-block-id={section.id}
          onClickCapture={(event) => selectFromPreview(event, section.id)}
          className={previewMode ? 'relative cursor-default' : undefined}
          style={previewMode && selectedPreviewId === section.id
            ? { outline: '2px solid #FFB000', outlineOffset: '-2px', zIndex: 3 }
            : undefined}
        >
          {previewMode && selectedPreviewId === section.id ? (
            <span className="pointer-events-none absolute left-2 top-2 z-[999] rounded-full bg-[#FFB000] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black shadow-lg">
              {section.label}
            </span>
          ) : null}
          <CmsSectionMotion style={section.style}>
            <HomeBlock section={section} copyrightText={copyrightText} socialLinks={socialLinks} />
          </CmsSectionMotion>
        </div>
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
