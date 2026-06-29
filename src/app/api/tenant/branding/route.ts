import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_TENANT_ID, getTenantById, getTenantBySlug } from '@/lib/tenant';
import { paletteFromPrimary } from '@/lib/tenantTheme';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PublicBrandingSource = {
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
};

const FALLBACK_BRANDING: PublicBrandingSource = {
  id: DEFAULT_TENANT_ID,
  slug: 'fabrick',
  name: 'Soluciones Fabrick',
  primaryColor: '#f59e0b',
  logoUrl: null,
  phone: null,
  billingEmail: null,
  ownerEmail: null,
  ownerName: null,
  customDomain: null,
  status: 'active',
  planId: 'pro',
};

function buildWhatsappUrl(phone: string | null) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

function publicBranding(tenant: PublicBrandingSource) {
  const theme = paletteFromPrimary(tenant.primaryColor);
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl,
    phone: tenant.phone,
    billingEmail: tenant.billingEmail,
    ownerEmail: tenant.ownerEmail,
    ownerName: tenant.ownerName,
    customDomain: tenant.customDomain,
    status: tenant.status,
    planId: tenant.planId,
    whatsappUrl: buildWhatsappUrl(tenant.phone),
    theme,
  };
}

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || request.nextUrl.searchParams.get('tenant_id') || '';
  const tenantSlug = request.headers.get('x-tenant-slug') || request.nextUrl.searchParams.get('slug') || '';

  try {
    const tenant = tenantId
      ? await getTenantById(tenantId)
      : tenantSlug
        ? await getTenantBySlug(tenantSlug)
        : null;

    return NextResponse.json({
      ok: true,
      branding: publicBranding((tenant ?? FALLBACK_BRANDING) as PublicBrandingSource),
      fallback: !tenant,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({
      ok: true,
      branding: publicBranding(FALLBACK_BRANDING),
      fallback: true,
      setupRequired: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
