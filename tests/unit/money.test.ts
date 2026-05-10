import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  convertFromClp,
  formatMoney,
  isCurrencyCode,
  readCurrencyCookie,
  type CurrencyCode,
} from '@/lib/money';

describe('CURRENCIES table', () => {
  it('has metadata for every supported code', () => {
    const codes: CurrencyCode[] = ['CLP', 'USD', 'EUR', 'UF'];
    for (const c of codes) {
      const meta = CURRENCIES[c];
      expect(meta.code).toBe(c);
      expect(typeof meta.symbol).toBe('string');
      expect(meta.symbol.length).toBeGreaterThan(0);
      expect(Number.isInteger(meta.decimals)).toBe(true);
      expect(meta.decimals).toBeGreaterThanOrEqual(0);
      expect(typeof meta.locale).toBe('string');
    }
  });

  it('keeps CLP without decimals (Chilean retail convention)', () => {
    expect(CURRENCIES.CLP.decimals).toBe(0);
  });

  it('uses 2 decimals for USD/EUR/UF', () => {
    expect(CURRENCIES.USD.decimals).toBe(2);
    expect(CURRENCIES.EUR.decimals).toBe(2);
    expect(CURRENCIES.UF.decimals).toBe(2);
  });
});

describe('isCurrencyCode', () => {
  it('accepts every code in the CURRENCIES map', () => {
    for (const c of Object.keys(CURRENCIES)) {
      expect(isCurrencyCode(c)).toBe(true);
    }
  });

  it('rejects unknown strings, non-strings and prototype keys', () => {
    expect(isCurrencyCode('clp')).toBe(false); // case sensitive
    expect(isCurrencyCode('ARS')).toBe(false);
    expect(isCurrencyCode('')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
    expect(isCurrencyCode(123)).toBe(false);
    expect(isCurrencyCode({})).toBe(false);
    // Object.prototype.hasOwnProperty guard avoids accepting "toString" etc.
    expect(isCurrencyCode('toString')).toBe(false);
    expect(isCurrencyCode('__proto__')).toBe(false);
  });
});

describe('convertFromClp', () => {
  it('returns CLP unchanged (rounded) when target is CLP', () => {
    expect(convertFromClp(12345, 'CLP', 999)).toBe(12345);
    expect(convertFromClp(10.4, 'CLP', 1)).toBe(10);
    expect(convertFromClp(10.6, 'CLP', 1)).toBe(11);
  });

  it('multiplies by rate and rounds to the target decimals', () => {
    // 10000 CLP * 0.0011 = 11 USD exact
    expect(convertFromClp(10000, 'USD', 0.0011)).toBe(11);
    // Half-cent rounding (USD has 2 decimals)
    expect(convertFromClp(1, 'USD', 0.001234)).toBeCloseTo(0, 2);
    expect(convertFromClp(10000, 'USD', 0.0012345)).toBeCloseTo(12.35, 2);
  });

  it('throws when the rate is not a positive finite number', () => {
    expect(() => convertFromClp(1000, 'USD', 0)).toThrow(/USD/);
    expect(() => convertFromClp(1000, 'USD', -1)).toThrow();
    expect(() => convertFromClp(1000, 'USD', Number.NaN)).toThrow();
    expect(() => convertFromClp(1000, 'EUR', Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('formatMoney', () => {
  it('formats CLP with no decimals using es-CL locale by default', () => {
    const out = formatMoney(12990); // CLP default
    // Different ICU versions render the symbol differently; assert the digits
    // and absence of decimal separators rather than the exact prefix.
    expect(out).toMatch(/12[.\s]?990/);
    expect(out).not.toMatch(/[.,]\d{2}\b/); // no two-decimal tail
  });

  it('honours the currency decimals for USD', () => {
    const out = formatMoney(12.5, 'USD');
    expect(out).toMatch(/12[.,]50/);
  });

  it('uses CLP formatting machinery for UF (with the UF symbol fallback path)', () => {
    // UF has no Intl currency code; the implementation maps it to CLP for the
    // formatter and we just check it renders as a string with two decimals.
    const out = formatMoney(1.5, 'UF');
    expect(typeof out).toBe('string');
    expect(out).toMatch(/1[.,]50/);
  });

  it('falls back to the symbol+toFixed when an invalid locale throws', () => {
    // Passing an obviously invalid BCP-47 tag forces the catch-branch.
    const out = formatMoney(7, 'USD', '!!not-a-locale!!');
    expect(out).toBe('US$7.00');
  });
});

describe('readCurrencyCookie', () => {
  it('returns the default when the header is missing/empty', () => {
    expect(readCurrencyCookie(undefined)).toBe(DEFAULT_CURRENCY);
    expect(readCurrencyCookie(null)).toBe(DEFAULT_CURRENCY);
    expect(readCurrencyCookie('')).toBe(DEFAULT_CURRENCY);
  });

  it('returns the default when the cookie is not present', () => {
    expect(readCurrencyCookie('foo=bar; other=1')).toBe(DEFAULT_CURRENCY);
  });

  it('returns the value when the cookie is a valid currency code', () => {
    expect(readCurrencyCookie(`${CURRENCY_COOKIE}=USD`)).toBe('USD');
    expect(readCurrencyCookie(`a=1; ${CURRENCY_COOKIE}=EUR; b=2`)).toBe('EUR');
  });

  it('falls back to default when the cookie holds an unknown value', () => {
    expect(readCurrencyCookie(`${CURRENCY_COOKIE}=XYZ`)).toBe(DEFAULT_CURRENCY);
    expect(readCurrencyCookie(`${CURRENCY_COOKIE}=`)).toBe(DEFAULT_CURRENCY);
  });

  it('decodes URL-encoded cookie values before validating', () => {
    // %55%53%44 = "USD" — checks the decodeURIComponent step is on the
    // happy-path before the whitelist check.
    expect(readCurrencyCookie(`${CURRENCY_COOKIE}=%55%53%44`)).toBe('USD');
  });
});
