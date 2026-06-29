'use client';

import { useEffect } from 'react';
import type { TenantPalette } from '@/lib/tenantTheme';

type BrandingPayload = {
  ok: boolean;
  branding?: {
    name?: string;
    primaryColor?: string;
    theme?: TenantPalette;
  };
};

const fallback = {
  primary: '#f59e0b',
  secondary: '#ea580c',
  accent: '#fde68a',
  background: '#050505',
  surface: '#11100d',
  text: '#fff7ed',
};

function setVar(name: string, value?: string | null) {
  document.documentElement.style.setProperty(name, value || fallback.primary);
}

export function TenantThemeBridge() {
  useEffect(() => {
    let alive = true;
    fetch('/api/tenant/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: BrandingPayload) => {
        if (!alive) return;
        const branding = json.branding;
        const theme = branding?.theme;
        setVar('--tenant-primary', theme?.primary || branding?.primaryColor || fallback.primary);
        setVar('--tenant-secondary', theme?.secondary || fallback.secondary);
        setVar('--tenant-accent', theme?.accent || fallback.accent);
        setVar('--tenant-bg', theme?.background || fallback.background);
        setVar('--tenant-surface', theme?.surface || fallback.surface);
        setVar('--tenant-text', theme?.text || fallback.text);
        document.documentElement.style.setProperty('--tenant-name', branding?.name || 'Soluciones Fabrick');
      })
      .catch(() => {
        setVar('--tenant-primary', fallback.primary);
        setVar('--tenant-secondary', fallback.secondary);
        setVar('--tenant-accent', fallback.accent);
        setVar('--tenant-bg', fallback.background);
        setVar('--tenant-surface', fallback.surface);
        setVar('--tenant-text', fallback.text);
      });
    return () => { alive = false; };
  }, []);

  return null;
}
