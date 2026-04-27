import { NextResponse } from 'next/server';
import { getQuoteById } from '@/lib/budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/quotes/[id] — fetch a saved quote.
 *
 * The id itself acts as a lightweight share token (UUIDs are unguessable);
 * anyone with the link can view the cotización. If you ever want stricter
 * access, add a `share_token` column and check it here.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const quote = await getQuoteById(id);
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({ quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'QUOTE_GET_FAILED' },
      { status: 500 },
    );
  }
}
