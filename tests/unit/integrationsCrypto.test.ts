import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetKeyCacheForTests,
  decryptCredentials,
  decryptString,
  encryptCredentials,
  encryptString,
  isEncryptionConfigured,
} from '@/lib/integrationsCrypto';

const TEST_KEY_B64 = Buffer.from('a'.repeat(32), 'utf8').toString('base64');

describe('integrationsCrypto', () => {
  beforeEach(() => {
    delete process.env.INTEGRATIONS_ENC_KEY;
    __resetKeyCacheForTests();
  });

  afterEach(() => {
    delete process.env.INTEGRATIONS_ENC_KEY;
    __resetKeyCacheForTests();
  });

  it('is a no-op when INTEGRATIONS_ENC_KEY is unset (back-compat)', () => {
    expect(isEncryptionConfigured()).toBe(false);
    const enc = encryptString('hello');
    expect(enc).toBe('hello');
    expect(decryptString(enc)).toBe('hello');
  });

  it('round-trips strings with an env key (base64 32 bytes)', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    expect(isEncryptionConfigured()).toBe(true);
    const enc = encryptString('super-secret-token');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(decryptString(enc)).toBe('super-secret-token');
  });

  it('produces fresh ciphertext per call (random IV)', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    const a = encryptString('x');
    const b = encryptString('x');
    expect(a).not.toBe(b);
    expect(decryptString(a)).toBe('x');
    expect(decryptString(b)).toBe('x');
  });

  it('does not double-encrypt already-encrypted values', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    const once = encryptString('hello');
    const twice = encryptString(once);
    expect(twice).toBe(once);
    expect(decryptString(twice)).toBe('hello');
  });

  it('passes through non-string values in encryptCredentials', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    const out = encryptCredentials({ token: 'abc', count: 3, on: true, nested: { x: 1 } });
    expect(typeof out.token).toBe('string');
    expect((out.token as string).startsWith('enc:v1:')).toBe(true);
    expect(out.count).toBe(3);
    expect(out.on).toBe(true);
    expect(out.nested).toEqual({ x: 1 });
  });

  it('decryptCredentials reverses encryptCredentials', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    const original = { access_token: 'ACCESS', api_key: 'KEY', api_secret: 'SECRET', count: 5 };
    const enc = encryptCredentials(original);
    expect(decryptCredentials(enc)).toEqual(original);
  });

  it('decryptCredentials surfaces plaintext rows unchanged (legacy data)', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    expect(decryptCredentials({ token: 'plain' })).toEqual({ token: 'plain' });
  });

  it('decryptString is robust to malformed enc:v1: strings', () => {
    process.env.INTEGRATIONS_ENC_KEY = TEST_KEY_B64;
    __resetKeyCacheForTests();
    expect(decryptString('enc:v1:notenough')).toBe('enc:v1:notenough');
  });

  it('accepts hex-encoded keys', () => {
    process.env.INTEGRATIONS_ENC_KEY = '00'.repeat(32);
    __resetKeyCacheForTests();
    expect(isEncryptionConfigured()).toBe(true);
    const enc = encryptString('hi');
    expect(decryptString(enc)).toBe('hi');
  });

  it('derives a 32-byte key from arbitrary strings via SHA-256 fallback', () => {
    process.env.INTEGRATIONS_ENC_KEY = 'short-passphrase-but-still-fine';
    __resetKeyCacheForTests();
    expect(isEncryptionConfigured()).toBe(true);
    const enc = encryptString('payload');
    expect(decryptString(enc)).toBe('payload');
  });
});
