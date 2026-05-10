/**
 * Admin login audit — best-effort forensic trail of every terminal branch in
 * /api/admin/login. Powers post-mortems after a brute-force attempt or a
 * suspicious successful login.
 *
 * Design choices:
 * ───────────────
 *  • **Best-effort write**: a logging failure must NEVER block a legitimate
 *    login. Every DB error is swallowed (and logged via `console.error` for
 *    Vercel function logs) so login throughput is unchanged.
 *  • **Tolerates missing table**: if `admin_login_audit` doesn't exist yet
 *    (fresh install before the migration ran), the helper is a silent
 *    no-op. The login flow continues unchanged.
 *  • **Bounded payload**: email/reason/user-agent are length-capped before
 *    insertion so a hostile client can't bloat a row. The IP is left
 *    un-truncated since `getClientIp()` already returns a small bounded value.
 *  • **Outcome is a closed enum**: forces every login-route branch to map to a
 *    canonical category, which is what makes the table grep-able. Adding a
 *    new outcome is a deliberate change — not a free-form string.
 *
 * The schema lives in `scripts/create-tables.sql`:
 *
 *   CREATE TABLE admin_login_audit (
 *     id          bigserial PRIMARY KEY,
 *     ts          timestamptz NOT NULL DEFAULT now(),
 *     ip          text NOT NULL,
 *     email       text,
 *     outcome     text NOT NULL,
 *     reason      text,
 *     user_agent  text
 *   );
 *
 * Read it back from /admin/sql with:
 *
 *   SELECT ts, ip, email, outcome, reason
 *     FROM admin_login_audit
 *    ORDER BY ts DESC
 *    LIMIT 100;
 */

import { insforge } from '@/lib/insforge';

/**
 * Closed enum mirroring every terminal branch in /api/admin/login. Update
 * this list AND the login route together; tests assert that the route
 * inserts at least one row per outcome.
 */
export type LoginOutcome =
  | 'success'
  | 'rate_limited'
  | 'unknown_user'
  | 'invalid_password'
  | 'totp_required'
  | 'totp_invalid'
  | 'totp_decrypt_failed'
  | 'not_approved'
  | 'misconfigured'
  | 'bad_request'
  | 'error';

export interface LoginAuditEvent {
  ip: string;
  email?: string | null;
  outcome: LoginOutcome;
  /** Free-form short note (e.g. error code from InsForge). Capped to 500 chars. */
  reason?: string | null;
  /** Raw User-Agent header from the request. Capped to 500 chars. */
  userAgent?: string | null;
}

const TABLE = 'admin_login_audit';

/** Caps a value to N chars; preserves null/undefined. */
function cap(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) return null;
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Same heuristic as `adminRateLimitStore.ts`. PostgREST returns an opaque
 * error when the table doesn't exist; we treat it as "feature not yet
 * provisioned" and degrade silently to a no-op.
 */
function isMissingTableError(err: unknown): boolean {
  const message = (err as { message?: string } | null)?.message ?? String(err ?? '');
  return /could not find the table|relation .* does not exist|schema cache/i.test(message);
}

/**
 * Record a single login attempt. Best-effort: never throws, never blocks the
 * caller. The returned promise always resolves (even on DB failure).
 */
export async function recordLoginAttempt(event: LoginAuditEvent): Promise<void> {
  try {
    const row = {
      ip: cap(event.ip, 100) || 'unknown',
      email: cap(event.email ?? null, 320), // RFC 5321 max email length
      outcome: event.outcome,
      reason: cap(event.reason ?? null, 500),
      user_agent: cap(event.userAgent ?? null, 500),
    };
    const { error } = await insforge.database.from(TABLE).insert([row]);
    if (error && !isMissingTableError(error)) {
      // eslint-disable-next-line no-console
      console.error('[adminLoginAudit] insert failed:', error);
    }
  } catch (err) {
    if (!isMissingTableError(err)) {
      // eslint-disable-next-line no-console
      console.error('[adminLoginAudit] insert threw:', err);
    }
  }
}

/**
 * Convenience reader for `Request` objects: pulls the User-Agent header.
 * Returns `null` when the header is missing — safer than the empty string
 * for forensics since it preserves "we didn't see a UA" vs "client sent ''".
 */
export function userAgentFromRequest(request: Request): string | null {
  return request.headers.get('user-agent') ?? null;
}
