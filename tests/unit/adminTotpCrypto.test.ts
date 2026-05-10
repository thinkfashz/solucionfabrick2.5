import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptTotpSecret,
  decryptTotpSecret,
  isEncryptedTotpSecret,
} from '@/lib/adminTotpCrypto';

describe('adminTotpCrypto', () => {
  const ORIGINAL = process.env.ADMIN_SESSION_SECRET;
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'unit-test-secret-do-not-use-in-prod-' + 'x'.repeat(32);
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = ORIGINAL;
  });

  it('round-trips a base32 secret through encrypt/decrypt', () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(secret);
    expect(isEncryptedTotpSecret(encrypted)).toBe(true);
    expect(encrypted.startsWith('totp-enc:v1:')).toBe(true);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const a = encryptTotpSecret('JBSWY3DPEHPK3PXP');
    const b = encryptTotpSecret('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(decryptTotpSecret(a)).toBe(decryptTotpSecret(b));
  });

  it('rejects tampered ciphertext (GCM auth tag enforces integrity)', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(secret);
    const parts = encrypted.split(':');
    // Flip a bit in the ciphertext segment
    const ctBuf = Buffer.from(parts[4], 'base64');
    ctBuf[0] ^= 0x01;
    parts[4] = ctBuf.toString('base64');
    const tampered = parts.join(':');
    expect(() => decryptTotpSecret(tampered)).toThrow();
  });

  it('rejects payloads encrypted under a different master secret', () => {
    const encrypted = encryptTotpSecret('JBSWY3DPEHPK3PXP');
    process.env.ADMIN_SESSION_SECRET = 'a-completely-different-master-secret-value';
    expect(() => decryptTotpSecret(encrypted)).toThrow();
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptTotpSecret('')).toThrow();
    expect(() => decryptTotpSecret('plaintext')).toThrow();
    expect(() => decryptTotpSecret('totp-enc:v2:a:b:c')).toThrow(/version/);
    expect(() => decryptTotpSecret('totp-enc:v1:!@#:$%^:&*(')).toThrow();
  });

  it('throws when ADMIN_SESSION_SECRET is missing', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => encryptTotpSecret('JBSWY3DPEHPK3PXP')).toThrow(/ADMIN_SESSION_SECRET/);
  });

  it('isEncryptedTotpSecret distinguishes the wire format', () => {
    expect(isEncryptedTotpSecret('totp-enc:v1:a:b:c')).toBe(true);
    expect(isEncryptedTotpSecret('JBSWY3DPEHPK3PXP')).toBe(false);
    expect(isEncryptedTotpSecret(null)).toBe(false);
    expect(isEncryptedTotpSecret(42)).toBe(false);
  });
});
