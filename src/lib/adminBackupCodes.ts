/**
 * TOTP backup codes — anti-lockout recovery primitive (Fase 1.3b).
 *
 * Why?
 * ────
 * If the admin loses their authenticator device (lost/stolen/wiped phone),
 * the only way back in is `npm run admin:disable-totp` from the hosting
 * shell. That requires DB credentials and command-line access — a recovery
 * path that's both painful and tightly coupled to the infrastructure.
 *
 * Backup codes solve this: the admin keeps 10 single-use codes in a
 * password manager / printout. When TOTP fails, /api/admin/login also
 * tries the supplied digits as a backup code. On a hit, the code is
 * marked consumed (removed from the array) and a normal session cookie
 * is issued.
 *
 * Storage model
 * ─────────────
 *  • `admin_users.backup_codes` — `text[]` of scrypt+pepper hashes.
 *  • Plaintext codes are NEVER stored. They are shown to the operator
 *    exactly once (at generation time) and must be saved offline.
 *  • Reusing the password pepper means a DB dump alone cannot brute-force
 *    backup codes: the attacker also needs `ADMIN_PASSWORD_PEPPER` from
 *    the application host.
 *  • Single-use: after a successful verification the matched hash is
 *    removed from the array and persisted, so the same code cannot be
 *    replayed.
 *
 * Code format
 * ───────────
 *   `XXXX-XXXX-XX` — 10 chars from a 32-symbol alphabet (Crockford-ish
 *   base32, no I/L/O/U) → ~50 bits of entropy per code. Easy to read
 *   off paper, hard to mistype, and trivially distinguishable from a
 *   6-digit TOTP code.
 *
 * Verification is permissive about formatting: spaces, dashes, lower-case,
 * and even surrounding whitespace are normalised before matching, since
 * the user is going to type these from a printout.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// Same OWASP-approved scrypt parameters as adminPasswordHash so the wire
// format is identical and a future migration could collapse helpers.
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Crockford-ish base32 alphabet with confusable letters removed
 * (I, L, O, U). Picked for printability — operators are going to write
 * these on paper.
 */
const BACKUP_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Number of plaintext characters per generated code (excluding the dash). */
const BACKUP_CODE_LENGTH = 10;
/** Default count of codes generated per `generateBackupCodes()` call. */
export const DEFAULT_BACKUP_CODE_COUNT = 10;

function getPepper(): string {
  return process.env.ADMIN_PASSWORD_PEPPER ?? '';
}

/**
 * Generates a single random backup code formatted as `XXXX-XXXX-XX`.
 * Uses rejection sampling on `crypto.randomBytes` to keep the alphabet
 * uniform (32 is a power of two so this is exact, no modulo bias).
 */
