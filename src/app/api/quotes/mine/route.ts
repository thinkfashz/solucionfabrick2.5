import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listQuotesForUser } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { getTenantIdFromHeaders } from '@/lib/tenant-edge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/quotes/mine — list quotes belonging to the authenticated user
 * inside the tenant resolved for the current request.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getInsforgeUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado.', code: 'UNAUTHENTICATED', quotes: [] },
        { status: 401 },
      );
    }
    const tenantId = getTenantIdFromHeaders(request.headers);
    const quotes = await listQuotesForUser(user.id, tenantId);
    return NextResponse.json(
      { quotes },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'QUOTES_LIST_FAILED', quotes: [] },
      { status: 500 },
    );
  }
}
