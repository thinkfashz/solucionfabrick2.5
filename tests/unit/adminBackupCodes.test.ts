import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateBackupCodes,
  normalizeBackupCode,
  hashBackupCode,
  hashBackupCodes,
  verifyAndConsumeBackupCode,
  DEFAULT_BACKUP_CODE_COUNT,
} from '@/lib/adminBackupCodes';

beforeAll(() => {
  // Use a fixed pepper so hash round-trips are deterministic across the
  // test run; production uses a real high-entropy value.
  process.env.ADMIN_PASSWORD_PEPPER = 'test-pepper-for-backup-code-tests';
});

describe('generateBackupCodes', () => {
  it('returns DEFAULT_BACKUP_CODE_COUNT unique codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(DEFAULT_BACKUP_CODE_COUNT);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('respects the requested count', () => {
    expect(generateBackupCodes(3)).toHaveLength(3);
    expect(generateBackupCodes(20)).toHaveLength(20);
  });

  it('uses the XXXX-XXXX-XX format with the safe alphabet (no I/L/O/U)', () => {
    for (const code of generateBackupCodes(20)) {
      expect(code).toMatch(/^[0-9A-HJ-KMNP-TV-Z]{4}-[0-9A-HJ-KMNP-TV-Z]{4}-[0-9A-HJ-KMNP-TV-Z]{2}$/);
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it('rejects invalid counts', () => {
    expect(() => generateBackupCodes(0)).toThrow();
    expect(() => generateBackupCodes(-1)).toThrow();
    expect(() => generateBackupCodes(1.5)).toThrow();
    expect(() => generateBackupCodes(101)).toThrow();
  });
});

describe('normalizeBackupCode', () => {
  it('strips spaces, dashes, and lowercases input', () => {
    expect(normalizeBackupCode('abcd-efgh-ij')).toBe('ABCDEFGHIJ');
    expect(normalizeBackupCode('  abcd efgh ij  ')).toBe('ABCDEFGHIJ');
    expect(normalizeBackupCode('ABCD-EFGH-IJ')).toBe('ABCDEFGHIJ');
  });

  it('returns empty string for non-string input', () => {
    // @ts-expect-error testing bad input
    expect(normalizeBackupCode(null)).toBe('');
    // @ts-expect-error testing bad input
    expect(normalizeBackupCode(undefined)).toBe('');
  });
});

describe('hashBackupCode round-trip', () => {
  it('produces the scrypt$… wire format', async () => {
    const [code] = generateBackupCodes(1);
    const hash = await hashBackupCode(code);
    expect(hash.split('$')).toHaveLength(6);
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('hashes are pepper-sensitive (same input + different pepper → different hash)', async () => {
    process.env.ADMIN_PASSWORD_PEPPER = 'pepper-A';
    const hashA = await hashBackupCode('ABCD-EFGH-IJ');
    process.env.ADMIN_PASSWORD_PEPPER = 'pepper-B';
    const result = await verifyAndConsumeBackupCode('ABCD-EFGH-IJ', [hashA]);
    expect(result.ok).toBe(false);
    process.env.ADMIN_PASSWORD_PEPPER = 'test-pepper-for-backup-code-tests';
  });

  it('refuses to hash an empty/whitespace-only code', async () => {
    await expect(hashBackupCode('')).rejects.toThrow();
    await expect(hashBackupCode('   -  -  ')).rejects.toThrow();
  });
});

describe('verifyAndConsumeBackupCode', () => {
  it('matches a code regardless of dash/space/case formatting', async () => {
    const [code] = generateBackupCodes(1);
    const hashes = await hashBackupCodes([code]);

    const r1 = await verifyAndConsumeBackupCode(code, hashes);
    expect(r1.ok).toBe(true);

    const r2 = await verifyAndConsumeBackupCode(code.toLowerCase(), hashes);
    expect(r2.ok).toBe(true);

    const r3 = await verifyAndConsumeBackupCode(code.replace(/-/g, ''), hashes);
    expect(r3.ok).toBe(true);

    const r4 = await verifyAndConsumeBackupCode(`  ${code}  `, hashes);
    expect(r4.ok).toBe(true);
  });

  it('removes the matched hash from the returned array (single-use)', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes);

    const result = await verifyAndConsumeBackupCode(codes[1], hashes);
    expect(result.ok).toBe(true);
    expect(result.remainingHashes).toHaveLength(2);
    expect(result.remainingCount).toBe(2);
    // Returned array must NOT contain the matched hash.
    expect(result.remainingHashes).not.toContain(hashes[1]);
    // The other two are still there.
    expect(result.remainingHashes).toContain(hashes[0]);
    expect(result.remainingHashes).toContain(hashes[2]);
  });

  it('returns a FRESH array — never aliases the input', async () => {
    const codes = generateBackupCodes(2);
    const hashes = await hashBackupCodes(codes);

    const result = await verifyAndConsumeBackupCode(codes[0], hashes);
    expect(result.remainingHashes).not.toBe(hashes);

    // Caller writing to the result must not retroactively mutate the input.
    result.remainingHashes.push('mutation-test');
    expect(hashes).toHaveLength(2);
  });

  it('on miss, returns the original hashes verbatim with ok=false', async () => {
    const codes = generateBackupCodes(2);
    const hashes = await hashBackupCodes(codes);

    const result = await verifyAndConsumeBackupCode('ZZZZ-ZZZZ-ZZ', hashes);
    expect(result.ok).toBe(false);
    expect(result.remainingHashes).toHaveLength(2);
    expect(result.remainingCount).toBe(2);
  });

  it('handles null/undefined/empty stored arrays without throwing', async () => {
    const r1 = await verifyAndConsumeBackupCode('ABCD-EFGH-IJ', null);
    expect(r1.ok).toBe(false);
    expect(r1.remainingHashes).toEqual([]);

    const r2 = await verifyAndConsumeBackupCode('ABCD-EFGH-IJ', undefined);
    expect(r2.ok).toBe(false);

    const r3 = await verifyAndConsumeBackupCode('ABCD-EFGH-IJ', []);
    expect(r3.ok).toBe(false);
    expect(r3.remainingCount).toBe(0);
  });

  it('short-circuits structurally invalid input without invoking scrypt', async () => {
    const [code] = generateBackupCodes(1);
    const hashes = await hashBackupCodes([code]);

    // 6-digit TOTP-shaped input that wandered into this branch.
    const t0 = Date.now();
    const result = await verifyAndConsumeBackupCode('123456', hashes);
    const elapsed = Date.now() - t0;

    expect(result.ok).toBe(false);
    // Even on a slow CI box, a real scrypt(N=131072) takes ~150ms+.
    // The structural short-circuit must be at least an order of magnitude faster.
    expect(elapsed).toBeLessThan(50);
  });

  it('a previously-consumed code does not match the trimmed array', { timeout: 10000 }, async () => {
    const codes = generateBackupCodes(3);
    let hashes = await hashBackupCodes(codes);

    const first = await verifyAndConsumeBackupCode(codes[0], hashes);
    expect(first.ok).toBe(true);
    hashes = first.remainingHashes;

    const replay = await verifyAndConsumeBackupCode(codes[0], hashes);
    expect(replay.ok).toBe(false);
    expect(replay.remainingCount).toBe(2);
  });

  it('rejects malformed stored hashes silently (one bad row does not poison the array)', async () => {
    const codes = generateBackupCodes(2);
    const realHashes = await hashBackupCodes(codes);
    const hashes = ['totally-not-a-hash', realHashes[0], 'scrypt$bogus', realHashes[1]];

    const result = await verifyAndConsumeBackupCode(codes[1], hashes);
    expect(result.ok).toBe(true);
    // Bad rows are preserved in the writeback (we only remove the matched one).
    expect(result.remainingHashes).toContain('totally-not-a-hash');
    expect(result.remainingHashes).toContain('scrypt$bogus');
    expect(result.remainingHashes).not.toContain(realHashes[1]);
  });
});
