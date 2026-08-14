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
 */

import { insforgeAdmin } from '@/lib/insforge';

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
  reason?: string | null;
  userAgent?: string | null;
}

const TABLE = 'admin_login_audit';

function cap(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function isMissingTableError(err: unknown): boolean {
  const message = (err as { message?: string } | null)?.message ?? String(err ?? '');
  return /could not find the table|relation .* does not exist|schema cache/i.test(message);
}

export async function recordLoginAttempt(event: LoginAuditEvent): Promise<void> {
  try {
    const row = {
      ip: cap(event.ip, 100) || 'unknown',
      email: cap(event.email ?? null, 320),
      outcome: event.outcome,
      reason: cap(event.reason ?? null, 500),
      user_agent: cap(event.userAgent ?? null, 500),
    };

    // Security/audit tables must be written with the server-side privileged
    // client. Using the public client made PostgreSQL reject the bigserial
    // sequence (`admin_login_audit_id_seq`) even when the table itself was
    // writable through the API.
    const { error } = await insforgeAdmin.database.from(TABLE).insert([row]);
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

export function userAgentFromRequest(request: Request): string | null {
  return request.headers.get('user-agent') ?? null;
}
