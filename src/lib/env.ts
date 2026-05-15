/**
 * Centralized server-side environment variable validation.
 * Must NOT be imported in Edge middleware (uses Node.js path).
 * Import this only in API route handlers and server components.
 */
import 'server-only';

export interface EnvValidationResult {
  missing: string[];
  warnings: string[];
}

const REQUIRED_IN_PRODUCTION: readonly string[] = [
  'ADMIN_SESSION_SECRET',
  'INSFORGE_API_KEY',
  'NEXT_PUBLIC_INSFORGE_URL',
];

const OPTIONAL_BUT_WARNED: readonly string[] = [
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
];

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) missing.push(key);
    }
  }

  for (const key of OPTIONAL_BUT_WARNED) {
    if (!process.env[key]) warnings.push(key);
  }

  if (missing.length > 0) {
    console.error(
      `[env] Missing required environment variables in production: ${missing.join(', ')}. ` +
      'Add them to your deployment environment and redeploy.',
    );
  }

  return { missing, warnings };
}

/**
 * Returns the value of a required env var. Throws in production if missing,
 * returns the fallback in development (with a warning).
 */
export function getRequiredEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[env] Required environment variable "${key}" is not set in production.`,
    );
  }
  if (devFallback !== undefined) {
    console.warn(`[env] "${key}" is not set. Using dev-only fallback. DO NOT deploy this way.`);
    return devFallback;
  }
  throw new Error(`[env] Required environment variable "${key}" is not set.`);
}
