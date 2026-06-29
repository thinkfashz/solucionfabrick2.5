import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Check = { name: string; ok: boolean; detail?: string };

const REQUIRED_FIELDS: Record<string, string[]> = {
  cloudinary: ['cloud_name', 'api_key', 'api_secret'],
  mercadopago: ['access_token', 'public_key'],
  resend: ['api_key', 'from'],
  stripe: ['secret_key', 'public_key'],
  whatsapp: ['access_token', 'phone_number_id'],
  tiktok: ['access_token'],
  google: ['client_id', 'client_secret', 'refresh_token'],
  google_ads: ['developer_token', 'client_id', 'client_secret', 'refresh_token', 'customer_id'],
  meta: ['access_token'],
  mercadolibre: ['access_token'],
  openrouter: ['api_key'],
  openai: ['api_key'],
  gemini: ['api_key'],
  groq: ['api_key'],
  anthropic: ['api_key'],
  serper: ['api_key'],
  serpapi: ['api_key'],
};

function providerFromRequest(request: NextRequest) {
  return new URL(request.url).searchParams.get('provider')?.trim() || '';
}

function missingChecks(required: string[], values: Record<string, string>): Check[] {
  return required.map((field) => ({ name: field, ok: Boolean(values[field]), detail: values[field] ? 'Configurado.' : 'Falta configurar.' }));
}

async function testCloudinary(values: Record<string, string>): Promise<{ ok: boolean; checks: Check[]; error?: string }> {
  const checks = missingChecks(REQUIRED_FIELDS.cloudinary, values);
  if (checks.some((c) => !c.ok)) return { ok: false, checks, error: 'Faltan credenciales de Cloudinary.' };
  const cloudName = values.cloud_name;
  if (cloudName.toLowerCase() === 'root') return { ok: false, checks: [...checks, { name: 'cloud_name', ok: false, detail: 'Root no es un cloud name válido.' }], error: 'Cloud name inválido.' };
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/usage`, {
      headers: { Authorization: `Basic ${Buffer.from(`${values.api_key}:${values.api_secret}`).toString('base64')}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, checks: [...checks, { name: 'Cloudinary API', ok: false, detail: `HTTP ${res.status}` }], error: 'Cloudinary rechazó las credenciales.' };
    return { ok: true, checks: [...checks, { name: 'Cloudinary API', ok: true, detail: `Conectado a ${cloudName}.` }] };
  } catch (err) {
    return { ok: false, checks: [...checks, { name: 'Cloudinary API', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' }], error: 'No se pudo contactar Cloudinary.' };
  }
}

async function testMercadoPago(values: Record<string, string>): Promise<{ ok: boolean; checks: Check[]; error?: string }> {
  const checks = missingChecks(REQUIRED_FIELDS.mercadopago, values);
  if (checks.some((c) => !c.ok)) return { ok: false, checks, error: 'Faltan credenciales de MercadoPago.' };
  try {
    const res = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MLC', {
      headers: { Authorization: `Bearer ${values.access_token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, checks: [...checks, { name: 'MercadoPago API', ok: false, detail: `HTTP ${res.status}` }], error: 'MercadoPago rechazó las credenciales.' };
    return { ok: true, checks: [...checks, { name: 'MercadoPago API', ok: true, detail: 'Pasarela accesible.' }] };
  } catch (err) {
    return { ok: false, checks: [...checks, { name: 'MercadoPago API', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' }], error: 'No se pudo contactar MercadoPago.' };
  }
}

async function testResend(values: Record<string, string>): Promise<{ ok: boolean; checks: Check[]; error?: string }> {
  const checks = missingChecks(REQUIRED_FIELDS.resend, values);
  if (checks.some((c) => !c.ok)) return { ok: false, checks, error: 'Faltan credenciales de Resend.' };
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${values.api_key}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, checks: [...checks, { name: 'Resend API', ok: false, detail: `HTTP ${res.status}` }], error: 'Resend rechazó la API key.' };
    return { ok: true, checks: [...checks, { name: 'Resend API', ok: true, detail: 'API key válida.' }] };
  } catch (err) {
    return { ok: false, checks: [...checks, { name: 'Resend API', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' }], error: 'No se pudo contactar Resend.' };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;
  const provider = providerFromRequest(request);
  const required = REQUIRED_FIELDS[provider];
  if (!required) return NextResponse.json({ ok: false, provider, error: 'Proveedor no soportado para prueba tenant.', checks: [] }, { status: 400 });

  const integration = await readTenantIntegration(ctx.tenantId, provider, required);
  if (!integration.ready) {
    return NextResponse.json({ ok: false, provider, tenantId: ctx.tenantId, error: `Faltan campos: ${integration.missing.join(', ')}`, checks: missingChecks(required, integration.values) });
  }

  if (provider === 'cloudinary') {
    const result = await testCloudinary(integration.values);
    return NextResponse.json({ provider, tenantId: ctx.tenantId, ...result });
  }
  if (provider === 'mercadopago') {
    const result = await testMercadoPago(integration.values);
    return NextResponse.json({ provider, tenantId: ctx.tenantId, ...result });
  }
  if (provider === 'resend') {
    const result = await testResend(integration.values);
    return NextResponse.json({ provider, tenantId: ctx.tenantId, ...result });
  }

  return NextResponse.json({
    ok: true,
    provider,
    tenantId: ctx.tenantId,
    checks: missingChecks(required, integration.values),
    note: 'Prueba básica tenant-safe: campos requeridos presentes. Validación live disponible para Cloudinary, MercadoPago y Resend.',
  });
}
