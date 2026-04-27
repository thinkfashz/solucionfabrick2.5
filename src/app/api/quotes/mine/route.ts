import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listQuotesForUser } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/quotes/mine — list quotes belonging to the authenticated user.
 *
 * Authentication: client passes its InsForge access token via
 * `Authorization: Bearer <token>`. The token is validated server-side
 * against InsForge's `/api/auth/sessions/current`; the user id is taken
 * from that validated response, never from a query parameter, so a
 * client cannot list someone else's quotes.
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
    const quotes = await listQuotesForUser(user.id);
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
