import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession, getClientIp } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type AuditRow = {
  email?: string | null;
  ip?: string | null;
  outcome?: string | null;
  ts?: string | null;
  user_agent?: string | null;
};

type NormalizedRow = {
  email: string;
  ip: string;
  outcome: string;
  ts: string | null;
  user_agent: string;
  device: ReturnType<typeof parseDevice>;
};

function isMissingTable(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

function parseDevice(userAgent?: string | null) {
  const ua = userAgent ?? '';
  const lower = ua.toLowerCase();
  const os = lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')
    ? 'iOS'
    : lower.includes('android')
      ? 'Android'
      : lower.includes('windows')
        ? 'Windows'
        : lower.includes('mac os') || lower.includes('macintosh')
          ? 'macOS'
          : lower.includes('linux')
            ? 'Linux'
            : 'Desconocido';
  const browser = lower.includes('edg/')
    ? 'Edge'
    : lower.includes('chrome/') || lower.includes('crios/')
      ? 'Chrome'
      : lower.includes('safari/') && !lower.includes('chrome/')
        ? 'Safari'
        : lower.includes('firefox/')
          ? 'Firefox'
          : 'Desconocido';
  const type = lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')
    ? 'Móvil'
    : lower.includes('ipad') || lower.includes('tablet')
      ? 'Tablet'
      : 'PC';
  return { os, browser, type, label: `${type} · ${os} · ${browser}` };
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  if (payload.rol === 'viewer') return { error: NextResponse.json({ error: 'Modo demo: sesiones es una zona crítica.' }, { status: 403 }) };
  return { payload };
}

function isSuccess(outcome: string) {
  return /success|ok|login/i.test(outcome);
}

function buildSummary(rows: NormalizedRow[]) {
  const ips = Array.from(new Set(rows.map((row) => row.ip).filter(Boolean)));
  const devices = Array.from(new Set(rows.map((row) => row.device.label).filter(Boolean)));
  return {
    total: rows.length,
    success: rows.filter((row) => isSuccess(row.outcome)).length,
    failed: rows.filter((row) => /fail|error|invalid|blocked|limited/i.test(row.outcome)).length,
    uniqueIps: ips.length,
    uniqueDevices: devices.length,
    lastLogin: rows.find((row) => isSuccess(row.outcome))?.ts ?? rows[0]?.ts ?? null,
    lastIp: rows.find((row) => isSuccess(row.outcome))?.ip ?? rows[0]?.ip ?? null,
    lastDevice: rows.find((row) => isSuccess(row.outcome))?.device.label ?? rows[0]?.device.label ?? null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const emailFilter = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const selfOnly = auth.payload?.rol !== 'superadmin';
  const currentEmail = auth.payload?.email?.toLowerCase() ?? '';
  const targetEmail = selfOnly ? currentEmail : emailFilter;

  let query = insforgeAdmin.database
    .from('admin_login_audit')
    .select('email, ip, outcome, ts, user_agent')
    .order('ts', { ascending: false })
    .limit(500);

  if (targetEmail) query = query.eq('email', targetEmail);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        ok: false,
        error: 'La tabla admin_login_audit no existe o no tiene las columnas necesarias.',
        summary: { total: 0, success: 0, failed: 0, uniqueIps: 0, uniqueDevices: 0 },
        superadminSummary: { email: currentEmail, total: 0, success: 0, failed: 0, uniqueIps: 0, uniqueDevices: 0, lastLogin: null, lastIp: null, lastDevice: null },
        currentIp: getClientIp(request),
        emails: [],
        ips: [],
        devices: [],
        sessions: [],
      });
    }
    return NextResponse.json({ error: error.message ?? 'No se pudo leer la auditoría.' }, { status: 500 });
  }

  const rows: NormalizedRow[] = ((data ?? []) as AuditRow[]).map((row) => ({
    email: row.email ?? 'sin email',
    ip: row.ip ?? 'sin IP',
    outcome: row.outcome ?? 'unknown',
    ts: row.ts ?? null,
    user_agent: row.user_agent ?? '',
    device: parseDevice(row.user_agent),
  }));

  const emails = Array.from(new Set(rows.map((row) => row.email).filter(Boolean))).sort();
  const ips = Array.from(new Set(rows.map((row) => row.ip).filter(Boolean))).map((ip) => ({
    ip,
    total: rows.filter((row) => row.ip === ip).length,
    lastSeen: rows.find((row) => row.ip === ip)?.ts ?? null,
  }));
  const deviceMap = new Map<string, { label: string; type: string; os: string; browser: string; total: number; lastSeen: string | null }>();
  for (const row of rows) {
    const key = row.device.label;
    const prev = deviceMap.get(key);
    if (prev) prev.total += 1;
    else deviceMap.set(key, { ...row.device, total: 1, lastSeen: row.ts });
  }

  const currentUserRows = currentEmail ? rows.filter((row) => row.email.toLowerCase() === currentEmail) : [];

  return NextResponse.json({
    ok: true,
    currentIp: getClientIp(request),
    role: auth.payload?.rol ?? 'admin',
    activeFilter: targetEmail || null,
    emails,
    summary: buildSummary(rows),
    superadminSummary: {
      email: currentEmail,
      ...buildSummary(currentUserRows.length > 0 ? currentUserRows : rows),
      ips: Array.from(new Set((currentUserRows.length > 0 ? currentUserRows : rows).map((row) => row.ip))).slice(0, 12),
      devices: Array.from(new Set((currentUserRows.length > 0 ? currentUserRows : rows).map((row) => row.device.label))).slice(0, 12),
    },
    ips,
    devices: Array.from(deviceMap.values()),
    sessions: rows,
  });
}
