'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { TenantPalette } from '@/lib/tenantTheme';
import { isSaaSRuntimeEnabled, SAAS_RUNTIME_CHANGE_EVENT } from '@/lib/saasFeatureFlag';

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
  primary: '#FFE600',
  secondary: '#FFD400',
  accent: '#FFF45C',
  background: '#08090A',
  surface: '#111214',
  text: '#fffdf0',
  name: 'Soluciones Fabrick',
};

function isRootSurface(pathname: string) {
  return pathname.startsWith('/admin/saas') || pathname.startsWith('/admin/superadmin');
}

function shouldApplyTenantTheme(pathname: string) {
  return !pathname.startsWith('/api') && !isRootSurface(pathname);
}

function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function isFabrickBrand(branding?: Branding) {
  const name = (branding?.name || DEFAULTS.name).trim().toLowerCase();
  return name === 'soluciones fabrick' || name === 'fabrick';
}

function applyTheme(branding?: Branding) {
  const theme = branding?.theme;
  const fabrick = isFabrickBrand(branding);
  setVar('--tenant-primary', fabrick ? DEFAULTS.primary : (theme?.primary || branding?.primaryColor || DEFAULTS.primary));
  setVar('--tenant-secondary', fabrick ? DEFAULTS.secondary : (theme?.secondary || DEFAULTS.secondary));
  setVar('--tenant-accent', fabrick ? DEFAULTS.accent : (theme?.accent || DEFAULTS.accent));
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
  const [enabled, setEnabled] = useState(() => isSaaSRuntimeEnabled());

  useEffect(() => {
    function sync() { setEnabled(isSaaSRuntimeEnabled()); }
    window.addEventListener(SAAS_RUNTIME_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SAAS_RUNTIME_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !shouldApplyTenantTheme(pathname)) {
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
  }, [enabled, pathname]);

  return null;
}
