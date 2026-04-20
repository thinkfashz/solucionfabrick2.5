/**
 * Admin authentication helpers: rate limiting + session management.
 * Rate limit store is in-memory — resets on server restart (suitable for Edge/Node runtime).
 */

const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitEntry {
  count: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

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
  rol?: 'superadmin' | 'admin' | 'viewer';
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
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret ?? 'fabrick-admin-dev-only-secret'),
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
