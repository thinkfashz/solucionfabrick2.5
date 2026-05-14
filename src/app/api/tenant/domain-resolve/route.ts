import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tenant/domain-resolve?host=tiendamarta.cl
 *
 * Resolves a custom domain to a tenant slug + id.
 * Called by the Edge middleware (via fetch) on the first request from a
 * custom domain. The result is cached in a short-lived cookie so subsequent
 * requests don't hit the DB.
 *
 * Response: { slug, tenant_id } | { error }
 */
export async function GET(request: NextRequest) {
  const host = new URL(request.url).searchParams.get('host')?.toLowerCase().trim();
  if (!host) return NextResponse.json({ error: 'host requerido' }, { status: 400 });

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .select('id, slug, status')
      .eq('custom_domain', host)
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Dominio no registrado' }, { status: 404 });
    }

    const tenant = data[0] as { id: string; slug: string; status: string };
    return NextResponse.json({ slug: tenant.slug, tenant_id: tenant.id, status: tenant.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
