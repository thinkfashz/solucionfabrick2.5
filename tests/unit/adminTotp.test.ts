import { describe, it, expect } from 'vitest';
import {
  generateBase32Secret,
  generateTotp,
  verifyTotp,
  encodeBase32,
  decodeBase32,
  buildOtpAuthUrl,
  timeStepFor,
  TOTP_DEFAULTS,
} from '@/lib/adminTotp';

describe('adminTotp — base32 codec', () => {
  it('round-trips arbitrary bytes', () => {
    const samples = [
      Buffer.from('f'),
      Buffer.from('foobar'),
      Buffer.from([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]),
    ];
    for (const buf of samples) {
      const encoded = encodeBase32(buf);
      const decoded = decodeBase32(encoded);
      expect(decoded.equals(buf)).toBe(true);
    }
  });

  it('matches the canonical RFC 4648 vector for "foobar"', () => {
    expect(encodeBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it('tolerates whitespace, padding and lowercase on decode', () => {
    expect(decodeBase32('mzxw 6ytboi=').toString('utf8')).toBe('foobar');
    expect(decodeBase32('  MZXW6YTBOI  ').toString('utf8')).toBe('foobar');
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => decodeBase32('MZXW0YTBOI')).toThrow(/Invalid base32/);
    expect(() => decodeBase32('')).toThrow(/Empty base32/);
  });
});

describe('adminTotp — RFC 6238 reference vectors', () => {
  // RFC 6238 Appendix B (SHA-1 column, 8 digits). Our default is 6 digits, so
  // we re-derive the expected 6-digit code by truncating modulo 10^6 from
  // the canonical 8-digit values.
  // Vectors use the ASCII string "12345678901234567890" as the secret.
  const SECRET_ASCII = '12345678901234567890';
  const SECRET_BASE32 = encodeBase32(Buffer.from(SECRET_ASCII, 'ascii'));

  // Each tuple: [unix seconds, 8-digit code from the RFC]
  const VECTORS: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ];

  it.each(VECTORS)('time=%d → 8-digit %s', (unixSeconds, expected8) => {
    const step = timeStepFor(unixSeconds * 1000);
    expect(generateTotp(SECRET_BASE32, step, 8)).toBe(expected8);
    // And the 6-digit truncation
    const expected6 = expected8.slice(-6);
    expect(generateTotp(SECRET_BASE32, step, 6)).toBe(expected6);
  });
});

describe('adminTotp — verifyTotp', () => {
  const secret = generateBase32Secret();
  const fixedNow = 1_700_000_000_000; // arbitrary, stable
  const currentCode = generateTotp(secret, timeStepFor(fixedNow));

  it('accepts the current code', () => {
    expect(verifyTotp(currentCode, secret, { now: fixedNow })).toBe(true);
  });

  it('accepts codes within the ±1 window (clock skew tolerance)', () => {
    const prev = generateTotp(secret, timeStepFor(fixedNow) - 1);
    const next = generateTotp(secret, timeStepFor(fixedNow) + 1);
    expect(verifyTotp(prev, secret, { now: fixedNow })).toBe(true);
    expect(verifyTotp(next, secret, { now: fixedNow })).toBe(true);
  });

  it('rejects codes outside the window', () => {
    const old = generateTotp(secret, timeStepFor(fixedNow) - 5);
    expect(verifyTotp(old, secret, { now: fixedNow })).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    expect(verifyTotp('', secret, { now: fixedNow })).toBe(false);
    expect(verifyTotp('12345', secret, { now: fixedNow })).toBe(false); // wrong length
    expect(verifyTotp('1234567', secret, { now: fixedNow })).toBe(false); // wrong length
    expect(verifyTotp('abcdef', secret, { now: fixedNow })).toBe(false); // non-numeric
    expect(verifyTotp(currentCode, '', { now: fixedNow })).toBe(false);
    expect(verifyTotp(currentCode, 'NOT-VALID-BASE32!', { now: fixedNow })).toBe(false);
  });

  it('strips whitespace from user-typed codes ("123 456")', () => {
    const spaced = `${currentCode.slice(0, 3)} ${currentCode.slice(3)}`;
    expect(verifyTotp(spaced, secret, { now: fixedNow })).toBe(true);
  });

  it('rejects a code generated for a *different* secret', () => {
    const other = generateBase32Secret();
    const otherCode = generateTotp(other, timeStepFor(fixedNow));
    // 1-in-10^6 collision, so iterate a few times to make the test robust.
    let allMatched = true;
    for (let i = 0; i < 3; i++) {
      const t = fixedNow + i * 31_000;
      const code = generateTotp(other, timeStepFor(t));
      if (!verifyTotp(code, secret, { now: t })) {
        allMatched = false;
        break;
      }
    }
    expect(allMatched).toBe(false);
    expect(otherCode).toBeDefined();
  });
});

describe('adminTotp — generateBase32Secret', () => {
  it('produces 32-character base32 strings (160 bits, no padding)', () => {
    for (let i = 0; i < 5; i++) {
      const s = generateBase32Secret();
      expect(s).toMatch(/^[A-Z2-7]{32}$/);
    }
  });

  it('produces unique secrets', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) seen.add(generateBase32Secret());
    expect(seen.size).toBe(20);
  });
});

describe('adminTotp — buildOtpAuthUrl', () => {
  it('emits a parseable otpauth:// URL with the expected parameters', () => {
    const url = buildOtpAuthUrl({
      secretBase32: 'JBSWY3DPEHPK3PXP',
      issuer: 'Soluciones Fabrick',
      account: 'admin@example.com',
    });
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    const parsed = new URL(url);
    expect(parsed.protocol).toBe('otpauth:');
    expect(parsed.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
    expect(parsed.searchParams.get('issuer')).toBe('Soluciones Fabrick');
    expect(parsed.searchParams.get('algorithm')).toBe('SHA1');
    expect(parsed.searchParams.get('digits')).toBe(String(TOTP_DEFAULTS.digits));
    expect(parsed.searchParams.get('period')).toBe(String(TOTP_DEFAULTS.periodSeconds));
    // path is /{issuer}:{account}, both URL-encoded
    expect(parsed.pathname).toBe('/Soluciones%20Fabrick:admin%40example.com');
  });
});
