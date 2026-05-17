/**
 * Central environment-variable validation.
 *
 * Call validateEnv() once at server startup (instrumentation.ts).
 * In production every REQUIRED variable must be present and well-formed;
 * the process exits with a descriptive list of failures rather than
 * surfacing cryptic runtime errors later.
 *
 * Exports typed, pre-resolved accessors so callers never call
 * `process.env` directly for critical secrets.
 */
import 'server-only';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isProd = process.env.NODE_ENV === 'production';

function get(key: string): string {
  return (process.env[key] ?? '').trim();
}

function defined(key: string): boolean {
  const v = get(key);
  return v.length > 0;
}

/** Returns error string if value is set but fails the predicate. */
function ifPresent(key: string, test: (v: string) => boolean, msg: string): string | null {
  const v = get(key);
  if (v.length === 0) return null;
  return test(v) ? null : `${key}: ${msg}`;
}

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.hostname.length > 0;
  } catch {
    return false;
  }
}

function isValidHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Picks the first non-empty value from a list of env-var names. */
function pick(...keys: string[]): string {
  for (const k of keys) {
    const v = get(k);
    if (v) return v;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  function requireInProd(key: string, description: string, minLen = 1) {
    if (!isProd) return;
    const v = get(key);
    if (v.length < minLen) {
      errors.push(`${key}: ${description} (minLength: ${minLen})`);
    }
  }

  function warnIfMissing(key: string, description: string) {
    if (!isProd) return;
    if (!defined(key)) warnings.push(`${key}: ${description}`);
  }

  // -------------------------------------------------------------------------
  // 1. Security
  // -------------------------------------------------------------------------
  requireInProd(
    'ADMIN_SESSION_SECRET',
    'Required to sign admin session cookies. Generate with: openssl rand -base64 48',
    32,
  );
  requireInProd(
    'ADMIN_PASSWORD_PEPPER',
    'Required for layered password hashing. Generate with: openssl rand -base64 48',
    32,
  );
  requireInProd(
    'ADMIN_INIT_SECRET',
    'Required to protect the first-admin initialization endpoint. Generate with: openssl rand -base64 48',
    32,
  );

  const integrationEncryptionKey = pick('INTEGRATIONS_ENC_KEY', 'ENCRYPTION_KEY');
  if (isProd && integrationEncryptionKey.length < 32) {
    errors.push(
      'INTEGRATIONS_ENC_KEY or ENCRYPTION_KEY: required to encrypt integration credentials at rest (minLength: 32).',
    );
  }

  // -------------------------------------------------------------------------
  // 2. Database / InsForge
  // -------------------------------------------------------------------------
  requireInProd('NEXT_PUBLIC_INSFORGE_URL', 'InsForge project URL is required in production.');
  requireInProd(
    'NEXT_PUBLIC_INSFORGE_ANON_KEY',
    'InsForge anonymous API key is required in production.',
  );
  requireInProd('INSFORGE_API_KEY', 'InsForge server-side API key is required in production.');

  const errInsforgeUrl = ifPresent(
    'NEXT_PUBLIC_INSFORGE_URL',
    isValidUrl,
    'must be a valid URL (e.g. https://project.us-east.insforge.app)',
  );
  if (errInsforgeUrl) errors.push(errInsforgeUrl);

  // -------------------------------------------------------------------------
  // 3. Public URLs / WebAuthn
  // -------------------------------------------------------------------------
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL']) {
    const err = ifPresent(key, isValidUrl, 'must be a valid absolute URL');
    if (err) errors.push(err);
  }

  if (isProd && !defined('NEXT_PUBLIC_APP_URL') && !defined('NEXT_PUBLIC_SITE_URL')) {
    errors.push(
      'NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL: at least one public site URL must be set in production.',
    );
  }

  const errWebAuthnOrigin = ifPresent(
    'WEBAUTHN_ORIGIN',
    isProd ? isValidHttpsUrl : isValidUrl,
    isProd ? 'must be a valid HTTPS origin (e.g. https://solucionesfabrick.com)' : 'must be a valid origin',
  );
  if (errWebAuthnOrigin) errors.push(errWebAuthnOrigin);

  if (isProd && !defined('WEBAUTHN_RP_ID')) {
    warnings.push('WEBAUTHN_RP_ID: not set; passkeys will infer the request hostname. Prefer solucionesfabrick.com in production.');
  }
  if (isProd && !defined('WEBAUTHN_ORIGIN')) {
    warnings.push('WEBAUTHN_ORIGIN: not set; passkeys will infer request origin. Prefer https://solucionesfabrick.com in production.');
  }

  // -------------------------------------------------------------------------
  // 4. Email (Resend/SMTP env fallback; DB integrations can also be used)
  // -------------------------------------------------------------------------
  const hasResend = defined('RESEND_API_KEY');
  const hasSmtp = defined('SMTP_HOST') && defined('SMTP_USER') && defined('SMTP_PASS');

  if (isProd && !hasResend && !hasSmtp) {
    warnings.push(
      'Email provider env fallback not configured. This is allowed if Resend credentials are stored encrypted in integrations DB.',
    );
  }

  // Validate RESEND key prefix when present
  const errResend = ifPresent(
    'RESEND_API_KEY',
    (v) => v.startsWith('re_'),
    'Resend API keys start with "re_". Check your Resend dashboard.',
  );
  if (errResend) errors.push(errResend);

  // SMTP port must be a number when provided
  const errSmtpPort = ifPresent(
    'SMTP_PORT',
    (v) => /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 65535,
    'must be a valid TCP port number (1-65535)',
  );
  if (errSmtpPort) errors.push(errSmtpPort);

  // -------------------------------------------------------------------------
  // 5. Payments — MercadoPago
  // -------------------------------------------------------------------------
  const hasAccessToken = defined('MERCADO_PAGO_ACCESS_TOKEN') || defined('MP_ACCESS_TOKEN') || defined('MERCADOPAGO_ACCESS_TOKEN');
  const hasPublicKey =
    defined('NEXT_PUBLIC_MP_PUBLIC_KEY') ||
    defined('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY') ||
    defined('NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY') ||
    defined('MP_PUBLIC_KEY') ||
    defined('MERCADO_PAGO_PUBLIC_KEY') ||
    defined('MERCADOPAGO_PUBLIC_KEY');

  if (isProd && !hasAccessToken) {
    warnings.push(
      'MercadoPago access token not configured. Set MERCADO_PAGO_ACCESS_TOKEN (or MP_ACCESS_TOKEN / MERCADOPAGO_ACCESS_TOKEN) before enabling real payments.',
    );
  }
  if (isProd && !hasPublicKey) {
    warnings.push(
      'MercadoPago public key not configured. Set NEXT_PUBLIC_MP_PUBLIC_KEY before enabling real checkout.',
    );
  }

  // Validate token prefix when present (APP- or TEST- in sandbox)
  for (const key of ['MERCADO_PAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN']) {
    const err = ifPresent(
      key,
      (v) => v.startsWith('APP_USR-') || v.startsWith('TEST-'),
      'MercadoPago access tokens start with "APP_USR-" (production) or "TEST-" (sandbox).',
    );
    if (err) errors.push(err);
  }

  // -------------------------------------------------------------------------
  // 6. Sentry (optional — warn in production if absent; validate DSN when set)
  // -------------------------------------------------------------------------
  warnIfMissing(
    'NEXT_PUBLIC_SENTRY_DSN',
    'Sentry DSN not set. Errors will not be reported to Sentry in production.',
  );

  const errDsn = ifPresent(
    'NEXT_PUBLIC_SENTRY_DSN',
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'https:' && u.hostname.includes('sentry');
      } catch {
        return false;
      }
    },
    'must be a valid HTTPS Sentry DSN (https://<key>@<org>.ingest.sentry.io/<project-id>)',
  );
  if (errDsn) errors.push(errDsn);

  // -------------------------------------------------------------------------
  // 7. Bootstrap secrets
  // -------------------------------------------------------------------------
  warnIfMissing(
    'CRON_SECRET',
    'CRON_SECRET not set — cron endpoints are unprotected.',
  );
  warnIfMissing(
    'NEWSLETTER_SECRET',
    'NEWSLETTER_SECRET not set — newsletter endpoints are unprotected.',
  );
  warnIfMissing(
    'TURNSTILE_SECRET_KEY',
    'TURNSTILE_SECRET_KEY not set — Cloudflare Turnstile bot protection is disabled.',
  );

  return { ok: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Startup guard — called from instrumentation.ts on Node.js runtime
// ---------------------------------------------------------------------------

export function assertEnv(): void {
  const { ok, errors, warnings } = validateEnv();

  for (const w of warnings) {
    console.warn(`[env] WARN  ${w}`);
  }

  if (!ok) {
    const lines = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║          FATAL: Missing or invalid environment variables     ║',
      '╠══════════════════════════════════════════════════════════════╣',
      ...errors.map((e) => `║  ✗  ${e.padEnd(58)}║`),
      '╠══════════════════════════════════════════════════════════════╣',
      '║  Copy .env.example → .env.local and fill in the values.     ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
    ];
    console.error(lines.join('\n'));
    throw new Error(
      `Application startup aborted: ${errors.length} environment variable error(s). See console output above.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Typed accessors — import these instead of reading process.env directly
// ---------------------------------------------------------------------------

/** HMAC-SHA256 key for admin session cookies. */
export const ADMIN_SESSION_SECRET: string = get('ADMIN_SESSION_SECRET');

/** Pepper applied to every local admin password hash (scrypt). */
export const ADMIN_PASSWORD_PEPPER: string = get('ADMIN_PASSWORD_PEPPER');

/** Secret used to protect first-admin bootstrap. */
export const ADMIN_INIT_SECRET: string = get('ADMIN_INIT_SECRET');

/** AES-GCM key for encrypting integration credentials in the database. */
export const ENCRYPTION_KEY: string = pick('INTEGRATIONS_ENC_KEY', 'ENCRYPTION_KEY');

/** Explicit alias for integration credentials encryption. */
export const INTEGRATIONS_ENC_KEY: string = ENCRYPTION_KEY;

/** InsForge server-side service-role key. */
export const INSFORGE_API_KEY: string = get('INSFORGE_API_KEY');

/** InsForge public URL used by server helpers and public SDK fallback. */
export const NEXT_PUBLIC_INSFORGE_URL: string = get('NEXT_PUBLIC_INSFORGE_URL');

/** InsForge anon key used only where public client access is intentional. */
export const NEXT_PUBLIC_INSFORGE_ANON_KEY: string = get('NEXT_PUBLIC_INSFORGE_ANON_KEY');

/** WebAuthn relying-party ID, normally solucionesfabrick.com in production. */
export const WEBAUTHN_RP_ID: string = get('WEBAUTHN_RP_ID');

/** WebAuthn origin, normally https://solucionesfabrick.com in production. */
export const WEBAUTHN_ORIGIN: string = get('WEBAUTHN_ORIGIN');

/** Canonical public URL of the site (e.g. https://fabrick.cl). */
export const APP_URL: string =
  get('NEXT_PUBLIC_APP_URL') || get('NEXT_PUBLIC_SITE_URL') || get('VERCEL_URL');

/** Resend API key (server-only). */
export const RESEND_API_KEY: string = get('RESEND_API_KEY');

/** MercadoPago server-side access token (first configured alias wins). */
export const MP_ACCESS_TOKEN: string = pick(
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MP_ACCESS_TOKEN',
  'MERCADOPAGO_ACCESS_TOKEN',
);

/** MercadoPago public key for client-side tokenisation. */
export const MP_PUBLIC_KEY: string = pick(
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
  'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
  'MP_PUBLIC_KEY',
  'MERCADO_PAGO_PUBLIC_KEY',
  'MERCADOPAGO_PUBLIC_KEY',
);

/** MercadoPago webhook secret for signature verification. */
export const MP_WEBHOOK_SECRET: string = pick(
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'MP_WEBHOOK_SECRET',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'PAYMENTS_WEBHOOK_SECRET',
);

/** Sentry DSN (public — safe to expose in browser bundle). */
export const SENTRY_DSN: string = get('NEXT_PUBLIC_SENTRY_DSN');
