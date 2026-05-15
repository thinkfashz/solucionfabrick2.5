/**
 * Generic fixed-window rate limiter backed by InsForge + in-memory cache.
 *
 * Architecture mirrors adminRateLimitStore.ts:
 *  - Two-tier: in-memory Map (per-lambda) is the hot path; InsForge DB
 *    provides persistence across cold starts so limits survive restarts.
 *  - Fail-open on DB error: if the database is unreachable, in-memory
 *    counters still enforce the limit for the duration of the lambda.
 *  - "unknown" IPs are tracked in memory only — persisting a shared key
 *    would let one caller behind a gateway block everyone else.
 *  - Expired windows are overwritten lazily on the next request; no cron
 *    sweep is needed at the expected volume of public forms.
 *
 * DB schema (scripts/create-rate-limits-table.sql):
 *   CREATE TABLE public.rate_limits (
 *     key        text PRIMARY KEY,   -- "{prefix}:{ip}"
 *     count      integer NOT NULL DEFAULT 1,
 *     reset_at   timestamptz NOT NULL,
 *     updated_at timestamptz NOT NULL DEFAULT now()
 *   );
 */
import 'server-only';
import { insforge } from '@/lib/insforge';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Short label identifying the endpoint group, e.g. 'leads', 'checkout'. */
  prefix: string;
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** false → respond with 429 before processing the request. */
  ok: boolean;
  /** Seconds until the window resets (use as Retry-After header value). */
  retryAfterSecs: number;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  count: number;
  resetAt: number; // Unix ms
}

const memCache = new Map<string, CacheEntry>();

// ── Helpers ──────────────────────────────────────────────────────────────────

const TABLE = 'rate_limits';

function cacheKey(prefix: string, ip: string): string {
  return `${prefix}:${ip}`;
}

function shouldPersist(ip: string): boolean {
  return ip !== 'unknown' && ip.length > 0;
}

function isMissingTableError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? String(err ?? '');
  return /could not find the table|relation .* does not exist|schema cache/i.test(msg);
}

function logError(op: string, err: unknown): void {
  if (isMissingTableError(err)) return;
  console.error(`[rateLimit] ${op}:`, err);
}

async function readDb(key: string): Promise<CacheEntry | null> {
  try {
    const { data, error } = await insforge.database
      .from(TABLE)
      .select('count, reset_at')
      .eq('key', key)
      .limit(1);
    if (error) { logError('read', error); return null; }
    if (!data || data.length === 0) return null;
    const row = data[0] as { count: number; reset_at: string };
    return { count: row.count, resetAt: new Date(row.reset_at).getTime() };
  } catch (err) {
    logError('read', err);
    return null;
  }
}

async function upsertDb(key: string, count: number, resetAt: number): Promise<void> {
  try {
    const { error } = await insforge.database.from(TABLE).upsert(
      [{ key, count, reset_at: new Date(resetAt).toISOString(), updated_at: new Date().toISOString() }],
      { onConflict: 'key' },
    );
    if (error) logError('upsert', error);
  } catch (err) {
    logError('upsert', err);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks and increments the rate-limit counter for the given request IP.
 * Returns { ok: true } when the request is within the window limit, or
 * { ok: false, retryAfterSecs } when the limit is exceeded.
 *
 * Call this at the very start of a route handler before any other work:
 *
 *   const rl = await checkRateLimit(request, { prefix: 'leads', limit: 5, windowMs: 60 * 60 * 1000 });
 *   if (!rl.ok) return rateLimitResponse(rl.retryAfterSecs);
 */
export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const ip = getIp(request);
  const key = cacheKey(config.prefix, ip);
  const { limit, windowMs } = config;
  const now = Date.now();

  // ── Hot path: valid entry already in memory ────────────────────────────
  const cached = memCache.get(key);
  if (cached && now < cached.resetAt) {
    if (cached.count >= limit) {
      return { ok: false, retryAfterSecs: Math.ceil((cached.resetAt - now) / 1000) };
    }
    cached.count += 1;
    if (shouldPersist(ip)) void upsertDb(key, cached.count, cached.resetAt);
    return { ok: true, retryAfterSecs: 0 };
  }

  // ── Cold path: read from DB (or start a new window) ────────────────────
  const dbRow = shouldPersist(ip) ? await readDb(key) : null;
  const windowAlive = dbRow !== null && now < dbRow.resetAt;

  if (windowAlive && dbRow!.count >= limit) {
    memCache.set(key, { count: dbRow!.count, resetAt: dbRow!.resetAt });
    return { ok: false, retryAfterSecs: Math.ceil((dbRow!.resetAt - now) / 1000) };
  }

  const newCount = windowAlive ? dbRow!.count + 1 : 1;
  const resetAt = windowAlive ? dbRow!.resetAt : now + windowMs;
  memCache.set(key, { count: newCount, resetAt });
  if (shouldPersist(ip)) void upsertDb(key, newCount, resetAt);

  return { ok: true, retryAfterSecs: 0 };
}

/**
 * Extracts the real client IP from common reverse-proxy headers.
 * Uses the last entry in X-Forwarded-For to avoid spoofing by the caller.
 */
export function getIp(request: Request): string {
  const xfp = request.headers.get('x-forwarded-for');
  if (xfp) {
    // Take the last hop — the one added by the trusted proxy, not the client.
    const parts = xfp.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
}

/** Standard 429 response with Retry-After header. */
export function rateLimitResponse(retryAfterSecs: number): Response {
  return new Response(
    JSON.stringify({ error: 'Demasiadas solicitudes. Por favor, intente más tarde.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSecs > 0 ? retryAfterSecs : 60),
      },
    },
  );
}

// ── Preset configs ────────────────────────────────────────────────────────────
// Single source of truth so individual routes don't hard-code numbers.

export const RATE_LIMITS = {
  /** Public contact / lead form */
  leads: { prefix: 'leads', limit: 5, windowMs: 60 * 60 * 1000 },
  /** Checkout / order creation */
  checkout: { prefix: 'checkout', limit: 10, windowMs: 15 * 60 * 1000 },
  /** Service quote (cotizaciones) */
  cotizaciones: { prefix: 'cotizaciones', limit: 5, windowMs: 60 * 60 * 1000 },
  /** Quote builder (quotes) */
  quotes: { prefix: 'quotes', limit: 5, windowMs: 60 * 60 * 1000 },
  /** Public blog comments */
  comments: { prefix: 'comments', limit: 5, windowMs: 10 * 60 * 1000 },
  /** Coupon code validation — generous limit to not frustrate legitimate shoppers */
  coupons: { prefix: 'coupons', limit: 20, windowMs: 5 * 60 * 1000 },
  /** Push notification subscription */
  pushSubscribe: { prefix: 'push-subscribe', limit: 5, windowMs: 60 * 60 * 1000 },
  /** Admin password recovery finalization */
  pwRecover: { prefix: 'pw-recover', limit: 5, windowMs: 15 * 60 * 1000 },
} satisfies Record<string, RateLimitConfig>;
