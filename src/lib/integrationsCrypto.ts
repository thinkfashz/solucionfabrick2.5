import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM at-rest encryption for `integrations.credentials` JSON values.
 *
 * Each *string field* in the credentials object is encrypted independently so
 * the masking layer (which only looks at the last 4 chars) keeps working
 * transparently after decryption.
 *
 * Wire format:  `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`
 *   - iv:        12 random bytes (GCM-recommended length)
 *   - tag:       16-byte auth tag
 *   - ct:        the UTF-8 plaintext encrypted with AES-256-GCM
 *
 * Backward compatibility:
 *   - When `INTEGRATIONS_ENC_KEY` is unset we no-op (legacy plaintext rows
 *     keep working). The first POST after the key is configured will
 *     transparently rewrite the row in encrypted form.
 *   - `decryptString` recognises plaintext (anything missing the `enc:v1:`
 *     prefix) and returns it unchanged, so an env-key rotation that loses
 *     the previous key surfaces as garbage on read but never crashes the
 *     admin UI.
 */

const PREFIX = 'enc:v1:';
const KEY_ENV = 'INTEGRATIONS_ENC_KEY';

let cachedKey: Buffer | null | undefined;

/**
 * Resolves the 32-byte AES key from `process.env.INTEGRATIONS_ENC_KEY`.
 * The env value can be base64 (44 chars incl. padding), hex (64 chars) or
 * any UTF-8 string of length ≥ 32 (we hash via SHA-256 fallback). Returns
 * `null` when the env var is unset/blank — callers must treat that as
 * "encryption disabled".
 */
function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env[KEY_ENV];
  if (!raw || raw.trim().length === 0) {
    cachedKey = null;
    return null;
  }
  const trimmed = raw.trim();
  // Try base64 first.
  try {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) {
      cachedKey = buf;
      return buf;
    }
  } catch {
    /* try next encoding */
  }
  // Then hex.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    cachedKey = Buffer.from(trimmed, 'hex');
    return cachedKey;
  }
  // Fallback: derive a 32-byte key via SHA-256 so any random string works.
  // We keep this synchronous (no async crypto.scrypt) to stay simple.
  cachedKey = createHash('sha256').update(trimmed, 'utf8').digest();
  return cachedKey;
}

/** Returns true when encryption is configured (env key present). */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/** Encrypts a UTF-8 string with AES-256-GCM. No-op when key is unset. */
export function encryptString(plaintext: string): string {
  if (typeof plaintext !== 'string') return plaintext;
  const key = getKey();
  if (!key) return plaintext;
  // Don't double-encrypt.
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Decrypts an `enc:v1:…` value. Returns the input unchanged when:
 *   - it's not a string,
 *   - it doesn't carry the `enc:v1:` prefix (legacy plaintext), or
 *   - the env key is missing (encryption disabled).
 *
 * Throws only when the value *is* an encrypted blob and decryption fails
 * (wrong key / tampered tag); callers that want to be safe wrap in try/catch.
 */
export function decryptString(value: unknown): string {
  if (typeof value !== 'string') return value as unknown as string;
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value; // can't decrypt — surface the ciphertext as-is.
  const rest = value.slice(PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) return value;
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Walks an object and encrypts every string value at the top level.
 * Non-string values (numbers, booleans, nested objects) are passed through.
 */
export function encryptCredentials(
  creds: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!creds || typeof creds !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(creds)) {
    out[k] = typeof v === 'string' ? encryptString(v) : v;
  }
  return out;
}

/** Mirror of `encryptCredentials` for the read path. */
export function decryptCredentials(
  creds: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!creds || typeof creds !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v !== 'string') {
      out[k] = v;
      continue;
    }
    try {
      out[k] = decryptString(v);
    } catch {
      // Decryption failed — surface the ciphertext so the admin can rotate.
      out[k] = v;
    }
  }
  return out;
}

/** Test-only: clear the cached key so unit tests can flip env vars. */
export function __resetKeyCacheForTests(): void {
  cachedKey = undefined;
}
