import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { detectEnvProviderCredentials, envFieldPreview } from '@/lib/integrationsEnvMap';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Provider = 'openai' | 'openrouter' | 'claude';

type Body = {
  provider?: Provider;
  credentials?: Record<string, string>;
};

const ALLOWED = new Set<Provider>(['openai', 'openrouter', 'claude']);

function providerOf(value: unknown): Provider | null {
  return value === 'openai' || value === 'openrouter' || value === 'claude' ? value : null;
}

function mask(value: string) {
  if (!value) return '';
  return value.length <= 4 ? '•••' : `••• ${value.slice(-4)}`;
}

function maskRecord(credentials: Record<string, string>, source: 'db' | 'env') {
  const out: Record<string, { set: boolean; preview: string; source: 'db' | 'env'; envVar?: string }> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (!value) continue;
    out[key] = { set: true, preview: mask(value), source };
  }
  return out;
}

async function readProvider(provider: Provider) {
  const { data } = await insforgeAdmin.database
    .from('integrations')
    .select('credentials, updated_at')
    .eq('provider', provider)
    .limit(1);

  const row = Array.isArray(data) && data.length > 0 ? data[0] as { credentials?: Record<string, unknown>; updated_at?: string } : null;
  const dbPlain = row?.credentials ? decryptCredentials(row.credentials) as Record<string, string> : {};
  const env = detectEnvProviderCredentials(provider);
  const masked = maskRecord(dbPlain, 'db');

  // DB is source of truth. Env only fills missing fields.
  for (const [field, detected] of Object.entries(env)) {
    if (!masked[field]?.set) {
      masked[field] = { set: true, preview: envFieldPreview(detected.value), source: 'env', envVar: detected.envName };
    }
  }

  return {
    provider,
    credentials: masked,
    updated_at: row?.updated_at ?? null,
    encrypted: isEncryptionConfigured(),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const providers: Record<string, Awaited<ReturnType<typeof readProvider>>> = {};
  for (const provider of ALLOWED) providers[provider] = await readProvider(provider);
  return NextResponse.json({ ok: true, providers, encrypted: isEncryptionConfigured() });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  if (auth.role === 'viewer') return NextResponse.json({ error: 'Modo demo: no puede guardar credenciales IA.' }, { status: 403 });

  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const provider = providerOf(body.provider);
  if (!provider) return NextResponse.json({ error: 'Proveedor IA no permitido.' }, { status: 400 });
  const incoming = body.credentials && typeof body.credentials === 'object' ? body.credentials : {};

  try {
    const { data } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', provider)
      .limit(1);

    const existingRow = Array.isArray(data) && data.length > 0 ? data[0] as { credentials?: Record<string, unknown> } : null;
    const existing = existingRow?.credentials ? decryptCredentials(existingRow.credentials) as Record<string, string> : {};
    const next: Record<string, string> = { ...existing };

    for (const [key, raw] of Object.entries(incoming)) {
      if (typeof raw !== 'string') continue;
      const value = raw.trim();
      if (!value) continue;
      next[key] = value;
    }

    if (!next.api_key) {
      return NextResponse.json({ error: 'API key requerida.' }, { status: 400 });
    }

    const { error } = await insforgeAdmin.database.from('integrations').upsert([
      {
        provider,
        credentials: encryptCredentials(next),
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'provider' });

    if (error) throw error;

    await recordAdminAudit({
      session: auth.session,
      request,
      action: 'update',
      resource: 'integrations',
      metadata: { module: 'ai-developer', provider, keys: Object.keys(incoming).filter((key) => incoming[key]?.trim()) },
    });

    return NextResponse.json({ ok: true, provider, credentials: maskRecord(next, 'db'), encrypted: isEncryptionConfigured() });
  } catch (err) {
    await recordAdminFailure({
      session: auth.session,
      request,
      action: 'update',
      resource: 'integrations',
      metadata: { module: 'ai-developer', provider, error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron guardar las credenciales IA.' }, { status: 500 });
  }
}
