export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { maskedDropiCredentials } from '@/lib/dropi';
import { getTenantDropiCredentials, saveTenantDropiCredentials, ensureTenantDropiSchema } from '@/lib/dropiTenant';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  await ensureTenantDropiSchema();
  const credentials = await getTenantDropiCredentials(auth.ctx.tenantId);
  return NextResponse.json({ ok: true, provider: 'dropi', credentials: maskedDropiCredentials(credentials) });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'manage' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  try {
    await ensureTenantDropiSchema();
    const saved = await saveTenantDropiCredentials(auth.ctx.tenantId, body);
    const credentials = await getTenantDropiCredentials(auth.ctx.tenantId);
    return NextResponse.json({
      ok: true,
      provider: 'dropi',
      tenantId: auth.ctx.tenantId,
      savedKeys: Object.keys(saved).filter((key) => saved[key as keyof typeof saved]),
      credentials: maskedDropiCredentials(credentials),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar Dropi.' }, { status: 500 });
  }
}
