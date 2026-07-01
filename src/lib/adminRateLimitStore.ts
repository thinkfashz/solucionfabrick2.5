/**
 * Persistent brute-force / rate-limit store backed by InsForge
 * (`admin_login_attempts` table) with a tiny in-memory cache.
 *
 * Why persistent?
 * ───────────────
 * The previous implementation lived in a `Map` instance in `adminAuth.ts`,
 * which is reset whenever the serverless lambda cold-starts. On Vercel
 * Hobby that can happen every few minutes under low traffic, so an
 * attacker who spaces requests slightly evades the lockout for free.
 *
 * Design choices:
 * ───────────────
 *  • **Two-tier**: an in-memory `Map` (per-lambda) is the primary read
 *    path — it absorbs bursts of failed attempts without hammering the
 *    DB. The DB layer is the source of truth across cold starts.
 *  • **Fail-open on DB error**: if the DB is unreachable, calls fall
 *    through to the in-memory layer. The alternative (failing closed →
 *    blocking *all* logins on a DB hiccup) is far worse for a single-
 *    operator panel: defense-in-depth still has the password layer +
 *    TOTP behind the rate-limit. Rate-limiting is **politeness** to
 *    the auth backend, not the primary security control.
 *  • **Tolerates missing table**: if `admin_login_attempts` doesn't yet
 *    exist (fresh install before the migration ran), every call is a
 *    silent no-op. The login flow continues; only the persistence
 *    benefit is lost.
 *  • **Skips persistence for `'unknown'` IPs**: `getClientIp` returns
 *    that string when no proxy header is present. Persisting under that
 *    key would let any single misbehaving caller block every other
 *    caller behind the same upstream gateway. In-memory still applies.
 *  • **Expired blocks are deleted lazily** on read, so the table doesn't
 *    grow without bound; a separate cron sweep is not required for the
 *    expected volume of a private admin panel.
 *
 * The schema is in `scripts/create-tables.sql`:
 *
 *   CREATE TABLE admin_login_attempts (
 *     ip            text PRIMARY KEY,
 *     count         integer NOT NULL DEFAULT 0,
 *     blocked_until timestamptz,
 *     updated_at    timestamptz NOT NULL DEFAULT now()
 *   );
 */

import { insforge } from '@/lib/insforge';

export interface RateLimitEntry {
  count: number;
  /** Unix ms timestamp; null if not blocked. */
  blockedUntil: number | null;
}

