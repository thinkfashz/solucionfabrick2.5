import type { HomeVisualSectionStyle } from './homeVisualCms';

export type VisualDevice = 'mobile' | 'tablet' | 'desktop';
export type VisualShadow = 'none' | 'soft' | 'medium' | 'strong';
export type VisualTextAlign = 'inherit' | 'left' | 'center' | 'right';
export type VisualTextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type VisualFontFamily = 'inherit' | 'Manrope' | 'Sora' | 'serif' | 'mono';
export type VisualBackgroundFit = 'cover' | 'contain';

export interface VisualResponsiveLayout {
  paddingTop?: number;
  paddingBottom?: number;
  paddingInline?: number;
  marginTop?: number;
  marginBottom?: number;
  minHeight?: number;
}

export interface VisualResponsiveTypography {
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  maxWidth?: number;
}

export interface VisualElementStyle {
  color?: string;
  fontFamily?: VisualFontFamily;
  fontWeight?: number;
  textAlign?: VisualTextAlign;
  textTransform?: VisualTextTransform;
  responsive?: Partial<Record<VisualDevice, VisualResponsiveTypography>>;
}

export interface AdvancedHomeVisualStyle extends HomeVisualSectionStyle {
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  maxWidth?: number;
  shadow?: VisualShadow;
  backgroundFit?: VisualBackgroundFit;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  responsive?: Partial<Record<VisualDevice, VisualResponsiveLayout>>;
  elements?: Record<string, VisualElementStyle>;
}

export const EMPTY_LAYOUT: VisualResponsiveLayout = {};
export const EMPTY_TYPOGRAPHY: VisualResponsiveTypography = {};
export const EMPTY_ELEMENT_STYLE: VisualElementStyle = {};

export function getAdvancedStyle(style?: HomeVisualSectionStyle): AdvancedHomeVisualStyle {
  return (style || {}) as AdvancedHomeVisualStyle;
}

export function getDeviceLayout(style: HomeVisualSectionStyle | undefined, device: VisualDevice): VisualResponsiveLayout {
  const advanced = getAdvancedStyle(style);
  return advanced.responsive?.[device] || EMPTY_LAYOUT;
}

export function patchDeviceLayout<K extends keyof VisualResponsiveLayout>(
  style: HomeVisualSectionStyle,
  device: VisualDevice,
  key: K,
  value: VisualResponsiveLayout[K],
): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const responsive = { ...(advanced.responsive || {}) };
  responsive[device] = { ...(responsive[device] || {}), [key]: value };
  return { ...advanced, responsive } as HomeVisualSectionStyle;
}

export function clearDeviceLayout(style: HomeVisualSectionStyle, device: VisualDevice): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const responsive = { ...(advanced.responsive || {}) };
  delete responsive[device];
  return { ...advanced, responsive } as HomeVisualSectionStyle;
}

export function getElementStyle(style: HomeVisualSectionStyle | undefined, field: string): VisualElementStyle {
  return getAdvancedStyle(style).elements?.[field] || EMPTY_ELEMENT_STYLE;
}

export function getElementTypography(style: HomeVisualSectionStyle | undefined, field: string, device: VisualDevice): VisualResponsiveTypography {
  return getElementStyle(style, field).responsive?.[device] || EMPTY_TYPOGRAPHY;
}

export function patchElementStyle<K extends keyof Omit<VisualElementStyle, 'responsive'>>(
  style: HomeVisualSectionStyle,
  field: string,
  key: K,
  value: VisualElementStyle[K],
): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const elements = { ...(advanced.elements || {}) };
  elements[field] = { ...(elements[field] || {}), [key]: value };
  return { ...advanced, elements } as HomeVisualSectionStyle;
}

