import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We mock the InsForge client so the test never reaches a real backend.
// This lets us simulate: happy path, missing-table error, transient
// connection error, and verify the in-memory cache behaviour.

type RowMap = Map<string, { count: number; blocked_until: string | null }>;

let backingTable: RowMap;
let backendBehavior: 'ok' | 'missing-table' | 'transient-error';

function makeBuilder(action: 'select' | 'upsert' | 'delete', payload?: unknown) {
  // PostgREST-style chainable mock that resolves on `eq()` / `limit()` /
  // direct access to the awaited promise. We only implement the chains the
  // store actually calls.
  const respond = () => {
    if (backendBehavior === 'missing-table') {
      return {
        data: null,
        error: { message: "Could not find the table 'public.admin_login_attempts' in the schema cache" },
      };
    }
    if (backendBehavior === 'transient-error') {
      throw new Error('ECONNRESET');
    }
    return { data: payload, error: null };
  };

  const chain: {
    eq: (col: string, value: string) => typeof chain;
    limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
    then: Promise<{ data: unknown; error: unknown }>['then'];
  } = {
    eq: (_col: string, value: string) => {
      if (action === 'select') {
        const row = backingTable.get(value);
        payload = row ? [row] : [];
      } else if (action === 'delete') {
        backingTable.delete(value);
        payload = null;
      }
      return chain;
    },
    limit: async () => respond(),
    // Allow `await chain` for delete (no .limit chain).
    then: (onFulfilled, onRejected) => {
      try {
        return Promise.resolve(respond()).then(onFulfilled, onRejected);
      } catch (err) {
        return Promise.reject(err).then(onFulfilled, onRejected);
      }
    },
  };
  return chain;
}

vi.mock('@/lib/insforge', () => ({
  insforge: {
    database: {
      from: (_t: string) => ({
        select: () => makeBuilder('select'),
        upsert: (rows: Array<{ ip: string; count: number; blocked_until: string | null }>) => {
          if (backendBehavior === 'missing-table') {
            return Promise.resolve({
              data: null,
              error: { message: 'Could not find the table' },
            });
          }
          if (backendBehavior === 'transient-error') {
            return Promise.reject(new Error('ECONNRESET'));
          }
          for (const r of rows) {
            backingTable.set(r.ip, { count: r.count, blocked_until: r.blocked_until });
          }
          return Promise.resolve({ data: null, error: null });
        },
        delete: () => makeBuilder('delete'),
      }),
    },
  },
}));

import {
  readRateLimitEntry,
  writeRateLimitEntry,
  deleteRateLimitEntry,
  __resetMemoryCacheForTests,
  __peekMemoryCacheForTests,
} from '@/lib/adminRateLimitStore';

describe('adminRateLimitStore', () => {
  beforeEach(() => {
    backingTable = new Map();
    backendBehavior = 'ok';
    __resetMemoryCacheForTests();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for an unknown IP', async () => {
    expect(await readRateLimitEntry('1.2.3.4')).toBeNull();
  });

  it('round-trips count + blockedUntil through the DB and populates the cache', async () => {
    const blockedUntil = Date.now() + 60_000;
    await writeRateLimitEntry('1.2.3.4', { count: 5, blockedUntil });
    // First read: cache hit (no DB query needed)
    expect(__peekMemoryCacheForTests('1.2.3.4')).toEqual({ count: 5, blockedUntil });

    // Bypass the cache to verify DB persistence
    __resetMemoryCacheForTests();
    const entry = await readRateLimitEntry('1.2.3.4');
    expect(entry?.count).toBe(5);
    // ISO round-trip can drift sub-millisecond; allow ±1s
    expect(Math.abs((entry?.blockedUntil ?? 0) - blockedUntil)).toBeLessThan(1000);
  });

  it('deleteRateLimitEntry removes from both layers', async () => {
    await writeRateLimitEntry('5.6.7.8', { count: 3, blockedUntil: null });
    await deleteRateLimitEntry('5.6.7.8');
    expect(__peekMemoryCacheForTests('5.6.7.8')).toBeUndefined();
    expect(backingTable.has('5.6.7.8')).toBe(false);
  });

  it('skips DB persistence for the magic "unknown" IP', async () => {
    await writeRateLimitEntry('unknown', { count: 7, blockedUntil: null });
    // In memory, yes
    expect(__peekMemoryCacheForTests('unknown')).toEqual({ count: 7, blockedUntil: null });
    // In DB, no — otherwise a single misbehaving caller behind a missing
    // proxy header could lock out everyone behind the same gateway.
    expect(backingTable.has('unknown')).toBe(false);
  });

  it('falls through silently when the table does not exist', async () => {
    backendBehavior = 'missing-table';
    // Read from a fresh cache returns null (rather than throwing)
    await expect(readRateLimitEntry('9.9.9.9')).resolves.toBeNull();
    // Write doesn't throw, in-memory entry still stored so this lambda
    // still enforces the limit
    await expect(
      writeRateLimitEntry('9.9.9.9', { count: 1, blockedUntil: null })
    ).resolves.toBeUndefined();
    expect(__peekMemoryCacheForTests('9.9.9.9')).toEqual({ count: 1, blockedUntil: null });
  });

  it('falls through silently on transient DB errors', async () => {
    backendBehavior = 'transient-error';
    await expect(readRateLimitEntry('7.7.7.7')).resolves.toBeNull();
    await expect(
      writeRateLimitEntry('7.7.7.7', { count: 2, blockedUntil: null })
    ).resolves.toBeUndefined();
    // In-memory layer is still authoritative for this lambda
    expect(__peekMemoryCacheForTests('7.7.7.7')).toEqual({ count: 2, blockedUntil: null });
  });

  it('memory cache short-circuits the DB on hot reads', async () => {
    await writeRateLimitEntry('3.3.3.3', { count: 1, blockedUntil: null });
    // Now break the DB; cached read should still succeed
    backendBehavior = 'transient-error';
    const entry = await readRateLimitEntry('3.3.3.3');
    expect(entry).toEqual({ count: 1, blockedUntil: null });
  });
});
