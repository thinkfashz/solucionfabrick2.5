import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listQuotesForUser } from '@/lib/budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/quotes/mine?userId=… — list quotes belonging to a customer.
 *
 * Auth model: the cotizador is unauthenticated by default, so the client
 * passes its InsForge user id (already known via the SDK's `getCurrentUser`
 * call). If you want a stricter model, validate a session cookie here.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') ?? '';
    if (!userId) {
      return NextResponse.json(
        { error: 'Falta userId.', code: 'VALIDATION', quotes: [] },
        { status: 400 },
      );
    }
    const quotes = await listQuotesForUser(userId);
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
