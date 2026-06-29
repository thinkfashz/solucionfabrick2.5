import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readTenantIntegration } from '@/lib/tenantIntegrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveTenantId(request: NextRequest): string {
  return request.headers.get('x-tenant-id')
    || request.headers.get('x-fabrick-tenant-id')
    || request.nextUrl.searchParams.get('tenant_id')
    || '';
}

export async function GET(request: NextRequest) {
  const tenantId = resolveTenantId(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: 'No se pudo resolver tenant_id.', code: 'tenant_required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const integration = await readTenantIntegration(tenantId, 'mercadopago', ['public_key']);
  if (!integration.ready || !integration.values.public_key) {
    return NextResponse.json(
      {
        error: 'MercadoPago no tiene public_key configurada para esta empresa.',
        code: 'tenant_mp_public_key_missing',
        missing: integration.missing,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      tenantId,
      publicKey: integration.values.public_key,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
