'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Sparkles } from 'lucide-react';
import type { TenantPalette } from '@/lib/tenantTheme';
import { isSaaSRuntimeEnabled, SAAS_RUNTIME_CHANGE_EVENT } from '@/lib/saasFeatureFlag';

type Branding = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  phone: string | null;
  billingEmail: string | null;
  ownerEmail: string | null;
  customDomain: string | null;
  whatsappUrl: string | null;
  theme?: TenantPalette;
};

type BrandingResponse = {
  ok: boolean;
  branding: Branding;
  fallback?: boolean;
  setupRequired?: boolean;
};

const FALLBACK: Branding = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'fabrick',
  name: 'Soluciones Fabrick',
  primaryColor: '#f59e0b',
  logoUrl: null,
  phone: null,
  billingEmail: null,
  ownerEmail: null,
  customDomain: null,
  whatsappUrl: null,
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function shouldHide(pathname: string, forceShow: boolean) {
  if (forceShow) return false;
  return pathname.startsWith('/admin')
    || pathname.startsWith('/auth')
    || pathname.startsWith('/checkout')
    || pathname.startsWith('/api')
    || pathname.startsWith('/registro');
}

function applyTheme(branding: Branding) {
  const theme = branding.theme;
  document.documentElement.style.setProperty('--tenant-primary', theme?.primary || branding.primaryColor || FALLBACK.primaryColor);
  document.documentElement.style.setProperty('--tenant-secondary', theme?.secondary || '#ea580c');
  document.documentElement.style.setProperty('--tenant-accent', theme?.accent || '#fde68a');
  document.documentElement.style.setProperty('--tenant-bg', theme?.background || '#050505');
  document.documentElement.style.setProperty('--tenant-surface', theme?.surface || '#11100d');
  document.documentElement.style.setProperty('--tenant-text', theme?.text || '#fff7ed');
  document.documentElement.style.setProperty('--tenant-name', branding.name || FALLBACK.name);
}

export function TenantBrandingBar({ compact = false, forceShow = false }: { compact?: boolean; forceShow?: boolean }) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<Branding>(FALLBACK);
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
    if (!enabled) return;
    if (shouldHide(pathname, forceShow) && !compact) return;
    let alive = true;
    fetch('/api/tenant/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: BrandingResponse) => {
        if (!alive || !json?.branding) return;
        setBranding(json.branding);
        setFallback(Boolean(json.fallback || json.setupRequired));
        applyTheme(json.branding);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [compact, enabled, forceShow, pathname]);

  const subtitle = useMemo(() => {
    if (fallback) return 'Modo compatible · branding SaaS preparado';
    if (branding.customDomain) return branding.customDomain;
    return `${branding.slug}.solucionesfabrick.com`;
  }, [branding.customDomain, branding.slug, fallback]);

  if (!enabled) return null;
  if (shouldHide(pathname, forceShow) && !compact) return null;

  const mainColor = branding.theme?.primary || branding.primaryColor || FALLBACK.primaryColor;

  return <div className={compact ? 'rounded-3xl border border-white/10 bg-black/45 p-3 text-white' : 'fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-5xl rounded-[1.6rem] border border-white/10 bg-black/70 p-3 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl md:left-auto md:right-5 md:max-w-sm'}>
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl text-sm font-black text-black ring-1 ring-white/15" style={{ background: mainColor }}>
        {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.name} className="h-full w-full object-cover" /> : initials(branding.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{branding.name}</p>
        <p className="truncate text-[11px] text-zinc-400">{subtitle}</p>
      </div>
      {branding.whatsappUrl ? <a href={branding.whatsappUrl} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-2xl text-black" style={{ background: mainColor }} aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a> : <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-amber-200"><Sparkles className="h-4 w-4" /></span>}
    </div>
  </div>;
}
