import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      error: 'Por seguridad SaaS, el revelado de credenciales completas está deshabilitado en integraciones por empresa.',
      hint: 'Puedes guardar, rotar o reemplazar credenciales. Para ver valores completos usa el panel seguro de bóveda o el proveedor original.',
      code: 'TENANT_SECRET_REVEAL_DISABLED',
    },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}
