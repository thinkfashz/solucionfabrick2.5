import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin, INSFORGE_BASE_URL } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type Check = {
  name: string;
  ok: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
};

async function requireSuperadmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  if (payload.rol !== 'superadmin') return { error: NextResponse.json({ error: 'Solo superadmin puede ver diagnósticos.' }, { status: 403 }) };
  return { payload };
}

function envCheck(name: string, required: boolean): Check {
  const ok = Boolean(process.env[name]?.trim());
  return {
    name,
    ok,
    severity: ok ? 'info' : required ? 'critical' : 'warning',
    message: ok ? 'Configurada' : required ? 'Falta configurar esta variable en Vercel.' : 'Opcional o dependiente de módulo.',
  };
}

async function tableCheck(table: string): Promise<Check> {
  try {
    const { error } = await insforgeAdmin.database.from(table).select('*').limit(1);
    if (!error) return { name: table, ok: true, severity: 'info', message: 'Tabla accesible.' };
    return { name: table, ok: false, severity: 'critical', message: error.message ?? 'No accesible.' };
  } catch (err) {
    return { name: table, ok: false, severity: 'critical', message: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin(request);
  if (auth.error) return auth.error;

  const env = [
    envCheck('INSFORGE_API_KEY', true),
    envCheck('NEXT_PUBLIC_INSFORGE_URL', true),
    envCheck('NEXT_PUBLIC_INSFORGE_ANON_KEY', true),
    envCheck('ADMIN_SESSION_SECRET', true),
    envCheck('ADMIN_PASSWORD_PEPPER', true),
    envCheck('WEBAUTHN_RP_ID', true),
    envCheck('WEBAUTHN_ORIGIN', true),
    envCheck('NEXT_PUBLIC_APP_URL', false),
    envCheck('RESEND_API_KEY', false),
    envCheck('MERCADO_PAGO_ACCESS_TOKEN', false),
  ];

  const tables = await Promise.all([
    tableCheck('admin_users'),
    tableCheck('admin_invitations'),
    tableCheck('demo_tokens'),
    tableCheck('demo_events'),
    tableCheck('admin_login_audit'),
    tableCheck('admin_passkeys'),
  ]);

  const critical = [...env, ...tables].filter((item) => !item.ok && item.severity === 'critical');

  return NextResponse.json({
    ok: critical.length === 0,
    checkedAt: new Date().toISOString(),
    insforgeBaseUrl: INSFORGE_BASE_URL,
    missingCritical: critical.map((item) => item.name),
    env,
    tables,
  });
}
