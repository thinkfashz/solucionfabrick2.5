import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual, validateInitSecret } from '@/lib/adminAuth';

/**
 * Both helpers underpin the `/api/admin/init-account` bootstrap gate added in
 * the same PR. The route handler itself does not have direct unit tests
 * (it would require mocking the full InsForge SDK for low marginal value),
 * but the security-critical primitive — constant-time secret comparison —
 * lives here and is covered exhaustively.
 */
describe('timingSafeStringEqual', () => {
  it('returns true for byte-identical strings', () => {
    expect(timingSafeStringEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns true after trimming whitespace on both sides', () => {
    expect(timingSafeStringEqual('  hunter2  ', '\thunter2\n')).toBe(true);
  });

  it('returns false on length mismatch', () => {
    expect(timingSafeStringEqual('a', 'aa')).toBe(false);
    expect(timingSafeStringEqual('aa', 'a')).toBe(false);
  });

  it('returns false on different equal-length strings', () => {
    expect(timingSafeStringEqual('aaaa', 'bbbb')).toBe(false);
  });

  it('returns false when either side is empty/whitespace-only', () => {
    expect(timingSafeStringEqual('', 'abc')).toBe(false);
    expect(timingSafeStringEqual('abc', '')).toBe(false);
    expect(timingSafeStringEqual('   ', 'abc')).toBe(false);
    expect(timingSafeStringEqual('abc', '   ')).toBe(false);
    expect(timingSafeStringEqual('', '')).toBe(false);
  });

  it('returns false for non-string inputs (defensive against accidental misuse)', () => {
    // Casting to any to simulate runtime values an attacker could provide via
    // a tampered header (`getHeader` always returns string|null in Next.js
    // but the helper is paranoid).
    expect(timingSafeStringEqual(undefined as unknown as string, 'abc')).toBe(false);
    expect(timingSafeStringEqual('abc', null as unknown as string)).toBe(false);
    expect(timingSafeStringEqual(123 as unknown as string, '123')).toBe(false);
  });

  it('handles unicode multi-byte characters correctly', () => {
    // 'ñ' is 2 bytes in UTF-8; the comparison should still be byte-precise.
    expect(timingSafeStringEqual('niño', 'niño')).toBe(true);
    expect(timingSafeStringEqual('niño', 'nino')).toBe(false); // different lengths in bytes
  });
});

describe('validateInitSecret', () => {
  it('returns true when the header matches the env var exactly', () => {
    expect(validateInitSecret('s3cr3t-value', 's3cr3t-value')).toBe(true);
  });

  it('returns true after trimming both sides', () => {
    expect(validateInitSecret('  s3cr3t  ', 's3cr3t\n')).toBe(true);
  });

  it('returns false when the env var is missing/empty', () => {
    // This is the fail-closed default: if the operator never configured
    // ADMIN_INIT_SECRET, no header value should be accepted, ever.
    expect(validateInitSecret('anything', '')).toBe(false);
    expect(validateInitSecret('anything', undefined)).toBe(false);
    expect(validateInitSecret('anything', null)).toBe(false);
  });

  it('returns false when the header is missing/empty', () => {
    expect(validateInitSecret('', 's3cr3t')).toBe(false);
    expect(validateInitSecret(undefined, 's3cr3t')).toBe(false);
    expect(validateInitSecret(null, 's3cr3t')).toBe(false);
  });

  it('returns false on length-equal but different secrets', () => {
    expect(validateInitSecret('aaaaaaaaaa', 'bbbbbbbbbb')).toBe(false);
  });

  it('returns false on prefix attack attempts', () => {
    // An attacker who learns the start of the secret cannot get a partial
    // match — the comparison runs over the full buffer.
    expect(validateInitSecret('s3cr3t', 's3cr3t-real')).toBe(false);
    expect(validateInitSecret('s3cr3t-real-suffix', 's3cr3t-real')).toBe(false);
  });
});
