import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Check = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  critical?: boolean;
};

async function checkTable(table: string, label: string, critical = true): Promise<Check> {
  try {
    const { error } = await insforgeAdmin.database.from(table).select('id').limit(1);
    return {
      key: `table_${table}`,
      label,
      ok: !error,
      detail: error ? error.message || 'No disponible' : 'Disponible',
      critical,
    };
  } catch (err) {
    return {
      key: `table_${table}`,
      label,
      ok: false,
      detail: err instanceof Error ? err.message : 'No disponible',
      critical,
    };
  }
}

function envCheck(key: string, label: string, value: string | undefined, critical = false): Check {
  return {
    key,
    label,
    ok: Boolean(value),
    detail: value ? 'Configurado' : 'Pendiente',
    critical,
  };
}

export async function GET() {
  const checks: Check[] = [];

  checks.push(envCheck('env_insforge_api_key', 'INSFORGE_API_KEY', process.env.INSFORGE_API_KEY, true));
  checks.push(envCheck('env_platform_secret', 'PLATFORM_ADMIN_SECRET', process.env.PLATFORM_ADMIN_SECRET, false));
  checks.push(envCheck('env_app_url', 'NEXT_PUBLIC_APP_URL / VERCEL_URL', process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL, false));

  checks.push(await checkTable('tenants', 'Tabla tenants'));
  checks.push(await checkTable('admin_users', 'Tabla admin_users'));
  checks.push(await checkTable('platform_plans', 'Tabla platform_plans'));
  checks.push(await checkTable('platform_subscriptions', 'Tabla platform_subscriptions'));
  checks.push(await checkTable('tenant_modules', 'Tabla tenant_modules', false));
  checks.push(await checkTable('admin_error_logs', 'Tabla admin_error_logs', false));

  try {
    const resend = await getResendCredentials();
    checks.push({
      key: 'email_provider',
      label: 'Correo de bienvenida',
      ok: resend.ready || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      detail: resend.ready ? 'Resend listo' : process.env.SMTP_HOST ? 'SMTP configurado' : 'Pendiente: sin Resend/SMTP',
      critical: false,
    });
  } catch (err) {
    checks.push({
      key: 'email_provider',
      label: 'Correo de bienvenida',
      ok: false,
      detail: err instanceof Error ? err.message : 'No se pudo verificar correo',
      critical: false,
    });
  }

  const criticalChecks = checks.filter((item) => item.critical !== false);
  const criticalOk = criticalChecks.every((item) => item.ok);
  const allOk = checks.every((item) => item.ok);

  return NextResponse.json({
    ok: criticalOk,
    readyForPilot: criticalOk,
    readyForPublicLaunch: allOk,
    checks,
    summary: criticalOk
      ? 'Onboarding listo para pilotos controlados.'
      : 'Faltan piezas críticas para crear tenants reales.',
  });
}
