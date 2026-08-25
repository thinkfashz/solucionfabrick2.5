import { NextResponse } from 'next/server';
import { getQuoteById } from '@/lib/budget';
import { getTenantIdFromHeaders } from '@/lib/tenant-edge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/quotes/[id] — fetch a saved quote inside the current tenant.
 *
 * The UUID still works as the share token, but a link can only resolve from
 * the same tenant/domain where the quote belongs.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const tenantId = getTenantIdFromHeaders(request.headers);
    const quote = await getQuoteById(id, tenantId);
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
