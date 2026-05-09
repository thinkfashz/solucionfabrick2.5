/**
 * AES-256-GCM wrapper for TOTP secrets at rest.
 *
 * The TOTP secret is the *entire* second factor: anyone who can read it can
 * generate valid codes forever. So we never store it in plaintext. We
 * encrypt with AES-256-GCM using a key derived deterministically from
 * `ADMIN_SESSION_SECRET` via HKDF-SHA256 (RFC 5869) — that way operators
 * don't need to manage *another* env var, and rotating the session secret
 * already invalidates every stored secret (which forces re-enrolment, the
 * desired blast radius).
 *
 * Wire format:
 *   `totp-enc:v1:<iv_b64>:<tag_b64>:<ct_b64>`
 *
 * The version segment lets us migrate to AES-GCM-SIV / XChaCha later
 * without breaking older rows.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION_TAG = 'totp-enc:v1';
const HKDF_SALT = Buffer.from('fabrick.admin.totp.v1');
const HKDF_INFO = Buffer.from('admin_users.totp_secret_enc');
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM standard
const TAG_LEN = 16;

function getMasterSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is required to encrypt/decrypt TOTP secrets at rest.'
    );
  }
  return secret;
}

/** Derives a stable 32-byte AES key from ADMIN_SESSION_SECRET via HKDF-SHA256. */
function deriveKey(): Buffer {
  // hkdfSync returns ArrayBuffer-like → wrap in Buffer for the crypto APIs.
  const key = hkdfSync('sha256', getMasterSecret(), HKDF_SALT, HKDF_INFO, KEY_LEN);
  return Buffer.from(key);
}

export function encryptTotpSecret(secretBase32: string): string {
  if (typeof secretBase32 !== 'string' || secretBase32.length === 0) {
    throw new Error('encryptTotpSecret: secret must be a non-empty string');
  }
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION_TAG,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a `totp-enc:v1:...` value back to its base32 secret. Throws on
 * any tampering, format mismatch, or missing master secret — the caller
 * (login route) MUST treat thrown errors as "TOTP misconfigured / refuse
 * login" rather than "code mismatch", since silently bypassing here would
 * downgrade the security guarantee.
 */
export function decryptTotpSecret(payload: string): string {
  if (typeof payload !== 'string') {
    throw new Error('decryptTotpSecret: payload must be a string');
  }
  const parts = payload.split(':');
  // Format: `totp-enc:v1:iv:tag:ct` → 5 segments, the first two together
  // form the version tag.
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== VERSION_TAG) {
    throw new Error('decryptTotpSecret: unsupported payload version');
  }
  let iv: Buffer;
  let tag: Buffer;
  let ct: Buffer;
  try {
    iv = Buffer.from(parts[2], 'base64');
    tag = Buffer.from(parts[3], 'base64');
    ct = Buffer.from(parts[4], 'base64');
  } catch {
    throw new Error('decryptTotpSecret: malformed base64 segments');
  }
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error('decryptTotpSecret: invalid iv/tag length');
  }
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString('utf8');
}

/** Cheap structural check: does this look like our wire format? */
export function isEncryptedTotpSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${VERSION_TAG}:`);
}
