import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptCredentials,
  decryptCredentials,
  isEncryptedValue,
  getIntegrationsKey,
} from '@/lib/integrationsCrypto';

const HEX_KEY = '0'.repeat(64); // 32 bytes of zero — fine for unit tests
const HEX_KEY_2 = 'f'.repeat(64);

describe('integrationsCrypto', () => {
  const ORIGINAL = process.env.INTEGRATIONS_ENC_KEY;
  beforeEach(() => {
    process.env.INTEGRATIONS_ENC_KEY = HEX_KEY;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.INTEGRATIONS_ENC_KEY;
    else process.env.INTEGRATIONS_ENC_KEY = ORIGINAL;
  });

  describe('getIntegrationsKey', () => {
    it('parses a 64-char hex string', () => {
      expect(getIntegrationsKey({ INTEGRATIONS_ENC_KEY: HEX_KEY })).not.toBeNull();
    });

    it('parses a 32-byte base64 string', () => {
      const b64 = Buffer.alloc(32, 7).toString('base64');
      expect(getIntegrationsKey({ INTEGRATIONS_ENC_KEY: b64 })).not.toBeNull();
    });

    it('parses a 32-char utf-8 string as a fallback', () => {
      const utf8 = 'a'.repeat(32);
      expect(getIntegrationsKey({ INTEGRATIONS_ENC_KEY: utf8 })).not.toBeNull();
    });

    it('returns null when the env var is missing', () => {
      expect(getIntegrationsKey({})).toBeNull();
      expect(getIntegrationsKey({ INTEGRATIONS_ENC_KEY: '' })).toBeNull();
    });

    it('returns null for keys of the wrong length', () => {
      // 16 hex chars = 8 bytes, way too short
      expect(getIntegrationsKey({ INTEGRATIONS_ENC_KEY: '0123456789abcdef' })).toBeNull();
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('round-trips every string value', () => {
      const input = { access_token: 'eyJabc.def.ghi', api_key: 'sk_live_123', cloud_name: 'thinkfash' };
      const encrypted = encryptCredentials(input);
      // Every value should look encrypted
      for (const v of Object.values(encrypted)) {
        expect(isEncryptedValue(v)).toBe(true);
      }
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(input);
    });

    it('encrypted values follow the wire format enc:v1:iv:tag:ct', () => {
      const { token } = encryptCredentials({ token: 'hello world' }) as { token: string };
      const parts = token.split(':');
      expect(parts[0]).toBe('enc');
      expect(parts[1]).toBe('v1');
      expect(parts).toHaveLength(5); // enc, v1, iv, tag, ct
    });

    it('produces a different ciphertext on each call (random IV)', () => {
      const a = encryptCredentials({ token: 'same-input' });
      const b = encryptCredentials({ token: 'same-input' });
      expect(a.token).not.toBe(b.token);
      // …but both decrypt to the same plaintext
      expect(decryptCredentials(a).token).toBe('same-input');
      expect(decryptCredentials(b).token).toBe('same-input');
    });

    it('preserves non-string values verbatim', () => {
      const input = { token: 'secret', expires_in: 3600, nested: { foo: 1 }, flag: true };
      const encrypted = encryptCredentials(input);
      expect(encrypted.expires_in).toBe(3600);
      expect(encrypted.nested).toEqual({ foo: 1 });
      expect(encrypted.flag).toBe(true);
      expect(isEncryptedValue(encrypted.token)).toBe(true);
    });

    it('preserves empty strings (treated as "not set", not encrypted)', () => {
      const encrypted = encryptCredentials({ token: '', other: 'real' });
      expect(encrypted.token).toBe('');
      expect(isEncryptedValue(encrypted.other)).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('decryptCredentials passes plaintext rows through untouched', () => {
      // Simulates a row written before encryption was enabled.
      const plaintextRow = { access_token: 'old-plaintext-token', api_key: 'sk_xyz' };
      expect(decryptCredentials(plaintextRow)).toEqual(plaintextRow);
    });

    it('encryptCredentials is idempotent on already-encrypted values', () => {
      const once = encryptCredentials({ token: 'sensitive' });
      const twice = encryptCredentials(once);
      expect(twice.token).toBe(once.token); // not double-encrypted
      expect(decryptCredentials(twice).token).toBe('sensitive');
    });

    it('handles a mixed object (some plaintext, some encrypted) on read', () => {
      const encryptedToken = encryptCredentials({ token: 'enc-me' }).token as string;
      const mixed = { token: encryptedToken, legacy_field: 'still-plaintext' };
      const result = decryptCredentials(mixed);
      expect(result).toEqual({ token: 'enc-me', legacy_field: 'still-plaintext' });
    });
  });

  describe('identity behaviour without a key', () => {
    it('encryptCredentials is identity when INTEGRATIONS_ENC_KEY is unset', () => {
      delete process.env.INTEGRATIONS_ENC_KEY;
      const input = { token: 'plain', other: 'nope' };
      const out = encryptCredentials(input);
      expect(out).toEqual(input);
      // NOT the same reference (we always return a fresh copy to avoid aliasing)
      expect(out).not.toBe(input);
    });

    it('decryptCredentials is identity when INTEGRATIONS_ENC_KEY is unset', () => {
      delete process.env.INTEGRATIONS_ENC_KEY;
      // Even values that LOOK encrypted should pass through verbatim — we have
      // no way to decrypt them without the key, and tampering with them by
      // returning empty would silently drop credentials.
      const wireLooking = 'enc:v1:aaaa:bbbb:cccc';
      const out = decryptCredentials({ token: wireLooking });
      expect(out.token).toBe(wireLooking);
    });
  });

  describe('tamper resistance', () => {
    it('decryptCredentials drops values whose GCM tag does not verify', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const encrypted = encryptCredentials({ token: 'genuine' });
        const tampered = { token: (encrypted.token as string).slice(0, -2) + 'XX' };
        const out = decryptCredentials(tampered);
        expect(out.token).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('decryptCredentials drops values encrypted with a different key', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const encryptedWithOtherKey = encryptCredentials(
          { token: 'before-rotation' },
          { INTEGRATIONS_ENC_KEY: HEX_KEY_2 },
        ).token as string;
        // Now read with the original key
        const out = decryptCredentials({ token: encryptedWithOtherKey });
        expect(out.token).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('decryptCredentials drops malformed wire values without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const out = decryptCredentials({ token: 'enc:v1:not-enough-parts' });
        expect(out.token).toBeUndefined();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('null / undefined handling', () => {
    it('returns {} for null input', () => {
      expect(encryptCredentials(null)).toEqual({});
      expect(decryptCredentials(null)).toEqual({});
    });

    it('returns {} for undefined input', () => {
      expect(encryptCredentials(undefined)).toEqual({});
      expect(decryptCredentials(undefined)).toEqual({});
    });
  });
});
