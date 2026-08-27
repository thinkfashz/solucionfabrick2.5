'use client';

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
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
import styles from '@/components/cms/HomeVisualRuntime.module.css';
import {
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import {
  buildElementTypographyCss,
  getAdvancedStyle,
  getDeviceLayout,
  type VisualDevice,
  type VisualShadow,
} from '@/lib/homeVisualLayout';

interface HomeVisualRuntimeProps {
  initialConfig: HomePageContent;
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}

export default function HomeVisualRuntime({ initialConfig, copyrightText, socialLinks }: HomeVisualRuntimeProps) {
  const [config, setConfig] = useState(() => normalizeHomePage(initialConfig));
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [selectedPreviewField, setSelectedPreviewField] = useState<string | null>(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('cms') === 'preview';
    setPreviewMode(preview);
    if (!preview) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; content?: unknown; sectionId?: string; field?: string | null } | null;
      if (data?.type === 'cms:home-preview') setConfig(normalizeHomePage(data.content));
      if (data?.type === 'cms:home-selected' && typeof data.sectionId === 'string') {
        setSelectedPreviewId(data.sectionId);
        setSelectedPreviewField(typeof data.field === 'string' ? data.field : null);
      }
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
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    const fieldNode = target?.closest<HTMLElement>('[data-cms-field]');
    const field = fieldNode?.dataset.cmsField || null;
    setSelectedPreviewId(sectionId);
    setSelectedPreviewField(field);
    window.parent?.postMessage({ type: 'cms:home-select', sectionId, field }, window.location.origin);
  }

  return (
    <main data-cms-page="home">
      {sections.map((section) => {
        const useFrameImage = section.type !== 'hero' && section.type !== 'calculator' && Boolean(section.style.backgroundImage?.trim());
        const selected = previewMode && selectedPreviewId === section.id;
        const elementCss = buildElementTypographyCss(section.id, section.style);
        const selectedFieldCss = selected && selectedPreviewField
          ? `[data-cms-block-id="${token(section.id)}"] [data-cms-field="${token(selectedPreviewField)}"]{outline:2px solid #5CC8FF!important;outline-offset:3px!important;border-radius:3px;}`
          : '';
        return (
          <div
            key={section.id}
            data-cms-block-id={section.id}
            onClickCapture={(event) => selectFromPreview(event, section.id)}
            className={[styles.frame, useFrameImage ? styles.frameImage : '', previewMode ? 'relative cursor-default' : ''].filter(Boolean).join(' ')}
            style={{
              ...frameStyle(section, useFrameImage),
              ...(selected ? { outline: '2px solid #FFB000', outlineOffset: '-2px', zIndex: 3 } : {}),
            }}
          >
            {elementCss || selectedFieldCss ? <style>{`${elementCss}\n${selectedFieldCss}`}</style> : null}
            {selected ? (
              <span className="pointer-events-none absolute left-2 top-2 z-[999] rounded-full bg-[#FFB000] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black shadow-lg">
                {section.label}{selectedPreviewField ? ` · ${selectedPreviewField}` : ''}
              </span>
            ) : null}
            <CmsSectionMotion style={section.style}>
              <HomeBlock section={section} copyrightText={copyrightText} socialLinks={socialLinks} />
            </CmsSectionMotion>
          </div>
        );
      })}
    </main>
  );
}

function frameStyle(section: HomeVisualSection, useFrameImage: boolean): CSSProperties {
  const advanced = getAdvancedStyle(section.style);
  const variables: Record<string, string> = {};
  const devices: VisualDevice[] = ['mobile', 'tablet', 'desktop'];
  for (const device of devices) {
    const layout = getDeviceLayout(section.style, device);
    variables[`--cms-${device}-pt`] = `${num(layout.paddingTop, 0, 320)}px`;
    variables[`--cms-${device}-pb`] = `${num(layout.paddingBottom, 0, 320)}px`;
    variables[`--cms-${device}-px`] = `${num(layout.paddingInline, 0, 180)}px`;
    variables[`--cms-${device}-mt`] = `${num(layout.marginTop, -160, 320)}px`;
    variables[`--cms-${device}-mb`] = `${num(layout.marginBottom, -160, 320)}px`;
    variables[`--cms-${device}-mh`] = `${num(layout.minHeight, 0, 1600)}px`;
  }

  const radius = num(advanced.borderRadius, 0, 96);
  const border = num(advanced.borderWidth, 0, 16);
  const maxWidth = num(advanced.maxWidth, 0, 2400);
  const image = useFrameImage ? safeImage(section.style.backgroundImage) : '';
  const overlay = num(section.style.overlay, 0, 90, 35) / 100;

  return {
    ...(variables as CSSProperties),
    backgroundColor: safeColor(section.style.background, 'transparent'),
    borderRadius: radius ? `${radius}px` : undefined,
    borderWidth: border ? `${border}px` : undefined,
    borderStyle: border ? 'solid' : undefined,
    borderColor: border ? safeColor(advanced.borderColor, 'rgba(255,255,255,.12)') : undefined,
    boxShadow: shadow(advanced.shadow),
    maxWidth: maxWidth ? `${maxWidth}px` : undefined,
    marginLeft: maxWidth ? 'auto' : undefined,
    marginRight: maxWidth ? 'auto' : undefined,
    overflow: radius || image ? 'hidden' : undefined,
    backgroundImage: image ? `linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${image}")` : undefined,
    backgroundSize: image ? 'cover' : undefined,
    backgroundPosition: image ? 'center' : undefined,
    backgroundRepeat: image ? 'no-repeat' : undefined,
  };
}

function num(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgba?\([\d\s.,%]+\)$/i.test(trimmed) ? trimmed : fallback;
}

function safeImage(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/["'\\\n\r<>]/g, '') : '';
}

function token(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function shadow(value: VisualShadow | undefined) {
  if (value === 'soft') return '0 12px 36px rgba(0,0,0,.12)';
  if (value === 'medium') return '0 22px 64px rgba(0,0,0,.20)';
  if (value === 'strong') return '0 30px 90px rgba(0,0,0,.34)';
  return undefined;
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