export function patchElementTypography<K extends keyof VisualResponsiveTypography>(
  style: HomeVisualSectionStyle,
  field: string,
  device: VisualDevice,
  key: K,
  value: VisualResponsiveTypography[K],
): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const elements = { ...(advanced.elements || {}) };
  const current = elements[field] || {};
  const responsive = { ...(current.responsive || {}) };
  responsive[device] = { ...(responsive[device] || {}), [key]: value };
  elements[field] = { ...current, responsive };
  return { ...advanced, elements } as HomeVisualSectionStyle;
}

export function clearElementStyle(style: HomeVisualSectionStyle, field: string): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const elements = { ...(advanced.elements || {}) };
  delete elements[field];
  return { ...advanced, elements } as HomeVisualSectionStyle;
}

export function clearElementTypography(style: HomeVisualSectionStyle, field: string, device: VisualDevice): HomeVisualSectionStyle {
  const advanced = getAdvancedStyle(style);
  const elements = { ...(advanced.elements || {}) };
  const current = elements[field];
  if (!current) return style;
  const responsive = { ...(current.responsive || {}) };
  delete responsive[device];
  elements[field] = { ...current, responsive };
  return { ...advanced, elements } as HomeVisualSectionStyle;
}

function n(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function cssColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgba?\([\d\s.,%]+\)$/i.test(trimmed) ? trimmed : fallback;
}

