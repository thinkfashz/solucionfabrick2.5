/**
 * Admin authentication helpers: rate limiting + session management.
 *
 * Rate-limit functions are **async** since Phase 1.7 of the privatization
 * plan: the counters are now persisted to the `admin_login_attempts` table
 * via {@link adminRateLimitStore} so they survive serverless cold starts.
 * A short-lived per-lambda in-memory cache lives in that store to keep
 * the hot path fast.
 */

import { timingSafeEqual } from 'node:crypto';
import {
  readRateLimitEntry,
  writeRateLimitEntry,
  deleteRateLimitEntry,
  type RateLimitEntry,
} from '@/lib/adminRateLimitStore';

const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Constant-time string comparison. Returns `false` on length mismatch (early
 * return is OK there because secret-length is not itself a useful leak — an
 * attacker who can probe length already knows the secret format) and on
 * either side being empty/whitespace. Otherwise dispatches to
 * `node:crypto.timingSafeEqual` so the comparison body does not leak
 * positional match info through cache or branch timing.
 *
 * Used by `/api/admin/init-account` to validate the bootstrap header without
 * an oracle. Kept in this file so the small set of admin-auth primitives
 * lives in one place.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const at = a.trim();
  const bt = b.trim();
  if (at.length === 0 || bt.length === 0) return false;
  const ab = Buffer.from(at, 'utf8');
  const bb = Buffer.from(bt, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * True iff the caller proved knowledge of `ADMIN_INIT_SECRET`. Centralised
 * here so the same logic can be reused by other bootstrap endpoints in the
 * future without re-implementing the constant-time compare.
 *
 * `expected` is the env-configured secret; `provided` is the value the
 * client sent in the `x-admin-init-secret` header. Both are trimmed before
 * comparison.
 */
export function validateInitSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  return timingSafeStringEqual(provided, expected);
}

/** Resolve client IP from proxy headers (x-real-ip / x-forwarded-for). */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[parts.length - 1].trim();
  }
  return 'unknown';
}

/** Returns true if the IP is currently blocked. */
export async function isRateLimited(ip: string): Promise<boolean> {
  const entry = await readRateLimitEntry(ip);
  if (!entry) return false;
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;
  // Block expired — clean up so the next failed attempt starts fresh.
  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    await deleteRateLimitEntry(ip);
  }
  return false;
}

/** Records a failed login attempt for the IP. */
export async function recordFailedAttempt(ip: string): Promise<void> {
  const current = (await readRateLimitEntry(ip)) ?? { count: 0, blockedUntil: null };
  const next: RateLimitEntry = {
    count: current.count + 1,
    blockedUntil: current.blockedUntil,
  };
  if (next.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    next.blockedUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
  }
  await writeRateLimitEntry(ip, next);
}

/** Clears failed attempts for the IP after a successful login. */
export async function clearFailedAttempts(ip: string): Promise<void> {
  await deleteRateLimitEntry(ip);
}

/** Returns remaining seconds until the IP is unblocked, or 0. */
export async function blockedSecondsRemaining(ip: string): Promise<number> {
  const entry = await readRateLimitEntry(ip);
  if (!entry?.blockedUntil) return 0;
  const remaining = Math.ceil((entry.blockedUntil - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

// ── Session cookie ──────────────────────────────────────────────

export const ADMIN_COOKIE_NAME = 'admin_session';
/** Session TTL: 8 hours */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';

/** Canonical options for every cookie written by the admin auth system. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};

/**
 * Options to clear an admin-auth cookie.
 * Both maxAge=0 and a past `expires` are set for maximum browser compatibility.
 */
export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
  expires: new Date(0),
};

export interface AdminSessionPayload {
  email: string;
  exp: number; // Unix ms
  rol?: 'superadmin' | 'admin' | 'viewer';
  /** UUID of the tenant this admin belongs to. Defaults to the original Fabrick tenant. */
  tenant_id?: string;
}

/**
 * Returns the HMAC-SHA256 signing key derived from ADMIN_SESSION_SECRET env var.
 * Falls back to a fixed default if the env var is not set (development only).
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SESSION_SECRET environment variable is required in production.');
    }
    // Development-only fallback — MUST be replaced with a real secret in production
    console.warn('[AdminAuth] ADMIN_SESSION_SECRET is not set. Using insecure dev default.');
  }
  // In production we have already thrown above; in dev the fallback is intentional.
  const effectiveSecret = secret ?? 'fabrick-admin-dev-only-secret';
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(effectiveSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return keyMaterial;
}

/** Creates a signed session token: base64url(payload).base64url(signature) */
export async function encodeSession(payload: AdminSessionPayload): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = Buffer.from(sig).toString('base64url');
  return `${data}.${sigB64}`;
}

/** Verifies the HMAC signature and returns the payload, or null if invalid/expired. */
export async function decodeSession(value: string): Promise<AdminSessionPayload | null> {
  try {
    const dotIdx = value.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const data = value.slice(0, dotIdx);
    const sigB64 = value.slice(dotIdx + 1);

    const key = await getSigningKey();
    const sigBytes = Buffer.from(sigB64, 'base64url');
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the current request carries a valid HMAC-signed admin_session cookie.
 * Used in server components / layouts to gate admin access.
 */
export async function isAdminSession(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const adminSession = (await cookies()).get('admin_session')?.value;
  if (!adminSession) return false;
  const payload = await decodeSession(adminSession).catch(() => null);
  return payload !== null;
}
