import { rows, runRawSql, sqlText } from '@/lib/web-pages/sql';

export type AdminSessionRow = {
  session_id: string;
  email: string | null;
  role: string | null;
  ip: string | null;
  device: string | null;
  location_hint: string | null;
  login_at: string;
  last_seen_at: string | null;
  logout_at: string | null;
  duration_seconds: number | null;
  status: string | null;
};

export function detectDeviceFromUa(ua?: string | null) {
  const value = ua || '';
  const os = /Android/i.test(value) ? 'Android' : /iPhone|iPad/i.test(value) ? 'iOS' : /Windows/i.test(value) ? 'Windows' : /Mac OS X/i.test(value) ? 'macOS' : /Linux/i.test(value) ? 'Linux' : 'Dispositivo';
  const browser = /Edg\//i.test(value) ? 'Edge' : /Chrome\//i.test(value) ? 'Chrome' : /Firefox\//i.test(value) ? 'Firefox' : /Safari\//i.test(value) ? 'Safari' : 'Navegador';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(value) ? 'móvil' : 'desktop';
  return `${browser} · ${os} · ${mobile}`;
}

export function locationHintFromHeaders(headers: Headers) {
  const city = headers.get('x-vercel-ip-city');
  const region = headers.get('x-vercel-ip-country-region');
  const country = headers.get('x-vercel-ip-country');
  return [city, region, country].filter(Boolean).join(', ') || 'Ubicación aproximada no disponible';
}

export async function ensureAdminSessionAuditTables() {
  const result = await runRawSql(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
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
ALTER TABLE admin_login_audit ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE admin_login_audit ADD COLUMN IF NOT EXISTS location_hint TEXT;
ALTER TABLE admin_login_audit ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_admin_login_audit_ts ON admin_login_audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_audit_email ON admin_login_audit(email);

CREATE TABLE IF NOT EXISTS admin_session_audit (
  session_id TEXT PRIMARY KEY,
  email TEXT,
  role TEXT,
  tenant_id TEXT,
  ip TEXT,
  user_agent TEXT,
  device TEXT,
  location_hint TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS location_hint TEXT;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE admin_session_audit ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_login_at ON admin_session_audit(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_email ON admin_session_audit(email);
CREATE INDEX IF NOT EXISTS idx_admin_session_audit_status ON admin_session_audit(status);
`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
}

export async function createAdminSessionRecord(input: { sessionId: string; email: string; role: string; tenantId?: string | null; ip: string; userAgent?: string | null; locationHint?: string | null; }) {
  try {
    await ensureAdminSessionAuditTables();
    const result = await runRawSql(`
INSERT INTO admin_session_audit (session_id, email, role, tenant_id, ip, user_agent, device, location_hint, login_at, last_seen_at, status)
VALUES (${sqlText(input.sessionId)}, ${sqlText(input.email)}, ${sqlText(input.role)}, ${sqlText(input.tenantId)}, ${sqlText(input.ip)}, ${sqlText(input.userAgent)}, ${sqlText(detectDeviceFromUa(input.userAgent))}, ${sqlText(input.locationHint)}, NOW(), NOW(), 'active')
ON CONFLICT (session_id) DO UPDATE SET last_seen_at = NOW(), status = 'active';
UPDATE admin_login_audit SET session_id = ${sqlText(input.sessionId)}, device = ${sqlText(detectDeviceFromUa(input.userAgent))}, location_hint = ${sqlText(input.locationHint)} WHERE email = ${sqlText(input.email)} AND outcome = 'success' AND session_id IS NULL AND ts > NOW() - INTERVAL '2 minutes';
`);
    if (!result.ok) throw new Error(JSON.stringify(result.data));
  } catch (err) {
    console.error('[adminSessionAudit] create failed:', err);
  }
}

export async function touchAdminSession(sessionId?: string | null, status = 'active') {
  if (!sessionId) return;
  try {
    await ensureAdminSessionAuditTables();
    const result = await runRawSql(`
UPDATE admin_session_audit
SET last_seen_at = NOW(), status = ${sqlText(status)}, duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - login_at))::int)
WHERE session_id = ${sqlText(sessionId)};
`);
    if (!result.ok) throw new Error(JSON.stringify(result.data));
  } catch (err) {
    console.error('[adminSessionAudit] touch failed:', err);
  }
}

export async function closeAdminSession(sessionId?: string | null, status = 'logout') {
  if (!sessionId) return;
  try {
    await ensureAdminSessionAuditTables();
    const result = await runRawSql(`
UPDATE admin_session_audit
SET last_seen_at = NOW(), logout_at = COALESCE(logout_at, NOW()), status = ${sqlText(status)}, duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - login_at))::int)
WHERE session_id = ${sqlText(sessionId)};
`);
    if (!result.ok) throw new Error(JSON.stringify(result.data));
  } catch (err) {
    console.error('[adminSessionAudit] close failed:', err);
  }
}

export async function recentAdminSessions(limit = 12) {
  await ensureAdminSessionAuditTables();
  const result = await runRawSql(`
SELECT session_id, email, role, ip, device, location_hint, login_at::text, last_seen_at::text, logout_at::text, duration_seconds, status
FROM admin_session_audit
ORDER BY login_at DESC
LIMIT ${Math.max(1, Math.min(50, Math.round(limit)))};
`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
  return rows(result) as AdminSessionRow[];
}
