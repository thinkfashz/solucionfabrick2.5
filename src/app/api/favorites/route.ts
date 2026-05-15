import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { listFavoritesForUser, toggleFavorite } from '@/lib/favorites';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * GET /api/favorites — list favorites for the authenticated user.
 *
 * Auth: client passes its InsForge access token via `Authorization: Bearer <token>`.
 * Returns 401 if no session — favorites are reserved for registered customers.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getInsforgeUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado.', code: 'UNAUTHENTICATED', favorites: [] },
        { status: 401, headers: NO_STORE },
      );
    }
    const favorites = await listFavoritesForUser(user.id);
    return NextResponse.json(
      { favorites, productIds: favorites.map((f) => f.product_id) },
      { headers: NO_STORE },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'FAVORITES_LIST_FAILED', favorites: [] },
      { status: 500, headers: NO_STORE },
    );
  }
}

/**
 * POST /api/favorites — toggle a product in the user's favorites list.
 *
 * Body: { productId: string }
 * Returns: { state: 'added' | 'removed' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getInsforgeUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Inicia sesión para guardar favoritos.', code: 'UNAUTHENTICATED' },
        { status: 401, headers: NO_STORE },
      );
    }
    const raw = await request.json().catch(() => ({}));
    const parsed = parse({ productId: v.string({ required: true, min: 1, max: 255 }) }, raw);
    if (!parsed.ok) return validationError(parsed.errors);
    const productId = parsed.data.productId as string;
    const result = await toggleFavorite(user.id, productId);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'FAVORITES_TOGGLE_FAILED' },
      { status: 500, headers: NO_STORE },
    );
  }
}
