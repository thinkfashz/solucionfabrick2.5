import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getSyncStatus } from '@/lib/mercadoLibreSync';

/** GET /api/admin/ml-sync/status — current ML sync status for this tenant. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
    if (!auth.ok) return auth.response;

    const status = await getSyncStatus(auth.ctx.tenantId);
    return NextResponse.json({ ...status, tenantId: auth.ctx.tenantId });
  } catch (err) {
    console.error('Error getting sync status:', err);
    return NextResponse.json(
      { error: 'Error obteniendo estado de sincronización' },
      { status: 500 },
    );
  }
}
