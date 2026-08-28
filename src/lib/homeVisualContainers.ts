import type { HomeVisualSectionStyle } from './homeVisualCms';
import type { AdvancedHomeVisualStyle, VisualDevice, VisualShadow } from './homeVisualLayout';

export interface VisualResponsiveContainer {
  paddingTop?: number;
  paddingBottom?: number;
  paddingInline?: number;
  marginTop?: number;
  marginBottom?: number;
  minHeight?: number;
  gap?: number;
  hidden?: boolean;
}

export interface VisualContainerStyle {
  background?: string;
  color?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadow?: VisualShadow;
  responsive?: Partial<Record<VisualDevice, VisualResponsiveContainer>>;
}

interface ContainerAwareStyle extends AdvancedHomeVisualStyle {
  containers?: Record<string, VisualContainerStyle>;
}

const EMPTY_CONTAINER: VisualContainerStyle = {};
const EMPTY_RESPONSIVE_CONTAINER: VisualResponsiveContainer = {};

function advanced(style?: HomeVisualSectionStyle): ContainerAwareStyle {
  return (style || {}) as ContainerAwareStyle;
}

export function getContainerStyle(style: HomeVisualSectionStyle | undefined, container: string): VisualContainerStyle {
  return advanced(style).containers?.[container] || EMPTY_CONTAINER;
}

export function getContainerResponsive(
  style: HomeVisualSectionStyle | undefined,
  container: string,
  device: VisualDevice,
): VisualResponsiveContainer {
  return getContainerStyle(style, container).responsive?.[device] || EMPTY_RESPONSIVE_CONTAINER;
}

export function patchContainerStyle<K extends keyof Omit<VisualContainerStyle, 'responsive'>>(
  style: HomeVisualSectionStyle,
  container: string,
  key: K,
  value: VisualContainerStyle[K],
): HomeVisualSectionStyle {
  const current = advanced(style);
  const containers = { ...(current.containers || {}) };
  containers[container] = { ...(containers[container] || {}), [key]: value };
  return { ...current, containers } as HomeVisualSectionStyle;
}

export function patchContainerResponsive<K extends keyof VisualResponsiveContainer>(
  style: HomeVisualSectionStyle,
  container: string,
  device: VisualDevice,
  key: K,
  value: VisualResponsiveContainer[K],
): HomeVisualSectionStyle {
  const current = advanced(style);
  const containers = { ...(current.containers || {}) };
  const card = containers[container] || {};
  const responsive = { ...(card.responsive || {}) };
  responsive[device] = { ...(responsive[device] || {}), [key]: value };
  containers[container] = { ...card, responsive };
  return { ...current, containers } as HomeVisualSectionStyle;
}

export function clearContainerResponsive(
  style: HomeVisualSectionStyle,
  container: string,
  device: VisualDevice,
): HomeVisualSectionStyle {
  const current = advanced(style);
  const containers = { ...(current.containers || {}) };
  const card = containers[container];
  if (!card) return style;
  const responsive = { ...(card.responsive || {}) };
  delete responsive[device];
  containers[container] = { ...card, responsive };
  return { ...current, containers } as HomeVisualSectionStyle;
}

export function clearContainerStyle(style: HomeVisualSectionStyle, container: string): HomeVisualSectionStyle {
  const current = advanced(style);
  const containers = { ...(current.containers || {}) };
  delete containers[container];
  return { ...current, containers } as HomeVisualSectionStyle;
}

export function buildContainerCss(sectionId: string, style?: HomeVisualSectionStyle) {
  const current = advanced(style);
  const section = safeToken(sectionId);
  if (!section || !current.containers) return '';
  const rules: string[] = [];

  for (const [rawContainer, card] of Object.entries(current.containers)) {
    const container = safeToken(rawContainer);
    if (!container || !card) continue;
    const selector = `[data-cms-block-id="${section}"] [data-cms-container="${container}"]`;
    const base: string[] = [];

    if (card.background) base.push(`background-color:${cssColor(card.background, 'transparent')}!important`);
    if (card.color) base.push(`color:${cssColor(card.color, 'inherit')}!important`);
    if (card.borderWidth !== undefined) {
      base.push(`border-width:${n(card.borderWidth, 0, 16)}px!important`, 'border-style:solid!important');
      if (Number(card.borderWidth) > 0) base.push(`border-color:${cssColor(card.borderColor, 'rgba(255,255,255,.16)')}!important`);
    }
    if (card.borderRadius !== undefined) base.push(`border-radius:${n(card.borderRadius, 0, 96)}px!important`);
    if (card.shadow !== undefined) base.push(`box-shadow:${shadowValue(card.shadow)}!important`);
    if (base.length) rules.push(`${selector}{${base.join(';')}}`);

    const mobile = responsiveDeclarations(card.responsive?.mobile);
    const tablet = responsiveDeclarations(card.responsive?.tablet);
    const desktop = responsiveDeclarations(card.responsive?.desktop);
    if (mobile) rules.push(`@media(max-width:639px){${selector}{${mobile}}}`);
    if (tablet) rules.push(`@media(min-width:640px) and (max-width:1023px){${selector}{${tablet}}}`);
    if (desktop) rules.push(`@media(min-width:1024px){${selector}{${desktop}}}`);
  }

  return rules.join('\n');
}

function responsiveDeclarations(value: VisualResponsiveContainer | undefined) {
  if (!value) return '';
  const out: string[] = [];
  if (value.paddingTop !== undefined) out.push(`padding-top:${n(value.paddingTop, 0, 320)}px!important`);
  if (value.paddingBottom !== undefined) out.push(`padding-bottom:${n(value.paddingBottom, 0, 320)}px!important`);
  if (value.paddingInline !== undefined) {
    const amount = n(value.paddingInline, 0, 180);
    out.push(`padding-left:${amount}px!important`, `padding-right:${amount}px!important`);
  }
  if (value.marginTop !== undefined) out.push(`margin-top:${n(value.marginTop, -160, 320)}px!important`);
  if (value.marginBottom !== undefined) out.push(`margin-bottom:${n(value.marginBottom, -160, 320)}px!important`);
  if (value.minHeight !== undefined) out.push(`min-height:${n(value.minHeight, 0, 1200)}px!important`);
  if (value.gap !== undefined) out.push(`gap:${n(value.gap, 0, 120)}px!important`);
  if (value.hidden === true) out.push('display:none!important');
  return out.join(';');
}

function n(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function cssColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgba?\([\d\s.,%]+\)$/i.test(trimmed) ? trimmed : fallback;
}

function shadowValue(shadow: VisualShadow | undefined) {
  if (shadow === 'soft') return '0 12px 36px rgba(0,0,0,.12)';
  if (shadow === 'medium') return '0 22px 64px rgba(0,0,0,.20)';
  if (shadow === 'strong') return '0 30px 90px rgba(0,0,0,.34)';
  return 'none';
}
