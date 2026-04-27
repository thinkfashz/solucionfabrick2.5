/**
 * Money / multi-currency helpers (epic 6).
 *
 * Prices in the database are stored in CLP. At render time they are converted
 * to the user's currency using `exchange_rates` (base CLP, refreshed daily by
 * `/api/cron/refresh-rates`).
 *
 * For display only: payment processors must always settle in their gateway's
 * native currency. CLP → MercadoPago, USD → Stripe (see `src/lib/payments/`).
 */

export type CurrencyCode = 'CLP' | 'USD' | 'EUR' | 'UF';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  CLP: { code: 'CLP', symbol: '$', decimals: 0, locale: 'es-CL' },
  USD: { code: 'USD', symbol: 'US$', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, locale: 'es-ES' },
  UF: { code: 'UF', symbol: 'UF', decimals: 2, locale: 'es-CL' },
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

/**
 * Convert an amount in CLP to another currency using the latest exchange rate.
 * Rate semantics: `1 CLP = rate <quote>` (i.e. `amountQuote = amountClp * rate`).
 *
 * If the target currency is CLP, returns the input unchanged. Throws when the
 * required rate is missing (caller is expected to load it first).
 */
export function convertFromClp(amountClp: number, target: CurrencyCode, rate: number): number {
  if (target === 'CLP') return Math.round(amountClp);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Tipo de cambio inválido para ${target}`);
  }
  const meta = CURRENCIES[target];
  const factor = 10 ** meta.decimals;
  return Math.round(amountClp * rate * factor) / factor;
}

/**
 * Locale-aware money formatter that respects the currency's decimals and the
 * user's locale. Example: `formatMoney(12990, 'CLP')` → `"$12.990"`.
 */
export function formatMoney(amount: number, currency: CurrencyCode = 'CLP', locale?: string): string {
  const meta = CURRENCIES[currency];
  const useLocale = locale ?? meta.locale;
  try {
    return new Intl.NumberFormat(useLocale, {
      style: 'currency',
      currency: meta.code === 'UF' ? 'CLP' : meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(amount).replace(/\u00A0/g, ' ');
  } catch {
    return `${meta.symbol}${amount.toFixed(meta.decimals)}`;
  }
}

/**
 * Persist or read the currency the user picked, in a cookie compatible with
 * Next.js middleware. Default is CLP. Allowed values are constrained by
 * `CURRENCIES` to avoid header injection.
 */
export const CURRENCY_COOKIE = 'fabrick_currency';
export const DEFAULT_CURRENCY: CurrencyCode = 'CLP';

export function readCurrencyCookie(cookieHeader: string | null | undefined): CurrencyCode {
  if (!cookieHeader) return DEFAULT_CURRENCY;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE}=([^;]+)`));
  if (!match) return DEFAULT_CURRENCY;
  const value = decodeURIComponent(match[1]);
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}
