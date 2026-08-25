export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchTenantDropiProducts, importTenantDropiProducts } from '@/lib/dropiTenant';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

function readLimit(request: NextRequest) {
  const raw = Number(new URL(request.url).searchParams.get('limit') ?? 40);
  return Math.max(1, Math.min(Number.isFinite(raw) ? raw : 40, 100));
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  try {
    const products = await fetchTenantDropiProducts(auth.ctx.tenantId, readLimit(request));
    return NextResponse.json({ ok: true, products, total: products.length, tenantId: auth.ctx.tenantId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudieron leer productos Dropi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { limit?: number; dryRun?: boolean } = {};
  try { body = await request.json(); } catch { body = {}; }

  const dryRun = Boolean(body.dryRun);
  const auth = await requireTenantAdmin(request, { resource: 'products', action: dryRun ? 'read' : 'create' });
  if (!auth.ok) return auth.response;

  try {
    const limit = Math.max(1, Math.min(Number(body.limit ?? 40) || 40, 100));
    const result = await importTenantDropiProducts(auth.ctx.tenantId, limit, dryRun);
    return NextResponse.json({ ok: true, ...result, tenantId: auth.ctx.tenantId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudieron importar productos Dropi.' }, { status: 500 });
  }
}
