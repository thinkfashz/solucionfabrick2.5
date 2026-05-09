/**
 * AES-256-GCM at-rest encryption for `integrations.credentials` JSON values.
 *
 * Threat model
 * ------------
 * Defence in depth against a *passive* compromise of the InsForge / Postgres
 * database (e.g. leaked backup, read-only console exposure, dumped row).
 * It does NOT protect against an attacker who can also read the runtime env —
 * they would have access to the key and to the live decrypted credentials in
 * memory anyway.
 *
 * Wire format
 * -----------
 * Each credential VALUE is encrypted independently and stored as a string:
 *
 *     enc:v1:<iv_b64>:<tag_b64>:<ct_b64>
 *
 * - `iv`  : 12-byte random nonce (base64)
 * - `tag` : 16-byte GCM auth tag (base64)
 * - `ct`  : ciphertext of the UTF-8 plaintext (base64)
 *
 * Per-value (rather than whole-object) encryption keeps the format trivially
 * inspectable in the database and lets PostgREST / SQL filters keep working
 * for any non-secret column the admin UI might add later.
 *
 * Backward compatibility
 * ----------------------
 *  - If `INTEGRATIONS_ENC_KEY` is not set, both helpers become identity
 *    functions: existing deployments keep working unchanged.
 *  - Plaintext rows already in the DB pass through `decryptCredentials`
 *    untouched (we only attempt to decrypt strings that match the wire
 *    prefix `enc:v1:`).
 *  - The first POST after the key is set transparently re-encrypts every
 *    field, since the route merges existing credentials and re-uploads them
 *    via `encryptCredentials`.
 *
 * Key requirements
 * ----------------
 * `INTEGRATIONS_ENC_KEY` must decode to exactly 32 bytes. Accepted formats:
 *   - 64-character hex string
 *   - base64 (with or without `=` padding) decoding to 32 bytes
 *   - 32-character UTF-8 string (last-resort, NOT recommended)
 *
 * Rotating the key invalidates every existing encrypted value (decrypt will
 * throw). Re-set every provider via /admin/integraciones after a rotation.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const WIRE_PREFIX = 'enc:v1:';

/**
 * Resolve the symmetric key from the environment, returning `null` when the
 * env var is unset or invalid. Callers MUST treat `null` as "encryption
 * disabled" and pass values through verbatim.
 */
export function getIntegrationsKey(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Buffer | null {
  const raw = env.INTEGRATIONS_ENC_KEY;
  if (!raw || raw.length === 0) return null;
  const trimmed = raw.trim();

  // hex (most explicit)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  // base64
  if (/^[A-Za-z0-9+/=_-]+$/.test(trimmed)) {
    try {
      const buf = Buffer.from(trimmed.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (buf.length === KEY_BYTES) return buf;
    } catch {
      // fallthrough to utf8 attempt
    }
  }
  // utf-8 fallback (32 chars exactly)
  const utf8 = Buffer.from(trimmed, 'utf8');
  if (utf8.length === KEY_BYTES) return utf8;
  return null;
}

/** Returns true if `value` is a string already in the encrypted wire format. */
export function isEncryptedValue(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(WIRE_PREFIX);
}

/** Encrypts a single UTF-8 string. Returns the wire-format encoded ciphertext. */
function encryptString(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${WIRE_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Decrypts a wire-format string. Throws if the input is malformed or the
 * GCM auth tag does not verify (tamper-evident).
 */
function decryptString(wire: string, key: Buffer): string {
  if (!wire.startsWith(WIRE_PREFIX)) {
    throw new Error('integrationsCrypto: not an encrypted value');
  }
  const parts = wire.slice(WIRE_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('integrationsCrypto: malformed wire format');
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  if (iv.length !== IV_BYTES) throw new Error('integrationsCrypto: bad iv length');
  if (tag.length !== TAG_BYTES) throw new Error('integrationsCrypto: bad tag length');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Encrypts every string value of a credentials object. Non-string values
 * (numbers, booleans, nested objects) and empty strings pass through
 * unchanged so the column can carry any JSON-serialisable shape.
 *
 * If the env key is unavailable, returns the input unchanged (identity).
 * Already-encrypted values pass through (idempotent).
 */
export function encryptCredentials(
  credentials: Record<string, unknown> | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Record<string, unknown> {
  if (!credentials) return {};
  const key = getIntegrationsKey(env);
  if (!key) return { ...credentials };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v !== 'string' || v.length === 0) {
      out[k] = v;
      continue;
    }
    if (isEncryptedValue(v)) {
      // already encrypted (e.g. merged from the DB) — keep verbatim
      out[k] = v;
      continue;
    }
    out[k] = encryptString(v, key);
  }
  return out;
}

/**
 * Decrypts every encrypted string value of a credentials object, leaving
 * plaintext values untouched (backward compatibility with rows persisted
 * before encryption was enabled).
 *
 * If the env key is unavailable, returns the input unchanged (identity).
 * If the key is set but a value fails to decrypt (tampering or stale key
 * after a rotation), the field is dropped from the output and a single
 * console error is emitted — the caller therefore sees a partial object
 * rather than a hard failure that would lock the admin out.
 */
export function decryptCredentials(
  credentials: Record<string, unknown> | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Record<string, unknown> {
  if (!credentials) return {};
  const key = getIntegrationsKey(env);
  if (!key) return { ...credentials };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (!isEncryptedValue(v)) {
      out[k] = v;
      continue;
    }
    try {
      out[k] = decryptString(v as string, key);
    } catch (err) {
      // Defensive: do not break the whole admin UI if one field is corrupt.
      // The admin will see the field as "not set" and can re-enter it.
      console.error(
        `integrationsCrypto: failed to decrypt field "${k}" — dropping. ` +
          'This usually means INTEGRATIONS_ENC_KEY was rotated; re-set the credential in /admin/integraciones.',
        err instanceof Error ? err.message : err,
      );
    }
  }
  return out;
}
