import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { listInvoices } from '@/lib/billing/sql';
import { getBillingDriver } from '@/lib/billing/provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const access = await requireAdminPermission(req, { resource: 'finance', action: 'read' });
  if (!access.ok) return access.response;

  const tenantId = access.session.tenant_id ?? DEFAULT_TENANT_ID;

  try {
    const invoices = await listInvoices(tenantId, 250);
    const driver = getBillingDriver();
    return NextResponse.json({
      ok: true,
      invoices,
      provider: {
        code: driver.code,
        configured: driver.code !== 'mock',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron cargar las facturas' }, { status: 500 });
  }
}
