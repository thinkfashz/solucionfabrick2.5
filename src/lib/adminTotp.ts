/**
 * RFC 6238 TOTP (Time-based One-Time Password) — pure, dependency-free.
 *
 * Why hand-rolled?
 * ────────────────
 * The TOTP spec is small (HOTP + a time counter) and battle-tested algorithms
 * (HMAC-SHA1) live in Node's `crypto` module. Adding `otplib`/`speakeasy` for
 * 80 lines of code would only bloat the bundle and pull in a transitive
 * supply-chain risk for code that runs on the auth path. We keep this file
 * intentionally tiny and audited.
 *
 * Compatibility:
 *   • Algorithm: HMAC-SHA1 (the universal default — every authenticator app
 *     supports it; SHA256/SHA512 are not — Google Authenticator e.g. ignores
 *     non-default algorithm hints in the otpauth URL).
 *   • Digits: 6
 *   • Period: 30 seconds
 *   • Window: ±1 step (60 s of clock skew tolerated on each side)
 *
 * Security notes:
 *   • {@link verifyTotp} is constant-time.
 *   • {@link generateBase32Secret} uses `randomBytes` and 20 bytes of entropy
 *     (160 bits) — RFC 4226 §4 recommended length, matches the HMAC-SHA1
 *     block reduction.
 *   • The secret itself is NEVER stored in plaintext: callers must wrap it
 *     with {@link encryptTotpSecret} from `./adminTotpCrypto.ts` before
 *     persisting to `admin_users.totp_secret_enc`.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const RFC4648_BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** TOTP defaults. Constants — do not parameterise without versioning. */
export const TOTP_DEFAULTS = Object.freeze({
  digits: 6,
  periodSeconds: 30,
  algorithm: 'sha1' as const,
  window: 1,
});

// ─────────────────────────────────────────────────────────────────────────
// Base32 (RFC 4648 §6) — no padding, uppercase. Authenticator apps strip
// whitespace and accept upper/lower case but emit no padding.
// ─────────────────────────────────────────────────────────────────────────

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += RFC4648_BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += RFC4648_BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

export function decodeBase32(input: string): Buffer {
  // Tolerate user copy-paste: strip whitespace and padding, accept mixed
  // case. Reject any character outside the alphabet.
  const cleaned = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  if (cleaned.length === 0) {
    throw new Error('Empty base32 input');
  }
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = RFC4648_BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${JSON.stringify(ch)}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

// ─────────────────────────────────────────────────────────────────────────
// TOTP core
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generates a fresh TOTP secret (160 bits, base32-encoded). Suitable for any
 * authenticator app and for the otpauth:// URL.
 */
export function generateBase32Secret(): string {
  return encodeBase32(randomBytes(20));
}

/**
 * Computes the TOTP code for a specific 30-second time step. Exported for
 * tests against RFC 6238 Appendix B vectors and for the CLI which needs to
 * show the "current code" at enrol time so the user can confirm the secret
 * is wired up correctly without typing into their app first.
 */
export function generateTotp(
  secretBase32: string,
  timeStep: number,
  digits: number = TOTP_DEFAULTS.digits
): string {
  const key = decodeBase32(secretBase32);
  // 8-byte big-endian counter
  const counter = Buffer.alloc(8);
  // JS bitwise ops are 32-bit; split safely.
  const high = Math.floor(timeStep / 0x100000000);
  const low = timeStep >>> 0;
  counter.writeUInt32BE(high, 0);
  counter.writeUInt32BE(low, 4);

  const hmac = createHmac(TOTP_DEFAULTS.algorithm, key).update(counter).digest();
  // Dynamic truncation (RFC 4226 §5.3)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return (binCode % mod).toString().padStart(digits, '0');
}

/** Returns the time step for the given Unix-millisecond timestamp. */
export function timeStepFor(unixMs: number = Date.now(), period: number = TOTP_DEFAULTS.periodSeconds): number {
  return Math.floor(unixMs / 1000 / period);
}

/**
 * Verifies a 6-digit code against the secret with a ±window-step tolerance.
 * Returns `false` (never throws) on malformed input so the login route can
 * treat it uniformly as "wrong code".
 *
 * Constant-time: every comparison runs through `timingSafeEqual` and we
 * always iterate the full window, even on early match.
 */
export function verifyTotp(
  code: string,
  secretBase32: string,
  options: { now?: number; window?: number; digits?: number; period?: number } = {}
): boolean {
  const digits = options.digits ?? TOTP_DEFAULTS.digits;
  const period = options.period ?? TOTP_DEFAULTS.periodSeconds;
  const window = options.window ?? TOTP_DEFAULTS.window;

  // Sanitise: authenticator apps insert spaces ("123 456"). Reject anything
  // that's not a fixed-length numeric string after cleaning.
  const cleaned = (code ?? '').replace(/\s+/g, '');
  if (cleaned.length !== digits || !/^[0-9]+$/.test(cleaned)) {
    return false;
  }
  if (typeof secretBase32 !== 'string' || secretBase32.length === 0) {
    return false;
  }

  let baseStep: number;
  try {
    baseStep = timeStepFor(options.now, period);
  } catch {
    return false;
  }

  const expectedBuf = Buffer.from(cleaned, 'utf8');
  let matched = false;
  for (let offset = -window; offset <= window; offset++) {
    let candidate: string;
    try {
      candidate = generateTotp(secretBase32, baseStep + offset, digits);
    } catch {
      // Bad secret → all candidates fail; keep iterating to preserve timing.
      candidate = '';
    }
    const candidateBuf = Buffer.from(candidate.padEnd(digits, '\0'), 'utf8');
    if (
      candidateBuf.length === expectedBuf.length &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      matched = true;
      // Don't break — keep looping to keep verification time independent of
      // *which* offset matched (mitigates side-channel time-leak about clock
      // drift, which can hint at the user's machine state).
    }
  }
  return matched;
}

// ─────────────────────────────────────────────────────────────────────────
// otpauth:// URL — what the QR code encodes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Builds the `otpauth://totp/...` URL that authenticator apps consume. The
 * caller can paste it into a QR generator (or render a QR in the UI later).
 *
 * Format: `otpauth://totp/{issuer}:{account}?secret=...&issuer=...&...`
 */
export function buildOtpAuthUrl(params: {
  secretBase32: string;
  issuer: string;
  account: string;
  digits?: number;
  period?: number;
}): string {
  const issuer = encodeURIComponent(params.issuer);
  const account = encodeURIComponent(params.account);
  const qs = new URLSearchParams({
    secret: params.secretBase32,
    issuer: params.issuer,
    algorithm: TOTP_DEFAULTS.algorithm.toUpperCase(),
    digits: String(params.digits ?? TOTP_DEFAULTS.digits),
    period: String(params.period ?? TOTP_DEFAULTS.periodSeconds),
  });
  return `otpauth://totp/${issuer}:${account}?${qs.toString()}`;
}
