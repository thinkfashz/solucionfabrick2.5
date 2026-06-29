'use client';

import { useEffect, useState } from 'react';
import type { TenantPalette } from '@/lib/tenantTheme';
import { isSaaSRuntimeEnabled, SAAS_RUNTIME_CHANGE_EVENT } from '@/lib/saasFeatureFlag';

export type TenantBranding = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  phone: string | null;
  billingEmail: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  customDomain: string | null;
  status: string;
  planId: string;
  whatsappUrl: string | null;
  theme?: TenantPalette;
};

type BrandingResponse = {
  ok: boolean;
  branding?: TenantBranding;
  fallback?: boolean;
  setupRequired?: boolean;
};

export const FALLBACK_TENANT_BRANDING: TenantBranding = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'fabrick',
  name: 'Soluciones Fabrick',
  primaryColor: '#f59e0b',
  logoUrl: null,
  phone: null,
  billingEmail: 'pagos@solucionesfabrick.cl',
  ownerEmail: 'admin@fabrick.cl',
  ownerName: null,
  customDomain: null,
  status: 'active',
  planId: 'pro',
  whatsappUrl: null,
};

export function useTenantBranding() {
  const [branding, setBranding] = useState<TenantBranding>(FALLBACK_TENANT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
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
    let alive = true;

    if (!enabled) {
      setBranding(FALLBACK_TENANT_BRANDING);
      setFallback(true);
      setLoading(false);
      return () => { alive = false; };
    }

    setLoading(true);
    fetch('/api/tenant/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: BrandingResponse) => {
        if (!alive) return;
        setBranding(json.branding || FALLBACK_TENANT_BRANDING);
        setFallback(Boolean(json.fallback || json.setupRequired || !json.branding));
      })
      .catch(() => {
        if (!alive) return;
        setBranding(FALLBACK_TENANT_BRANDING);
        setFallback(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [enabled]);

  return { branding, loading, fallback, enabled };
}

export function tenantInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}
