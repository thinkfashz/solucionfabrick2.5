import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hashAdminPassword,
  verifyAdminPassword,
  isAdminPasswordHash,
  assertPepperConfigured,
} from '@/lib/adminPasswordHash';

describe('adminPasswordHash', () => {
  const ORIGINAL_PEPPER = process.env.ADMIN_PASSWORD_PEPPER;
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD_PEPPER = 'unit-test-pepper-do-not-use-in-prod';
  });

  afterEach(() => {
    if (ORIGINAL_PEPPER === undefined) delete process.env.ADMIN_PASSWORD_PEPPER;
    else process.env.ADMIN_PASSWORD_PEPPER = ORIGINAL_PEPPER;
    if (ORIGINAL_NODE_ENV === undefined)
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    else (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('produces a self-describing scrypt$N$r$p$salt$hash string', async () => {
    const hash = await hashAdminPassword('correct-horse-battery-staple');
    expect(isAdminPasswordHash(hash)).toBe(true);
    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
    // Salt and hash are non-empty base64
    expect(parts[4].length).toBeGreaterThan(0);
    expect(parts[5].length).toBeGreaterThan(0);
  });

  it('verifies the correct password and rejects an incorrect one', async () => {
    const hash = await hashAdminPassword('correct-horse-battery-staple');
    expect(await verifyAdminPassword('correct-horse-battery-staple', hash)).toBe(true);
    expect(await verifyAdminPassword('wrong-password-attempt!', hash)).toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashAdminPassword('correct-horse-battery-staple');
    const b = await hashAdminPassword('correct-horse-battery-staple');
    expect(a).not.toBe(b);
    expect(await verifyAdminPassword('correct-horse-battery-staple', a)).toBe(true);
    expect(await verifyAdminPassword('correct-horse-battery-staple', b)).toBe(true);
  });

  it('treats the pepper as part of the secret — wrong pepper means wrong password', async () => {
    const hash = await hashAdminPassword('correct-horse-battery-staple');
    process.env.ADMIN_PASSWORD_PEPPER = 'a-completely-different-pepper-value';
    expect(await verifyAdminPassword('correct-horse-battery-staple', hash)).toBe(false);
  });

  it('rejects passwords shorter than the policy floor at hash time', async () => {
    await expect(hashAdminPassword('short')).rejects.toThrow(/at least 12/);
  });

  it('returns false (never throws) on malformed stored hashes', async () => {
    expect(await verifyAdminPassword('any-password', '')).toBe(false);
    expect(await verifyAdminPassword('any-password', 'not-a-hash')).toBe(false);
    expect(await verifyAdminPassword('any-password', 'bcrypt$10$abc$def')).toBe(false);
    expect(await verifyAdminPassword('any-password', 'scrypt$bad$8$1$AAAA$BBBB')).toBe(false);
    // Out-of-range params (too low N) — refuse rather than run insecure scrypt.
    expect(await verifyAdminPassword('any-password', 'scrypt$1024$8$1$AAAA$BBBB')).toBe(false);
  });

  it('isAdminPasswordHash distinguishes our format from arbitrary strings', () => {
    expect(isAdminPasswordHash(null)).toBe(false);
    expect(isAdminPasswordHash(undefined)).toBe(false);
    expect(isAdminPasswordHash(42)).toBe(false);
    expect(isAdminPasswordHash('plaintext')).toBe(false);
    expect(isAdminPasswordHash('scrypt$131072$8$1$AAAA$BBBB')).toBe(true);
  });

  it('assertPepperConfigured throws in production without pepper, no-op otherwise', () => {
    delete process.env.ADMIN_PASSWORD_PEPPER;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(() => assertPepperConfigured()).not.toThrow();

    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(() => assertPepperConfigured()).toThrow(/ADMIN_PASSWORD_PEPPER/);

    process.env.ADMIN_PASSWORD_PEPPER = 'set';
    expect(() => assertPepperConfigured()).not.toThrow();
  });
});
