'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { TenantPalette } from '@/lib/tenantTheme';

type Branding = {
  name?: string;
  primaryColor?: string;
  theme?: TenantPalette;
};

type BrandingResponse = {
  ok: boolean;
  branding?: Branding;
};

const DEFAULTS = {
  primary: '#f59e0b',
  secondary: '#ea580c',
  accent: '#fde68a',
  background: '#050505',
  surface: '#11100d',
  text: '#fff7ed',
  name: 'Soluciones Fabrick',
};

function shouldApplyTenantTheme(pathname: string) {
  return !pathname.startsWith('/admin')
    && !pathname.startsWith('/auth')
    && !pathname.startsWith('/api')
    && !pathname.startsWith('/registro');
}

function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function applyTheme(branding?: Branding) {
  const theme = branding?.theme;
  setVar('--tenant-primary', theme?.primary || branding?.primaryColor || DEFAULTS.primary);
  setVar('--tenant-secondary', theme?.secondary || DEFAULTS.secondary);
  setVar('--tenant-accent', theme?.accent || DEFAULTS.accent);
  setVar('--tenant-bg', theme?.background || DEFAULTS.background);
  setVar('--tenant-surface', theme?.surface || DEFAULTS.surface);
  setVar('--tenant-text', theme?.text || DEFAULTS.text);
  setVar('--tenant-name', branding?.name || DEFAULTS.name);
  document.documentElement.dataset.tenantTheme = 'ready';
}

function clearThemeMarker() {
  delete document.documentElement.dataset.tenantTheme;
}

export function TenantThemeRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldApplyTenantTheme(pathname)) {
      clearThemeMarker();
      return;
    }

    let alive = true;
    fetch('/api/tenant/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: BrandingResponse) => {
        if (!alive) return;
        applyTheme(json?.branding);
      })
      .catch(() => {
        if (!alive) return;
        applyTheme();
      });

    return () => { alive = false; };
  }, [pathname]);

  return null;
}