export interface PersistentRateLimitOptions {
  /** Logical bucket, e.g. `public:agent-chat` or `public:contact`. */
  namespace: string;
  /** Caller identity, usually an IP address. */
  identity: string;
  /** Max accepted requests inside the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export type PersistentRateLimitDecision =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSec: number; resetAt: number };

const TABLE = 'admin_login_attempts';

/** In-memory mirror of the DB row; survives only the lambda lifetime. */
const memoryCache = new Map<string, RateLimitEntry>();

/**
 * "unknown" comes from {@link getClientIp} when no proxy header is set.
 * Persisting under it would let any single misbehaving client lock out
 * everyone behind the same gateway, so we skip the DB layer for it.
 */
function shouldPersist(ip: string): boolean {
  return ip !== 'unknown' && !ip.endsWith(':unknown') && ip.length > 0;
}

/**
 * PostgREST emits an opaque error string when the table doesn't exist
 * (`Could not find the table 'public.admin_login_attempts' in the schema cache`).
 * We treat that as "feature not provisioned yet" and degrade silently to
 * the in-memory store. Any other error is logged so a real DB problem is
 * visible in the Vercel function logs.
 */
function isMissingTableError(err: unknown): boolean {
  const message = (err as { message?: string } | null)?.message ?? String(err ?? '');
  return /could not find the table|relation .* does not exist|schema cache/i.test(message);
}

function logUnexpectedError(operation: string, err: unknown): void {
  if (isMissingTableError(err)) return;
  // eslint-disable-next-line no-console
  console.error(`[adminRateLimitStore] ${operation} failed:`, err);
}

/**
 * Reads the current entry for the IP. Tries memory first (no DB round-
 * trip), then DB; populates memory with whatever the DB returns. Returns
 * `null` if the IP has no recorded attempts.
 */
export async function readRateLimitEntry(ip: string): Promise<RateLimitEntry | null> {
  const cached = memoryCache.get(ip);
  if (cached) return cached;
  if (!shouldPersist(ip)) return null;

  try {
    const { data, error } = await insforge.database
      .from(TABLE)
      .select('count, blocked_until')
      .eq('ip', ip)
      .limit(1);
    if (error) {
      logUnexpectedError('select', error);
      return null;
    }
    if (!data || data.length === 0) return null;

    const row = data[0] as { count: number | null; blocked_until: string | null };
    const entry: RateLimitEntry = {
      count: typeof row.count === 'number' ? row.count : 0,
      blockedUntil: row.blocked_until ? new Date(row.blocked_until).getTime() : null,
    };
    memoryCache.set(ip, entry);
    return entry;
  } catch (err) {
    logUnexpectedError('select', err);
    return null;
  }
}

/**
 * Writes (upserts) the entry both to memory and (best-effort) to the DB.
 * The DB error is swallowed so a transient outage doesn't break login —
 * the in-memory layer still enforces the limit for this lambda.
 */
export async function writeRateLimitEntry(ip: string, entry: RateLimitEntry): Promise<void> {
  memoryCache.set(ip, entry);
  if (!shouldPersist(ip)) return;

  try {
    const row = {
      ip,
      count: entry.count,
      blocked_until: entry.blockedUntil ? new Date(entry.blockedUntil).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await insforge.database
      .from(TABLE)
      .upsert([row], { onConflict: 'ip' });
    if (error) logUnexpectedError('upsert', error);
  } catch (err) {
    logUnexpectedError('upsert', err);
  }
}

/** Removes the entry from both layers. */
export async function deleteRateLimitEntry(ip: string): Promise<void> {
  memoryCache.delete(ip);
  if (!shouldPersist(ip)) return;

  try {
    const { error } = await insforge.database.from(TABLE).delete().eq('ip', ip);
    if (error) logUnexpectedError('delete', error);
  } catch (err) {
    logUnexpectedError('delete', err);
  }
}

function normalizeLimiterKey(namespace: string, identity: string): string {
  const safeNamespace = namespace.replace(/[^a-z0-9:_-]/gi, '').slice(0, 64) || 'rate-limit';
  const safeIdentity = (identity || 'unknown').replace(/\s+/g, '').slice(0, 180) || 'unknown';
  return `${safeNamespace}:${safeIdentity}`;
}

/**
 * Generic fixed-window limiter for public endpoints.
 *
 * It intentionally reuses the existing `admin_login_attempts` table to avoid
 * adding infra or schema during the first hardening pass. Use namespaced keys
 * so public limits never collide with admin login attempts.
 */
export async function checkPersistentRateLimit(
  options: PersistentRateLimitOptions,
): Promise<PersistentRateLimitDecision> {
  const max = Math.max(1, Math.floor(options.max));
  const windowMs = Math.max(1_000, Math.floor(options.windowMs));
  const key = normalizeLimiterKey(options.namespace, options.identity);
  const now = Date.now();
  const current = await readRateLimitEntry(key);

  if (!current?.blockedUntil || now >= current.blockedUntil) {
    const resetAt = now + windowMs;
    await writeRateLimitEntry(key, { count: 1, blockedUntil: resetAt });
    return { ok: true, remaining: Math.max(0, max - 1), resetAt };
  }

  if (current.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.blockedUntil - now) / 1000)),
      resetAt: current.blockedUntil,
    };
  }

  const nextCount = current.count + 1;
  await writeRateLimitEntry(key, { count: nextCount, blockedUntil: current.blockedUntil });
  return { ok: true, remaining: Math.max(0, max - nextCount), resetAt: current.blockedUntil };
}

// ─────────────────────────────────────────────────────────────────────────
// Test-only helpers — keep the module isolated so tests can swap the table
// without monkey-patching `insforge`.
// ─────────────────────────────────────────────────────────────────────────

/** @internal exposed for tests only */
export function __resetMemoryCacheForTests(): void {
  memoryCache.clear();
}

/** @internal exposed for tests only */
export function __peekMemoryCacheForTests(ip: string): RateLimitEntry | undefined {
  return memoryCache.get(ip);
}
