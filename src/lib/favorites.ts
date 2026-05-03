import { insforge } from '@/lib/insforge';

export interface FavoriteRow {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** List favorite product ids for a user. */
export async function listFavoritesForUser(userId: string): Promise<FavoriteRow[]> {
  if (!userId || !isUuid(userId)) return [];
  try {
    const { data, error } = await insforge.database
      .from('favorites')
      .select('id, user_id, product_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error || !Array.isArray(data)) return [];
    return data as FavoriteRow[];
  } catch {
    return [];
  }
}

/**
 * Add a favorite if missing, or remove it if it already exists. Returns the
 * resulting state ('added' | 'removed').
 *
 * Implemented as an atomic UPSERT (`INSERT ... ON CONFLICT ON CONSTRAINT
 * favorites_user_product_unique DO NOTHING`) followed — only when the upsert
 * was a no-op — by a `DELETE` keyed on the same unique pair. This avoids the
 * classic TOCTOU race of `SELECT`-then-`INSERT`, where two concurrent
 * requests can both see "no row" and one then crashes with a 23505
 * unique-constraint violation (HTTP 500). With `ignoreDuplicates`, the DB
 * itself enforces atomicity — at worst a concurrent toggle becomes a no-op
 * for one of the two requests, never an error.
 */
export async function toggleFavorite(
  userId: string,
  productId: string,
): Promise<{ state: 'added' | 'removed'; favoriteId: string | null }> {
  if (!isUuid(userId)) {
    throw new Error('userId inválido.');
  }
  if (!isUuid(productId)) {
    throw new Error('productId inválido.');
  }

  // Step 1 — atomic insert-or-noop. PostgREST translates this into
  // `INSERT ... ON CONFLICT (user_id, product_id) DO NOTHING RETURNING ...`,
  // so the unique constraint is the single source of truth and concurrent
  // requests can never produce a 23505. When a row was actually inserted the
  // returned `data` will contain it; when the row pre-existed (the conflict
  // path), `data` is an empty array.
  const upsertRes = await insforge.database
    .from('favorites')
    .upsert([{ user_id: userId, product_id: productId }], {
      onConflict: 'user_id,product_id',
      ignoreDuplicates: true,
    })
    .select('id');

  if (upsertRes.error) {
    throw new Error(
      upsertRes.error.message || 'No se pudo guardar el favorito.',
    );
  }

  const inserted =
    Array.isArray(upsertRes.data) && upsertRes.data.length > 0
      ? (upsertRes.data[0] as { id: string })
      : null;

  if (inserted) {
    // The DB just persisted a brand-new row → toggle is "added".
    return { state: 'added', favoriteId: inserted.id };
  }

  // Step 2 — the upsert was a no-op (row already existed), so the toggle is
  // "removed". Delete keyed on the unique pair; idempotent under concurrency.
  await insforge.database
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  return { state: 'removed', favoriteId: null };
}

/** Remove a specific favorite by (user_id, product_id). Idempotent. */
export async function removeFavorite(userId: string, productId: string): Promise<void> {
  if (!isUuid(userId) || !isUuid(productId)) return;
  await insforge.database
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
}
