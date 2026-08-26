import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { inspectSaasTenantSchema } from '@/lib/ensureSaasTenantSchema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Check = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  critical?: boolean;
  category: 'database' | 'runtime' | 'email' | 'route' | 'branding';
  route?: string;
  action?: string;
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
      category: 'database',
      route: '/admin/setup',
      action: 'Revisar base de datos',
    };
  } catch (err) {
    return {
      key: `table_${table}`,
      label,
      ok: false,
      detail: err instanceof Error ? err.message : 'No disponible',
      critical,
      category: 'database',
      route: '/admin/setup',
      action: 'Revisar base de datos',
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
    category: 'runtime',
    route: '/admin/integraciones',
    action: 'Abrir configuración',
  };
}

async function probeRoute(request: NextRequest, path: string, label: string, critical = false): Promise<Check> {
  try {
    const url = new URL(path, request.nextUrl.origin);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      headers: request.headers.get('cookie') ? { cookie: request.headers.get('cookie') as string } : undefined,
      signal: AbortSignal.timeout(8_000),
    });
    const ok = response.status < 500;
    return {
      key: `route_${path.replace(/[^a-z0-9]+/gi, '_') || 'home'}`,
      label,
      ok,
      detail: ok ? `Ruta responde (${response.status})` : `Ruta respondió ${response.status}`,
      critical,
      category: 'route',
      route: path,
      action: 'Abrir y comprobar',
    };
  } catch (err) {
    return {
      key: `route_${path.replace(/[^a-z0-9]+/gi, '_') || 'home'}`,
      label,
      ok: false,
      detail: err instanceof Error ? err.message : 'No se pudo comprobar la ruta.',
      critical,
      category: 'route',
      route: path,
      action: 'Abrir y comprobar',
    };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  const checks: Check[] = [];

  checks.push(envCheck('env_insforge_api_key', 'Conexión segura con InsForge', process.env.INSFORGE_API_KEY, true));
  checks.push(envCheck('env_app_url', 'URL pública de la aplicación', process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL, false));
  checks.push({
    key: 'saas_runtime',
    label: 'Runtime multi-tenant',
    ok: process.env.NEXT_PUBLIC_SAAS_RUNTIME_ENABLED !== 'false',
    detail: process.env.NEXT_PUBLIC_SAAS_RUNTIME_ENABLED === 'false' ? 'Desactivado explícitamente' : 'Activo por defecto',
    critical: true,
    category: 'runtime',
    route: '/admin/saas',
    action: 'Revisar plataforma',
  });

  const schema = await inspectSaasTenantSchema();
  checks.push({
    key: 'tenant_schema',
    label: 'Columnas SaaS y branding del tenant',
    ok: schema.ok,
    detail: schema.detail,
    critical: true,
    category: 'branding',
    route: '/admin/saas?tab=health',
    action: schema.ok ? 'Ver detalles' : 'Reparar esquema',
  });

  checks.push(await checkTable('tenants', 'Directorio de tenants'));
  checks.push(await checkTable('admin_users', 'Usuarios administradores'));
  checks.push(await checkTable('platform_plans', 'Planes SaaS'));
  checks.push(await checkTable('platform_subscriptions', 'Suscripciones SaaS'));
  checks.push(await checkTable('tenant_modules', 'Módulos por tenant', false));
  checks.push(await checkTable('media_assets', 'Biblioteca para logos y multimedia', false));
  checks.push(await checkTable('admin_error_logs', 'Registro de errores', false));

  try {
    const resend = await getResendCredentials();
    checks.push({
      key: 'email_provider',
      label: 'Correo transaccional',
      ok: resend.ready || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      detail: resend.ready ? 'Resend listo' : process.env.SMTP_HOST ? 'SMTP configurado' : 'Pendiente: sin Resend/SMTP',
      critical: false,
      category: 'email',
      route: '/admin/integraciones',
      action: 'Configurar correo',
    });
  } catch (err) {
    checks.push({
      key: 'email_provider',
      label: 'Correo transaccional',
      ok: false,
      detail: err instanceof Error ? err.message : 'No se pudo verificar correo',
      critical: false,
      category: 'email',
      route: '/admin/integraciones',
      action: 'Configurar correo',
    });
  }

  const routeChecks = await Promise.all([
    probeRoute(request, '/', 'Portada pública', true),
    probeRoute(request, '/tienda', 'Tienda', true),
    probeRoute(request, '/checkout', 'Checkout', false),
    probeRoute(request, '/auth', 'Autenticación de clientes', true),
    probeRoute(request, '/admin', 'Panel administrativo', true),
  ]);
  checks.push(...routeChecks);

  const criticalChecks = checks.filter((item) => item.critical !== false);
  const criticalOk = criticalChecks.every((item) => item.ok);
  const allOk = checks.every((item) => item.ok);
  const passed = checks.filter((item) => item.ok).length;
  const score = checks.length ? Math.round((passed / checks.length) * 100) : 0;

  return NextResponse.json({
    ok: criticalOk,
    readyForPilot: criticalOk,
    readyForPublicLaunch: allOk,
    score,
    passed,
    total: checks.length,
    checks,
    summary: allOk
      ? 'La plataforma SaaS pasó todas las comprobaciones disponibles.'
      : criticalOk
        ? `Piloto operativo: ${passed}/${checks.length} comprobaciones confirmadas. Quedan mejoras no críticas.`
        : `Faltan piezas críticas: ${passed}/${checks.length} comprobaciones confirmadas.`,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
