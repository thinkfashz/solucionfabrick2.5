import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { getResendCredentials } from '@/lib/resendCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Env vars checked per service group
const GROUPS = [
  {
    id: 'db',
    name: 'Base de datos',
    description: 'InsForge — almacenamiento de todos los datos de la app',
    required: ['NEXT_PUBLIC_INSFORGE_URL', 'NEXT_PUBLIC_INSFORGE_ANON_KEY'],
    optional: ['INSFORGE_API_KEY'],
  },
  {
    id: 'admin',
    name: 'Administración',
    description: 'Sesión segura de administrador y URL pública de la app',
    required: ['ADMIN_SESSION_SECRET', 'NEXT_PUBLIC_APP_URL'],
    optional: ['ADMIN_EMAIL', 'ADMIN_PASSWORD_PEPPER'],
  },
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    description: 'Pagos, suscripciones y cobros en línea',
    required: ['MERCADO_PAGO_ACCESS_TOKEN', 'NEXT_PUBLIC_MP_PUBLIC_KEY'],
    optional: ['PLATFORM_MP_WEBHOOK_SECRET', 'MERCADO_PAGO_WEBHOOK_SECRET'],
  },
  {
    id: 'email',
    name: 'Email (Resend)',
    description: 'Envío de facturas, notificaciones y alertas',
    required: ['RESEND_API_KEY'],
    optional: ['RESEND_FROM', 'EMAIL_FROM'],
  },
  {
    id: 'saas',
    name: 'SaaS / Plataforma',
    description: 'Claves para gestionar clientes y automatizaciones',
    required: ['PLATFORM_ADMIN_SECRET'],
    optional: ['CRON_SECRET', 'VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID'],
  },
  {
    id: 'facturacion',
    name: 'Facturación (DTE)',
    description: 'Emisión de boletas y facturas electrónicas',
    required: [],
    optional: ['BILLING_RUT_EMISOR', 'BILLING_SII_ENV'],
  },
  {
    id: 'envios',
    name: 'Envíos',
    description: 'Cotización y despacho con couriers',
    required: [],
    optional: [
      'STARKEN_USER', 'STARKEN_PASS',
      'CHILEXPRESS_API_KEY',
      'CORREOSCHILE_USER', 'CORREOSCHILE_PASS',
    ],
  },
  {
    id: 'publicidad',
    name: 'Publicidad digital',
    description: 'Meta Ads, Google Ads y TikTok Ads',
    required: [],
    optional: [
      'META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID',
      'GOOGLE_CSE_KEY', 'TIKTOK_ADS_ACCESS_TOKEN',
    ],
  },
] as const;

function preview(val: string): string {
  return val.length > 8 ? val.slice(0, 4) + '••••' + val.slice(-2) : '••••••';
}

function readEnvStatus(keys: readonly string[]) {
  return keys.map((key) => {
    const val = process.env[key];
    return { key, set: Boolean(val && val.trim()), preview: val ? preview(val) : undefined };
  });
}

export type EnvVar = { key: string; set: boolean; preview?: string };
export type ServiceGroup = {
  id: string;
  name: string;
  description: string;
  required: EnvVar[];
  optional: EnvVar[];
  status: 'ok' | 'partial' | 'missing' | 'unconfigured';
  score: number; // 0-100
};

// ── GET: return env-var status for all groups ────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const groups: ServiceGroup[] = GROUPS.map((g) => {
    const required = readEnvStatus(g.required);
    const optional = readEnvStatus(g.optional);
    const reqSet = required.filter((v) => v.set).length;
    const optSet = optional.filter((v) => v.set).length;
    const total = required.length + optional.length;
    const score = total === 0 ? 100 : Math.round(((reqSet + optSet) / total) * 100);

    let status: ServiceGroup['status'];
    if (required.length === 0 && optSet === 0) status = 'unconfigured';
    else if (reqSet === required.length && required.length > 0) status = optSet > 0 ? 'ok' : 'partial';
    else if (required.length > 0 && reqSet === 0) status = 'missing';
    else if (reqSet < required.length) status = 'partial';
    else status = optSet > 0 ? 'ok' : 'partial';

    return { id: g.id, name: g.name, description: g.description, required, optional, status, score };
  });

  const totalVars = groups.reduce((s, g) => s + g.required.length + g.optional.length, 0);
  const setVars = groups.reduce(
    (s, g) => s + g.required.filter((v) => v.set).length + g.optional.filter((v) => v.set).length,
    0,
  );
  const okGroups = groups.filter((g) => g.status === 'ok').length;

  return NextResponse.json({ groups, totalVars, setVars, okGroups, totalGroups: groups.length });
}

// ── POST: run a live connectivity test for a specific service ────────────────
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const body = (await request.json().catch(() => ({}))) as { service?: string };
  const service = body.service;

  if (service === 'db') {
    try {
      const client = getAdminInsforge();
      const { error } = await client.database.from('tenants').select('id').limit(1);
      if (error) return NextResponse.json({ ok: false, message: error.message });
      return NextResponse.json({ ok: true, message: 'Conexión exitosa a InsForge' });
    } catch (err) {
      return NextResponse.json({ ok: false, message: (err as Error).message });
    }
  }

  if (service === 'mercadopago') {
    const token =
      process.env.MERCADO_PAGO_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      process.env.MP_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ ok: false, message: 'No hay access token configurado' });
    try {
      const res = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MLC', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as Record<string, unknown>;
        return NextResponse.json({ ok: false, message: (j.message as string) ?? `HTTP ${res.status}` });
      }
      const mode = token.startsWith('TEST-') ? 'sandbox' : 'producción';
      return NextResponse.json({ ok: true, message: `Conectado a MercadoPago (modo ${mode})` });
    } catch (err) {
      return NextResponse.json({ ok: false, message: (err as Error).message });
    }
  }

  if (service === 'email') {
    const creds = await getResendCredentials();
    if (!creds.ready) {
      return NextResponse.json({
        ok: false,
        message: `Resend no configurado — falta ${creds.missing.join(', ')} (configúralo en /admin/integraciones o como variable de entorno en Vercel)`,
      });
    }
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return NextResponse.json({ ok: false, message: `HTTP ${res.status} desde Resend` });
      const src = creds.source === 'db' ? 'base de datos' : 'variables de entorno';
      return NextResponse.json({ ok: true, message: `Resend conectado correctamente (credenciales desde ${src})` });
    } catch (err) {
      return NextResponse.json({ ok: false, message: (err as Error).message });
    }
  }

  if (service === 'admin') {
    const secret = process.env.ADMIN_SESSION_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const issues: string[] = [];
    if (!secret) issues.push('ADMIN_SESSION_SECRET no configurado');
    if (!appUrl) issues.push('NEXT_PUBLIC_APP_URL no configurado');
    if (secret && secret.length < 32) issues.push('ADMIN_SESSION_SECRET muy corto (mínimo 32 chars)');
    if (issues.length > 0) return NextResponse.json({ ok: false, message: issues.join('; ') });
    return NextResponse.json({ ok: true, message: `Administración configurada — App URL: ${appUrl}` });
  }

  if (service === 'saas') {
    const secret = process.env.PLATFORM_ADMIN_SECRET;
    if (!secret) return NextResponse.json({ ok: false, message: 'No hay PLATFORM_ADMIN_SECRET configurado' });
    return NextResponse.json({ ok: true, message: 'Clave de plataforma SaaS configurada' });
  }

  return NextResponse.json({ ok: false, message: 'Servicio no reconocido' }, { status: 400 });
}
