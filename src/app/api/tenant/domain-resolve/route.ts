import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tenant/domain-resolve?host=www.solucionesfabrick.com
 *
 * Called by middleware for custom domains. This endpoint must be resilient:
 * when the tenants table is not ready or the domain is not registered yet, it
 * returns a safe fallback instead of causing noisy 404/500 loops in Vercel logs.
 */
export async function GET(request: NextRequest) {
  const host = new URL(request.url).searchParams.get('host')?.toLowerCase().trim();
  if (!host) return NextResponse.json({ error: 'host requerido' }, { status: 400 });

  const normalizedHost = host.replace(/^www\./, '');
  const candidates = Array.from(new Set([host, normalizedHost, `www.${normalizedHost}`]));

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .select('id, slug, status, custom_domain')
      .in('custom_domain', candidates)
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        fallback: true,
        slug: 'default',
        tenant_id: 'default',
        status: 'active',
        host,
        reason: error?.message || 'Dominio no registrado',
      });
    }

    const tenant = data[0] as { id: string; slug: string; status: string; custom_domain?: string };
    return NextResponse.json({ slug: tenant.slug, tenant_id: tenant.id, status: tenant.status, custom_domain: tenant.custom_domain });
  } catch (err) {
    return NextResponse.json({
      fallback: true,
      slug: 'default',
      tenant_id: 'default',
      status: 'active',
      host,
      reason: (err as Error).message,
    });
  }
}