function cssUrl(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/["'\\\n\r<>]/g, '');
}

function safeToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function fontFamily(value: VisualFontFamily | undefined) {
  if (value === 'Manrope') return 'Manrope,ui-sans-serif,system-ui,sans-serif';
  if (value === 'Sora') return 'Sora,Manrope,ui-sans-serif,system-ui,sans-serif';
  if (value === 'serif') return 'Georgia,Times New Roman,serif';
  if (value === 'mono') return 'ui-monospace,SFMono-Regular,Menlo,monospace';
  return '';
}

function shadowValue(shadow: VisualShadow | undefined) {
  switch (shadow) {
    case 'soft': return '0 12px 36px rgba(0,0,0,.12)';
    case 'medium': return '0 22px 64px rgba(0,0,0,.20)';
    case 'strong': return '0 30px 90px rgba(0,0,0,.34)';
    default: return 'none';
  }
}

function layoutDeclarations(layout: VisualResponsiveLayout | undefined) {
  if (!layout) return '';
  const declarations: string[] = [];
  if (layout.paddingTop !== undefined) declarations.push(`padding-top:${n(layout.paddingTop, 0, 320)}px`);
  if (layout.paddingBottom !== undefined) declarations.push(`padding-bottom:${n(layout.paddingBottom, 0, 320)}px`);
  if (layout.paddingInline !== undefined) {
    const value = n(layout.paddingInline, 0, 180);
    declarations.push(`padding-left:${value}px`, `padding-right:${value}px`);
  }
  if (layout.marginTop !== undefined) declarations.push(`margin-top:${n(layout.marginTop, -160, 320)}px`);
  if (layout.marginBottom !== undefined) declarations.push(`margin-bottom:${n(layout.marginBottom, -160, 320)}px`);
  if (layout.minHeight !== undefined) declarations.push(`min-height:${n(layout.minHeight, 0, 1600)}px`);
  return declarations.join(';');
}

function typographyDeclarations(value: VisualResponsiveTypography | undefined) {
  if (!value) return '';
  const out: string[] = [];
  if (value.fontSize !== undefined && Number(value.fontSize) > 0) out.push(`font-size:${n(value.fontSize, 8, 180)}px!important`);
  if (value.lineHeight !== undefined && Number(value.lineHeight) > 0) out.push(`line-height:${n(value.lineHeight, .7, 3)}!important`);
  if (value.letterSpacing !== undefined) out.push(`letter-spacing:${n(value.letterSpacing, -8, 20)}px!important`);
  if (value.maxWidth !== undefined && Number(value.maxWidth) > 0) out.push(`max-width:${n(value.maxWidth, 80, 1800)}px!important`);
  return out.join(';');
}

export function buildElementTypographyCss(sectionId: string, style?: HomeVisualSectionStyle) {
  const advanced = getAdvancedStyle(style);
  const section = safeToken(sectionId);
  if (!section || !advanced.elements) return '';
  const rules: string[] = [];

  for (const [rawField, element] of Object.entries(advanced.elements)) {
    const field = safeToken(rawField);
    if (!field || !element) continue;
    const selector = `[data-cms-block-id="${section}"] [data-cms-field="${field}"]`;
    const base: string[] = [];
    if (element.color) base.push(`color:${cssColor(element.color, 'inherit')}!important`);
    const family = fontFamily(element.fontFamily);
    if (family) base.push(`font-family:${family}!important`);
    if (element.fontWeight !== undefined && Number(element.fontWeight) > 0) base.push(`font-weight:${n(element.fontWeight, 100, 900)}!important`);
    if (element.textAlign && element.textAlign !== 'inherit') base.push(`text-align:${element.textAlign}!important`);
    if (element.textTransform) base.push(`text-transform:${element.textTransform}!important`);
    if (base.length) rules.push(`${selector}{${base.join(';')}}`);

    const mobile = typographyDeclarations(element.responsive?.mobile);
    const tablet = typographyDeclarations(element.responsive?.tablet);
    const desktop = typographyDeclarations(element.responsive?.desktop);
    if (mobile) rules.push(`@media(max-width:639px){${selector}{${mobile}}}`);
    if (tablet) rules.push(`@media(min-width:640px) and (max-width:1023px){${selector}{${tablet}}}`);
    if (desktop) rules.push(`@media(min-width:1024px){${selector}{${desktop}}}`);
  }
  return rules.join('\n');
}

export function buildSectionFrameCss(
  sectionId: string,
  style?: HomeVisualSectionStyle,
  options: { useFrameImage?: boolean } = {},
) {
  const advanced = getAdvancedStyle(style);
  const id = safeToken(sectionId);
  const selector = `[data-cms-block-id="${id}"]`;
  const common: string[] = [
    `background-color:${cssColor(advanced.background, 'transparent')}`,
    `border-radius:${n(advanced.borderRadius, 0, 96)}px`,
    `border-width:${n(advanced.borderWidth, 0, 16)}px`,
    'border-style:solid',
    `border-color:${cssColor(advanced.borderColor, 'transparent')}`,
    `box-shadow:${shadowValue(advanced.shadow)}`,
  ];

  const maxWidth = n(advanced.maxWidth, 0, 2400);
  if (maxWidth > 0) common.push(`max-width:${maxWidth}px`, 'margin-left:auto', 'margin-right:auto');
  if (n(advanced.borderRadius, 0, 96) > 0 || options.useFrameImage) common.push('overflow:hidden');

  const image = options.useFrameImage ? cssUrl(advanced.backgroundImage) : '';
  if (image) {
    const overlay = n(advanced.overlay, 0, 90, 35) / 100;
    const fit = advanced.backgroundFit === 'contain' ? 'contain' : 'cover';
    const positionX = n(advanced.backgroundPositionX, 0, 100, 50);
    const positionY = n(advanced.backgroundPositionY, 0, 100, 50);
    common.push(
      `background-image:linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${image}")`,
      `background-size:${fit}`,
      `background-position:${positionX}% ${positionY}%`,
      'background-repeat:no-repeat',
    );
  }

  const mobile = layoutDeclarations(advanced.responsive?.mobile);
  const tablet = layoutDeclarations(advanced.responsive?.tablet);
  const desktop = layoutDeclarations(advanced.responsive?.desktop);

  return [
    `${selector}{${common.join(';')}}`,
    image ? `${selector}>[data-cms-motion]>[data-cms-section]{background-color:transparent!important;background-image:none!important}` : '',
    mobile ? `@media(max-width:639px){${selector}{${mobile}}}` : '',
    tablet ? `@media(min-width:640px) and (max-width:1023px){${selector}{${tablet}}}` : '',
    desktop ? `@media(min-width:1024px){${selector}{${desktop}}}` : '',
  ].filter(Boolean).join('\n');
}
