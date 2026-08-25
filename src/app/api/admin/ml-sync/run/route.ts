import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { runFullSync } from '@/lib/mercadoLibreSync';

/** POST /api/admin/ml-sync/run — run full ML sync for the current tenant. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request, { resource: 'products', action: 'update' });
    if (!auth.ok) return auth.response;

    const result = await runFullSync(auth.ctx.tenantId);
    return NextResponse.json({
      success: result.success,
      productsSync: result.productsSync.length,
      ordersSync: result.ordersSync.length,
      errors: result.errors,
      tenantId: auth.ctx.tenantId,
    });
  } catch (err) {
    console.error('Error running sync:', err);
    return NextResponse.json(
      { error: 'Error ejecutando sincronización' },
      { status: 500 },
    );
  }
}
