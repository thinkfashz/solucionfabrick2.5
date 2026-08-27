import type { HomeVisualSectionStyle } from './homeVisualCms';

export type VisualDevice = 'mobile' | 'tablet' | 'desktop';
export type VisualShadow = 'none' | 'soft' | 'medium' | 'strong';

export interface VisualResponsiveLayout {
  paddingTop?: number;
  paddingBottom?: number;
  paddingInline?: number;
  marginTop?: number;
  marginBottom?: number;
  minHeight?: number;
}

export interface AdvancedHomeVisualStyle extends HomeVisualSectionStyle {
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  maxWidth?: number;
  shadow?: VisualShadow;
  responsive?: Partial<Record<VisualDevice, VisualResponsiveLayout>>;
}

export const EMPTY_LAYOUT: VisualResponsiveLayout = {};

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

function shadowValue(shadow: VisualShadow | undefined) {
  switch (shadow) {
    case 'soft':
      return '0 12px 36px rgba(0,0,0,.12)';
    case 'medium':
      return '0 22px 64px rgba(0,0,0,.20)';
    case 'strong':
      return '0 30px 90px rgba(0,0,0,.34)';
    default:
      return 'none';
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

export function buildSectionFrameCss(
  sectionId: string,
  style?: HomeVisualSectionStyle,
  options: { useFrameImage?: boolean } = {},
) {
  const advanced = getAdvancedStyle(style);
  const id = sectionId.replace(/[^a-zA-Z0-9_-]/g, '');
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
    common.push(
      `background-image:linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${image}")`,
      'background-size:cover',
      'background-position:center',
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
