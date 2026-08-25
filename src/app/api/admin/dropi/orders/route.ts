export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createTenantDropiFulfillment } from '@/lib/dropiTenant';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'update' });
  if (!auth.ok) return auth.response;

  let body: { orderId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const orderId = String(body.orderId ?? '').trim();
  if (!orderId) return NextResponse.json({ error: 'orderId es requerido.' }, { status: 400 });

  const result = await createTenantDropiFulfillment(auth.ctx.tenantId, orderId);
  return NextResponse.json({ ...result, tenantId: auth.ctx.tenantId }, { status: result.ok ? 200 : 500 });
}
