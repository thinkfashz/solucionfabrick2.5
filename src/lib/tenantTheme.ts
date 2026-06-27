export type TenantPaletteId = 'lava' | 'emerald' | 'royal' | 'aqua' | 'rose' | 'slate';

export type TenantPalette = {
  id: TenantPaletteId;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
};

export const TENANT_PALETTES: TenantPalette[] = [
  {
    id: 'lava',
    name: 'Lava premium',
    description: 'Negro, crema, naranja y dorado para construcción, servicios técnicos y ventas premium.',
    primary: '#f59e0b',
    secondary: '#ea580c',
    accent: '#fde68a',
    background: '#050505',
    surface: '#11100d',
    text: '#fff7ed',
  },
  {
    id: 'emerald',
    name: 'Esmeralda técnica',
    description: 'Verde tecnológico para energía, climatización, instalaciones y mantenimiento.',
    primary: '#10b981',
    secondary: '#047857',
    accent: '#a7f3d0',
    background: '#03130f',
    surface: '#06231c',
    text: '#ecfdf5',
  },
  {
    id: 'royal',
    name: 'Royal IA',
    description: 'Morado/azul para SaaS, IA, automatización y productos digitales.',
    primary: '#8b5cf6',
    secondary: '#2563eb',
    accent: '#ddd6fe',
    background: '#080617',
    surface: '#15112b',
    text: '#f5f3ff',
  },
  {
    id: 'aqua',
    name: 'Aqua industrial',
    description: 'Cian y azul para ingeniería, sensores, datos, dashboards y monitoreo.',
    primary: '#06b6d4',
    secondary: '#0284c7',
    accent: '#cffafe',
    background: '#03131a',
    surface: '#082633',
    text: '#ecfeff',
  },
  {
    id: 'rose',
    name: 'Rose boutique',
    description: 'Rosa elegante para estética, moda, hoteles, gastronomía y marca personal.',
    primary: '#f43f5e',
    secondary: '#be123c',
    accent: '#fecdd3',
    background: '#16070b',
    surface: '#2a0d15',
    text: '#fff1f2',
  },
  {
    id: 'slate',
    name: 'Slate corporativo',
    description: 'Gris, blanco y azul para empresas sobrias, B2B, contabilidad y legal.',
    primary: '#64748b',
    secondary: '#334155',
    accent: '#e2e8f0',
    background: '#020617',
    surface: '#0f172a',
    text: '#f8fafc',
  },
];

export function paletteFromPrimary(primaryColor?: string | null): TenantPalette {
  if (!primaryColor) return TENANT_PALETTES[0];
  const normalized = primaryColor.trim().toLowerCase();
  return TENANT_PALETTES.find((palette) => palette.primary.toLowerCase() === normalized) ?? {
    ...TENANT_PALETTES[0],
    id: 'lava',
    name: 'Personalizada',
    description: 'Paleta generada desde el color principal de la marca.',
    primary: primaryColor,
  };
}

export function themeCssVariables(palette: TenantPalette) {
  return {
    '--tenant-primary': palette.primary,
    '--tenant-secondary': palette.secondary,
    '--tenant-accent': palette.accent,
    '--tenant-bg': palette.background,
    '--tenant-surface': palette.surface,
    '--tenant-text': palette.text,
  } as Record<string, string>;
}
