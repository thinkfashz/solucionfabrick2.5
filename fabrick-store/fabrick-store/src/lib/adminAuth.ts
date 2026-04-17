/**
 * Admin authentication helpers: rate limiting + session management.
 * Rate limit store is in-memory — resets on server restart (suitable for Edge/Node runtime).
 */

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Returns true if the IP is currently blocked. */
export function isRateLimited(ip: string): boolean {
  const entry = rateLimitStore.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;
  // Block expired — clean up
  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    rateLimitStore.delete(ip);
  }
  return false;
}

/** Records a failed login attempt for the IP. */
export function recordFailedAttempt(ip: string): void {
  const entry = rateLimitStore.get(ip) ?? { count: 0, blockedUntil: null };
  entry.count += 1;
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
  }
  rateLimitStore.set(ip, entry);
}

/** Clears failed attempts for the IP after a successful login. */
export function clearFailedAttempts(ip: string): void {
  rateLimitStore.delete(ip);
}

/** Returns remaining seconds until the IP is unblocked, or 0. */
export function blockedSecondsRemaining(ip: string): number {
  const entry = rateLimitStore.get(ip);
  if (!entry?.blockedUntil) return 0;
  const remaining = Math.ceil((entry.blockedUntil - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

// ── Session cookie ──────────────────────────────────────────────

export const ADMIN_COOKIE_NAME = 'admin_session';
/** Session TTL: 8 hours */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface AdminSessionPayload {
  email: string;
  exp: number; // Unix ms
}

export function encodeSession(payload: AdminSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeSession(value: string): AdminSessionPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
