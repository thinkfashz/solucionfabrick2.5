import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the insforge module BEFORE importing the favorites lib so the lib's
// import resolves to our in-memory fake. This keeps the unit test fully
// hermetic — no DB, no network.
const userId = '11111111-1111-1111-1111-111111111111';
const productId = '22222222-2222-2222-2222-222222222222';

interface Row {
  id: string;
  user_id: string;
  product_id: string;
}
const store: Row[] = [];

function makeQuery() {
  let action: 'select' | 'insert' | 'delete' = 'select';
  let pendingInsert: Array<{ user_id: string; product_id: string }> = [];
  const filters: Record<string, string> = {};
  let limitN = Infinity;

  const exec = async (): Promise<{ data: unknown; error: null }> => {
    if (action === 'insert') {
      const created = pendingInsert.map((row, i) => ({
        id: `row-${store.length + i + 1}`,
        ...row,
      }));
      store.push(...created);
      return { data: created, error: null };
    }
    if (action === 'delete') {
      let i = store.length;
      while (i--) {
        const r = store[i];
        const matches = Object.entries(filters).every(
          ([k, v]) => (r as unknown as Record<string, string>)[k] === v,
        );
        if (matches) store.splice(i, 1);
      }
      return { data: null, error: null };
    }
    let rows = store.filter((r) =>
      Object.entries(filters).every(
        ([k, v]) => (r as unknown as Record<string, string>)[k] === v,
      ),
    );
    if (limitN !== Infinity) rows = rows.slice(0, limitN);
    return { data: rows, error: null };
  };

  interface Builder extends PromiseLike<unknown> {
    select: (cols?: string) => Builder;
    insert: (rows: Array<{ user_id: string; product_id: string }>) => Builder;
    delete: () => Builder;
    eq: (col: string, val: string) => Builder;
    order: (col: string, opts?: unknown) => Builder;
    limit: (n: number) => Builder;
  }

  const builder: Builder = {
    select(_cols?: string) {
      // After insert/delete, .select() does NOT reset the action — it just
      // asks PostgREST to return the affected rows. Only treat select as a
      // pure read when no other action has been issued yet.
      if (action === 'select') action = 'select';
      return builder;
    },
    insert(rows) {
      action = 'insert';
      pendingInsert = rows;
      return builder;
    },
    delete() {
      action = 'delete';
      return builder;
    },
    eq(col, val) {
      filters[col] = val;
      return builder;
    },
    order(_col, _opts?) {
      return builder;
    },
    limit(n) {
      limitN = n;
      return builder;
    },
    then(resolve, reject) {
      return exec().then(resolve, reject);
    },
  };
  return builder;
}

vi.mock('@/lib/insforge', () => ({
  insforge: {
    database: {
      from: (_table: string) => makeQuery(),
    },
  },
}));

import { toggleFavorite, listFavoritesForUser, removeFavorite } from '@/lib/favorites';

beforeEach(() => {
  store.length = 0;
});

describe('favorites toggle', () => {
  it('adds a favorite the first time, then removes it', async () => {
    const a = await toggleFavorite(userId, productId);
    expect(a.state).toBe('added');
    expect(store).toHaveLength(1);

    const b = await toggleFavorite(userId, productId);
    expect(b.state).toBe('removed');
    expect(store).toHaveLength(0);
  });

  it('rejects invalid uuids', async () => {
    await expect(toggleFavorite('not-a-uuid', productId)).rejects.toThrow();
    await expect(toggleFavorite(userId, 'not-a-uuid')).rejects.toThrow();
  });
});

describe('favorites list/remove', () => {
  it('listFavoritesForUser returns only the user own rows', async () => {
    await toggleFavorite(userId, productId);
    const otherUser = '99999999-9999-9999-9999-999999999999';
    await toggleFavorite(otherUser, productId);

    const list = await listFavoritesForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0].user_id).toBe(userId);
  });

  it('listFavoritesForUser returns [] for invalid user id', async () => {
    const list = await listFavoritesForUser('garbage');
    expect(list).toEqual([]);
  });

  it('removeFavorite is a no-op when nothing matches', async () => {
    await removeFavorite(userId, productId);
    expect(store).toHaveLength(0);
  });

  it('removeFavorite drops the matching row', async () => {
    await toggleFavorite(userId, productId);
    expect(store).toHaveLength(1);
    await removeFavorite(userId, productId);
    expect(store).toHaveLength(0);
  });
});
