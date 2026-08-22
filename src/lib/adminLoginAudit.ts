/**
 * Admin login audit — best-effort forensic trail of every terminal branch in
 * /api/admin/login. Logging must never block a legitimate login.
 */

import { runRawSql, sqlText } from '@/lib/web-pages/sql';

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
    const ip = cap(event.ip, 100) || 'unknown';
    const email = cap(event.email ?? null, 320);
    const reason = cap(event.reason ?? null, 500);
    const userAgent = cap(event.userAgent ?? null, 500);

    // Use the same privileged raw-SQL channel as the session-audit subsystem.
    // The REST/PostgREST insert path can have table access while still lacking
    // USAGE on the BIGSERIAL sequence (admin_login_audit_id_seq), which caused
    // noisy production errors. The server-side SQL endpoint owns the sequence
    // correctly and remains unavailable to browser code.
    const result = await runRawSql(`
CREATE TABLE IF NOT EXISTS admin_login_audit (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT NOT NULL,
  email TEXT,
  outcome TEXT NOT NULL,
  reason TEXT,
  user_agent TEXT,
  device TEXT,
  location_hint TEXT,
  session_id TEXT
);
INSERT INTO admin_login_audit (ip, email, outcome, reason, user_agent)
VALUES (${sqlText(ip)}, ${sqlText(email)}, ${sqlText(event.outcome)}, ${sqlText(reason)}, ${sqlText(userAgent)});
`);

    if (!result.ok) {
      const detail = JSON.stringify(result.data ?? {});
      if (!isMissingTableError(detail)) {
        // eslint-disable-next-line no-console
        console.error('[adminLoginAudit] insert failed:', detail);
      }
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
