import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { removeFavorite } from '@/lib/favorites';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * DELETE /api/favorites/[productId] — remove a single favorite.
 *
 * Idempotent: returns 200 even if the row didn't exist (UI doesn't have to
 * track whether the favorite was actually persisted).
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const user = await getInsforgeUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado.', code: 'UNAUTHENTICATED' },
        { status: 401, headers: NO_STORE },
      );
    }
    const { productId } = await context.params;
    if (!productId) {
      return NextResponse.json(
        { error: 'productId requerido.', code: 'BAD_REQUEST' },
        { status: 400, headers: NO_STORE },
      );
    }
    await removeFavorite(user.id, productId);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'FAVORITES_DELETE_FAILED' },
      { status: 500, headers: NO_STORE },
    );
  }
}
