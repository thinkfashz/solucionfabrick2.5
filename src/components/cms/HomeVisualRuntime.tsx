'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, Copy, EyeOff, SlidersHorizontal, X } from 'lucide-react';
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
import HomeVisualTextToolbar from '@/components/cms/HomeVisualTextToolbar';
import styles from '@/components/cms/HomeVisualRuntime.module.css';
import {
  normalizeHomePage,
  type HomePageContent,
  type HomeVisualSection,
} from '@/lib/homeVisualCms';
import { getContentFieldValue, patchContentField } from '@/lib/homeVisualContent';
import { buildContainerCss } from '@/lib/homeVisualContainers';
import {
  getRepeatedItemPosition,
  type RepeatedItemAction,
} from '@/lib/homeVisualRepeatedStyles';
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

type PreviewCardAction = RepeatedItemAction | 'toggle-hidden' | 'inspect';
interface InlineEditState { sectionId: string; field: string; value: string }

export default function HomeVisualRuntime({ initialConfig, copyrightText, socialLinks }: HomeVisualRuntimeProps) {
  const [config, setConfig] = useState(() => normalizeHomePage(initialConfig));
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [selectedPreviewField, setSelectedPreviewField] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('cms') === 'preview';
    const visualPreview = params.get('cmsVisual') === '1' && window.parent !== window;
    setPreviewMode(preview);
    if (!preview && !visualPreview) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; content?: unknown; sectionId?: string; field?: string | null } | null;
      if (preview && data?.type === 'cms:home-preview') setConfig(normalizeHomePage(data.content));
      if (visualPreview && data?.type === 'cms:visual-home-preview') setConfig(normalizeHomePage(data.content));
      if (preview && data?.type === 'cms:home-selected' && typeof data.sectionId === 'string') {
        setSelectedPreviewId(data.sectionId);
        setSelectedPreviewField(typeof data.field === 'string' ? data.field : null);
      }
    };
    window.addEventListener('message', handler);
    if (preview) window.parent?.postMessage({ type: 'cms:home-preview-ready' }, window.location.origin);
    if (visualPreview) window.parent?.postMessage({ type: 'cms:visual-home-ready' }, window.location.origin);
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
    if (target?.closest('[data-cms-toolbar]')) return;
    event.preventDefault();
    event.stopPropagation();
    const fieldNode = target?.closest<HTMLElement>('[data-cms-field]');
    const containerNode = target?.closest<HTMLElement>('[data-cms-container]');
    const container = containerNode?.dataset.cmsContainer || null;
    const field = fieldNode?.dataset.cmsField || (container ? `${container}-container` : null);
    setSelectedPreviewId(sectionId);
    setSelectedPreviewField(field);
    window.parent?.postMessage({ type: 'cms:home-select', sectionId, field }, window.location.origin);
  }

  function startInlineEdit(section: HomeVisualSection, field: string) {
    const value = getContentFieldValue(section.content, field);
    if (typeof value !== 'string') return;
    setSelectedPreviewId(section.id);
    setSelectedPreviewField(field);
    setInlineEdit({ sectionId: section.id, field, value });
    window.parent?.postMessage({ type: 'cms:home-select', sectionId: section.id, field }, window.location.origin);
  }

  function editFromPreview(event: MouseEvent<HTMLDivElement>, section: HomeVisualSection) {
    if (!previewMode) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-cms-toolbar]')) return;
    const fieldNode = target?.closest<HTMLElement>('[data-cms-field]');
    const field = fieldNode?.dataset.cmsField;
    if (!field || typeof getContentFieldValue(section.content, field) !== 'string') return;
    event.preventDefault();
    event.stopPropagation();
    startInlineEdit(section, field);
  }

  function saveInlineEdit(value: string) {
    if (!inlineEdit) return;
    const edit = inlineEdit;
    setConfig((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === edit.sectionId
        ? { ...section, content: patchContentField(section.content, edit.field, value) }
        : section),
    }));
    window.parent?.postMessage({
      type: 'cms:home-field-change',
      sectionId: edit.sectionId,
      field: edit.field,
      value,
    }, window.location.origin);
    setInlineEdit(null);
  }

  return (
    <main data-cms-page="home">
      {sections.map((section) => {
        const useFrameImage = section.type !== 'hero' && section.type !== 'calculator' && Boolean(section.style.backgroundImage?.trim());
        const selected = previewMode && selectedPreviewId === section.id;
        const selectedContainer = selected ? containerFromField(selectedPreviewField) : null;
        const selectedTextField = selected && selectedPreviewField && !selectedPreviewField.endsWith('-container') ? selectedPreviewField : null;
        const repeatedPosition = selectedContainer ? getRepeatedItemPosition(section, selectedContainer) : null;
        const elementCss = buildElementTypographyCss(section.id, section.style);
        const containerCss = buildContainerCss(section.id, section.style);
        const selectedFieldCss = selected && selectedPreviewField
          ? selectedPreviewField.endsWith('-container')
            ? `[data-cms-block-id="${token(section.id)}"] [data-cms-container="${token(selectedPreviewField.slice(0, -'-container'.length))}"]{outline:2px solid #C4A7FF!important;outline-offset:3px!important;border-radius:4px;position:relative!important;}`
            : `[data-cms-block-id="${token(section.id)}"] [data-cms-field="${token(selectedPreviewField)}"]{outline:2px solid #5CC8FF!important;outline-offset:3px!important;border-radius:3px;}`
          : '';
        const selectedContainerCss = selectedContainer
          ? `[data-cms-block-id="${token(section.id)}"] [data-cms-container="${token(selectedContainer)}"]{position:relative!important;}`
          : '';
        return (
          <div
            key={section.id}
            data-cms-block-id={section.id}
            onClickCapture={(event) => selectFromPreview(event, section.id)}
            onDoubleClickCapture={(event) => editFromPreview(event, section)}
            className={[styles.frame, useFrameImage ? styles.frameImage : '', previewMode ? 'relative cursor-default' : ''].filter(Boolean).join(' ')}
            style={{
              ...frameStyle(section, useFrameImage),
              ...(selected ? { outline: '2px solid #FFB000', outlineOffset: '-2px', zIndex: 3 } : {}),
            }}
          >
            {elementCss || containerCss || selectedFieldCss || selectedContainerCss ? <style>{`${elementCss}\n${containerCss}\n${selectedFieldCss}\n${selectedContainerCss}`}</style> : null}
            {selected ? (
              <span className="pointer-events-none absolute left-2 top-2 z-[999] rounded-full bg-[#FFB000] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black shadow-lg">
                {section.label}{selectedPreviewField ? ` · ${selectedPreviewField}` : ''}
              </span>
            ) : null}
            <CmsSectionMotion style={section.style}>
              <HomeBlock section={section} copyrightText={copyrightText} socialLinks={socialLinks} />
            </CmsSectionMotion>
            {selected && selectedContainer && repeatedPosition ? (
              <PreviewContainerToolbar section={section} container={selectedContainer} />
            ) : null}
            {selectedTextField && !inlineEdit ? (
              <HomeVisualTextToolbar
                sectionId={section.id}
                field={selectedTextField}
                editable={typeof getContentFieldValue(section.content, selectedTextField) === 'string'}
                onEdit={() => startInlineEdit(section, selectedTextField)}
              />
            ) : null}
          </div>
        );
      })}
      {previewMode && inlineEdit ? (
        <InlineFieldEditor edit={inlineEdit} onCancel={() => setInlineEdit(null)} onSave={saveInlineEdit} />
      ) : null}
    </main>
  );
}

