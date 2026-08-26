import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { ensureSaasTenantSchema } from '@/lib/ensureSaasTenantSchema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  const result = await ensureSaasTenantSchema({ force: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
