import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { listInvoices } from '@/lib/billing/sql';
import { getBillingDriverResolved } from '@/lib/billing/provider';
import { resolveBillingCredentials } from '@/lib/billing/credentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const access = await requireAdminPermission(req, { resource: 'finance', action: 'read' });
  if (!access.ok) return access.response;
  const tenantId = access.session.tenant_id ?? DEFAULT_TENANT_ID;

  try {
    const [invoices, driver, billing] = await Promise.all([
      listInvoices(tenantId, 250),
      getBillingDriverResolved(),
      resolveBillingCredentials(),
    ]);
    return NextResponse.json({
      ok: true,
      invoices,
      provider: {
        code: driver.code,
        name: driver.name,
        configured: driver.code !== 'mock',
        simulated: driver.code === 'mock',
        source: billing.source,
        missing: billing.missing,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron cargar las facturas' }, { status: 500 });
  }
}
