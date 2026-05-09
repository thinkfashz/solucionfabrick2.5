/**
 * Crypto-grade password hashing for the admin owner password.
 *
 * Why a *second* layer on top of InsForge auth?
 * ─────────────────────────────────────────────
 * `insforge.auth.signInWithPassword` is opaque to us — we don't control its
 * hash parameters, salting, or the storage format. By stacking a local
 * scrypt+pepper verification *after* the InsForge call, an attacker that
 * compromises the InsForge user table still cannot log in: they would
 * additionally need the `ADMIN_PASSWORD_PEPPER` env var, which only lives
 * on the application host (Vercel) and never touches the database.
 *
 * Algorithm: scrypt (RFC 7914) — Node built-in, OWASP-approved, no new deps.
 *   • N = 2^17 (131072) — memory hardness ~128 MiB
 *   • r = 8, p = 1
 *   • 16-byte random salt per hash
 *   • 32-byte derived key
 *   • Pepper appended to the password before hashing (HMAC-style suffix)
 *
 * Wire format (self-describing, parameter-agnostic):
 *   `scrypt$N$r$p$salt_b64$hash_b64`
 *
 * Backward compatibility: if a row has no `password_hash`, the local layer
 * is *skipped* — only InsForge auth gates the login. Operators opt-in by
 * running `npm run admin:set-password` once.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// OWASP Password Storage Cheat Sheet (2024) recommended scrypt params.
// N=131072 with r=8 → ~128 MiB memory per hash → ~250ms on a modern CPU.
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024; // 256 MiB headroom for scrypt's internal buffers
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Returns the configured pepper, or empty string if unset. We accept "no
 * pepper" so test suites and local dev can run without configuring a
 * 32-byte secret. In production, callers SHOULD verify the pepper is set
 * (see {@link assertPepperConfigured}).
 */
function getPepper(): string {
  return process.env.ADMIN_PASSWORD_PEPPER ?? '';
}

/** Throws if running in production without a pepper configured. */
export function assertPepperConfigured(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD_PEPPER) {
    throw new Error(
      'ADMIN_PASSWORD_PEPPER environment variable is required in production. ' +
        'Generate one with: openssl rand -base64 48'
    );
  }
}

/**
 * Hashes a plaintext password with scrypt + the configured pepper.
 *
 * @returns A self-contained string of the form `scrypt$N$r$p$salt_b64$hash_b64`.
 *          Store this directly in the `admin_users.password_hash` column.
 */
export async function hashAdminPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password must be a non-empty string');
  }
  if (password.length < 12) {
    // Soft floor — the actual policy lives in the CLI / UI, but we refuse
    // anything shorter than 12 chars at the crypto layer too.
    throw new Error('password must be at least 12 characters');
  }
  const salt = randomBytes(SALT_LENGTH);
  const peppered = password + getPepper();
  const derived = await scrypt(peppered, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

/**
 * Verifies a plaintext password against a stored hash in constant time.
 *
 * Returns `false` for any malformed/unknown hash format — never throws on
 * bad input so the login route can treat it as "wrong password" without
 * leaking timing differences.
 */
export async function verifyAdminPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (
    typeof password !== 'string' ||
    typeof storedHash !== 'string' ||
    password.length === 0 ||
    storedHash.length === 0
  ) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  // Defensive bounds: refuse absurd values that would either be insecure
  // (too low) or DoS the process (too high). Matches OWASP's range.
  if (N < 16384 || N > 1048576 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], 'base64');
    expected = Buffer.from(parts[5], 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  const peppered = password + getPepper();
  let derived: Buffer;
  try {
    derived = await scrypt(peppered, salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
  } catch {
    return false;
  }

  // timingSafeEqual requires equal-length buffers; we already ensured that.
  return timingSafeEqual(derived, expected);
}

/**
 * Returns true if the given string looks like a value produced by
 * {@link hashAdminPassword}. Cheap structural check — does NOT verify the
 * hash is valid scrypt output.
 */
export function isAdminPasswordHash(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parts = value.split('$');
  return parts.length === 6 && parts[0] === 'scrypt';
}