function generateOneCode(): string {
  const bytes = randomBytes(BACKUP_CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    // 32 = 2^5, so taking the low 5 bits is unbiased.
    raw += BACKUP_CODE_ALPHABET[bytes[i] & 0x1f];
  }
  // Insert dashes for readability: "XXXX-XXXX-XX".
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`;
}

/**
 * Generates `count` unique backup codes. Returned strings include their
 * pretty-print dashes; callers should display them verbatim.
 */
export function generateBackupCodes(count: number = DEFAULT_BACKUP_CODE_COUNT): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('count must be an integer between 1 and 100');
  }
  const seen = new Set<string>();
  const codes: string[] = [];
  // 32^10 = 2^50 distinct codes. Collisions in 10 draws are astronomically
  // unlikely, but we still de-dup to make the API contract explicit.
  while (codes.length < count) {
    const code = generateOneCode();
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/**
 * Normalises a user-typed code: strips whitespace and dashes, uppercases.
 * Returns the canonical 10-char form. Does NOT validate alphabet — that
 * happens during verify by being a non-match.
 */
export function normalizeBackupCode(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * Hashes a backup code with scrypt + pepper. Wire format identical to
 * password hashes (`scrypt$N$r$p$salt_b64$hash_b64`) on purpose: a future
 * refactor could share verification code, and the format is already
 * battle-tested in this codebase.
 */
export async function hashBackupCode(code: string): Promise<string> {
  const normalized = normalizeBackupCode(code);
  if (normalized.length === 0) {
    throw new Error('backup code must not be empty');
  }
  const salt = randomBytes(SALT_LENGTH);
  const peppered = normalized + getPepper();
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
 * Hashes every code in `codes`. Returned in the same order as the input
 * so callers can keep their own indexing if needed (the login route does
 * not need it, but the CLI prints `Code 1: …` next to each plaintext).
 */
export async function hashBackupCodes(codes: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of codes) {
    out.push(await hashBackupCode(c));
  }
  return out;
}

/**
 * Constant-time check of one plaintext against one stored hash. Returns
 * `false` for any malformed hash (never throws) so callers can iterate
 * over a list without fearing one bad row poisons the whole verification.
 */
async function verifyOne(plaintext: string, storedHash: string): Promise<boolean> {
  if (typeof storedHash !== 'string' || storedHash.length === 0) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
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

  const peppered = plaintext + getPepper();
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
  return timingSafeEqual(derived, expected);
}

export interface BackupCodeVerifyResult {
  /** True if `plaintext` matched one of the stored hashes. */
  ok: boolean;
  /**
   * Hashes that should be persisted back to the DB. On a successful
   * match this is `storedHashes` minus the matched entry (single-use
   * semantics). On a miss it equals the input array. Always a fresh
   * array — never the same reference as the input — so callers can
   * safely write it back without worrying about aliasing.
   */
  remainingHashes: string[];
  /** Number of unused codes left after this verification. */
  remainingCount: number;
}

/**
 * Try `plaintext` against each stored backup-code hash in constant time
 * (every entry is hashed; we don't short-circuit on first miss). On a
 * match, the matched hash is REMOVED from the returned array — single-
 * use semantics. The caller is responsible for persisting
 * `remainingHashes` to the DB on `ok === true`.
 *
 * Returns `{ok: false}` for empty/missing input or empty stored array
 * without performing any scrypt work.
 */
export async function verifyAndConsumeBackupCode(
  plaintext: string,
  storedHashes: readonly string[] | null | undefined
): Promise<BackupCodeVerifyResult> {
  const normalized = normalizeBackupCode(plaintext);
  // Quick structural reject: a typed code that doesn't even have the
  // expected length cannot match anything. Saves a full scrypt loop on
  // accidental empty submissions or 6-digit TOTP attempts that wandered
  // into this branch.
  if (normalized.length !== BACKUP_CODE_LENGTH) {
    return {
      ok: false,
      remainingHashes: Array.isArray(storedHashes) ? [...storedHashes] : [],
      remainingCount: Array.isArray(storedHashes) ? storedHashes.length : 0,
    };
  }
  if (!Array.isArray(storedHashes) || storedHashes.length === 0) {
    return { ok: false, remainingHashes: [], remainingCount: 0 };
  }

  // Verify against every hash to keep timing roughly constant per call.
  // We track the matched index but DO NOT bail early.
  let matchedIndex = -1;
  for (let i = 0; i < storedHashes.length; i++) {
    // eslint-disable-next-line no-await-in-loop -- intentional: serial scrypts keep memory bounded
    const ok = await verifyOne(normalized, storedHashes[i]);
    if (ok && matchedIndex === -1) {
      matchedIndex = i;
    }
  }

  if (matchedIndex === -1) {
    return {
      ok: false,
      remainingHashes: [...storedHashes],
      remainingCount: storedHashes.length,
    };
  }

  const remainingHashes = storedHashes.filter((_, i) => i !== matchedIndex);
  return {
    ok: true,
    remainingHashes,
    remainingCount: remainingHashes.length,
  };
}
