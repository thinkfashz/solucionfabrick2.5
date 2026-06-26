import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_TENANT_ID, getTenantById, getTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FALLBACK_BRANDING = {
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

function publicBranding(tenant: typeof FALLBACK_BRANDING) {
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
    whatsappUrl: tenant.phone ? `https://wa.me/${tenant.phone.replace(/\D/g, '')}` : null,
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
      branding: publicBranding(tenant ?? FALLBACK_BRANDING),
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
