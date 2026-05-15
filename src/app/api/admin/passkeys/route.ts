import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession, getAdminTenantId } from '@/lib/adminApi';
import { getPasskeysForUser } from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/admin/passkeys — list passkeys for the authenticated admin. */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const tenantId = await getAdminTenantId(request);
    const passkeys = await getPasskeysForUser(session.email, tenantId);
    const safe = passkeys.map((p) => ({
      id: p.id,
      name: p.name,
      device_type: p.device_type,
      backed_up: p.backed_up,
      aaguid: p.aaguid,
      created_at: p.created_at,
      last_used_at: p.last_used_at,
    }));
    return NextResponse.json({ passkeys: safe });
  } catch (err) {
    return adminError(err, 'PASSKEYS_LIST_FAILED');
  }
}