function InlineFieldEditor({ edit, onCancel, onSave }: { edit: InlineEditState; onCancel: () => void; onSave: (value: string) => void }) {
  const [value, setValue] = useState(edit.value);
  const [position, setPosition] = useState<CSSProperties>({ opacity: 0, pointerEvents: 'none' });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const multiline = edit.value.length > 72 || /(description|paragraph|text|note|subtitle)/i.test(edit.field);

  useEffect(() => {
    setValue(edit.value);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [edit.sectionId, edit.field, edit.value]);

  useEffect(() => {
    const update = () => {
      const root = document.querySelector<HTMLElement>(`[data-cms-block-id="${token(edit.sectionId)}"]`);
      const target = root?.querySelector<HTMLElement>(`[data-cms-field="${token(edit.field)}"]`);
      if (!target) {
        setPosition({ opacity: 0, pointerEvents: 'none' });
        return;
      }
      const rect = target.getBoundingClientRect();
      const viewportWidth = Math.max(320, window.innerWidth);
      const viewportHeight = Math.max(320, window.innerHeight);
      const width = Math.min(Math.max(rect.width, 300), viewportWidth - 16, 620);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const estimatedHeight = multiline ? 190 : 130;
      const below = rect.bottom + 8;
      const top = below + estimatedHeight <= viewportHeight
        ? below
        : Math.max(8, rect.top - estimatedHeight - 8);
      setPosition({ position: 'fixed', left, top, width, zIndex: 2147483000, opacity: 1, pointerEvents: 'auto' });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [edit.sectionId, edit.field, multiline]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onSave(value);
      return;
    }
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      onSave(value);
    }
  };

  const editor = (
    <div
      data-cms-toolbar="inline-editor"
      style={position}
      className="rounded-2xl border border-sky-300/25 bg-[#08090A]/[.98] p-2.5 text-white shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-sky-300/60">Edición directa</p>
          <b className="block truncate text-[11px] text-white/80">{prettyField(edit.field)}</b>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/50" aria-label="Cancelar"><X className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onSave(value)} className="grid h-8 w-8 place-items-center rounded-lg bg-sky-300 text-black" aria-label="Guardar"><Check className="h-3.5 w-3.5" /></button>
      </div>
      {multiline ? (
        <textarea
          ref={(node) => { inputRef.current = node; }}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/55 px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-sky-300/50"
        />
      ) : (
        <input
          ref={(node) => { inputRef.current = node; }}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-sky-300/50"
        />
      )}
      <p className="mt-2 px-1 text-[8px] leading-4 text-white/30">Esc cancela · {multiline ? 'Ctrl/Cmd + Enter guarda' : 'Enter guarda'}</p>
    </div>
  );

  return createPortal(editor, document.body);
}

function PreviewContainerToolbar({ section, container }: { section: HomeVisualSection; container: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const position = getRepeatedItemPosition(section, container);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(`[data-cms-block-id="${token(section.id)}"]`);
      setHost(root?.querySelector<HTMLElement>(`[data-cms-container="${token(container)}"]`) || null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [section.id, section.content, container]);

  if (!host || !position) return null;

  const send = (action: PreviewCardAction) => {
    window.parent?.postMessage({
      type: 'cms:home-card-action',
      sectionId: section.id,
      container,
      action,
    }, window.location.origin);
  };

  return createPortal(
    <div
      data-cms-toolbar="card"
      className="absolute right-2 top-2 z-[1200] flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-xl border border-white/15 bg-[#08090A]/95 p-1 shadow-2xl backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="hidden whitespace-nowrap px-2 text-[8px] font-black uppercase tracking-[.12em] text-violet-200/70 sm:inline">Tarjeta {position.index + 1}</span>
      <ToolbarButton label="Subir" disabled={position.index === 0} onClick={() => send('move-up')}><ChevronUp className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton label="Bajar" disabled={position.index === position.length - 1} onClick={() => send('move-down')}><ChevronDown className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton label="Duplicar" onClick={() => send('duplicate')}><Copy className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton label="Ocultar en este dispositivo" onClick={() => send('toggle-hidden')}><EyeOff className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton label="Abrir inspector de tarjeta" accent onClick={() => send('inspect')}><SlidersHorizontal className="h-3.5 w-3.5" /></ToolbarButton>
    </div>,
    host,
  );
}

function ToolbarButton({ label, disabled = false, accent = false, onClick, children }: { label: string; disabled?: boolean; accent?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-white transition disabled:cursor-not-allowed disabled:opacity-20 ${accent ? 'border-violet-300/30 bg-violet-300/12 text-violet-100 hover:bg-violet-300/20' : 'border-white/8 bg-white/[.04] text-white/65 hover:border-white/20 hover:bg-white/[.08]'}`}
    >
      {children}
    </button>
  );
}

function containerFromField(field: string | null): string | null {
  if (!field) return null;
  if (field.endsWith('-container')) return field.slice(0, -'-container'.length);
  const nested = field.match(/^(.+)-(\d+)-(title|text|label|number)$/);
  if (nested) return `${nested[1]}-${nested[2]}`;
  const repeated = field.match(/^(.+)-(\d+)$/);
  return repeated ? `${repeated[1]}-${repeated[2]}` : null;
}

function prettyField(field: string) {
  const nested = field.match(/^(.+)-(\d+)-(title|text)$/);
  if (nested) return `${pretty(nested[1])} · ${Number(nested[2]) + 1} · ${nested[3] === 'title' ? 'Título' : 'Texto'}`;
  const repeated = field.match(/^(.+)-(\d+)$/);
  if (repeated) return `${pretty(repeated[1])} · ${Number(repeated[2]) + 1}`;
  return pretty(field);
}

function pretty(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()).trim();
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
  const fit = advanced.backgroundFit === 'contain' ? 'contain' : 'cover';
  const positionX = num(advanced.backgroundPositionX, 0, 100, 50);
  const positionY = num(advanced.backgroundPositionY, 0, 100, 50);

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
    backgroundSize: image ? fit : undefined,
    backgroundPosition: image ? `${positionX}% ${positionY}%` : undefined,
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
