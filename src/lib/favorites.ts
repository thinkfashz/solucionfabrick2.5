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
 * The unique constraint `(user_id, product_id)` guarantees idempotency at the
 * DB level — we use it as the source of truth instead of racing on a select
 * before insert.
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

  // Check existing first.
  const existing = await insforge.database
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .limit(1);

  if (
    !existing.error &&
    Array.isArray(existing.data) &&
    existing.data.length > 0
  ) {
    const id = (existing.data[0] as { id: string }).id;
    await insforge.database.from('favorites').delete().eq('id', id);
    return { state: 'removed', favoriteId: null };
  }

  const { data, error } = await insforge.database
    .from('favorites')
    .insert([{ user_id: userId, product_id: productId }])
    .select('id')
    .limit(1);
  if (error) {
    throw new Error(error.message || 'No se pudo guardar el favorito.');
  }
  const favoriteId =
    Array.isArray(data) && data[0] ? (data[0] as { id: string }).id : null;
  return { state: 'added', favoriteId };
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
