import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED_PROVIDERS = new Set([
  'meta',
  'google',
  'google_ads',
  'tiktok',
  'cloudinary',
  'vercel',
  'mercadolibre',
  'mercadopago',
  'stripe',
  'whatsapp',
  'resend',
  'anthropic',
  'groq',
  'openrouter',
  'openai',
  'gemini',
  'grok',
  'serper',
  'serpapi',
]);

type FieldStatus = {
  set: boolean;
  preview: string;
  source?: 'db' | 'env';
  envVar?: string;
};

type IntegrationRow = {
  provider?: string;
  credentials?: Record<string, unknown>;
  updated_at?: string;
  tenant_id?: string | null;
};

function maskCredentials(credentials: Record<string, unknown> | null | undefined): Record<string, FieldStatus> {
  const out: Record<string, FieldStatus> = {};
  if (!credentials) return out;
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      out[key] = { set: false, preview: '' };
      continue;
    }
    const trimmed = value.trim();
    out[key] = {
      set: true,
      preview: trimmed.length <= 8 ? '••••' : `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`,
      source: 'db',
    };
  }
  return out;
}

function cleanInputCredentials(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

async function readExisting(provider: string, tenantId: string): Promise<Record<string, string>> {
  const { data, error } = await insforgeAdmin.database
    .from('integrations')
    .select('credentials')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) return {};
  const row = data[0] as { credentials?: Record<string, unknown> };
  return decryptCredentials(row.credentials ?? {}) as Record<string, string>;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { data, error } = await insforgeAdmin.database
    .from('integrations')
    .select('provider, credentials, updated_at, tenant_id')
    .eq('tenant_id', ctx.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const providers: Record<string, { credentials: Record<string, FieldStatus>; updated_at?: string; encrypted?: boolean; envManaged?: boolean }> = {};
  for (const provider of ALLOWED_PROVIDERS) providers[provider] = { credentials: {} };

  for (const row of (data ?? []) as IntegrationRow[]) {
    if (!row.provider || !ALLOWED_PROVIDERS.has(row.provider)) continue;
    const plain = decryptCredentials(row.credentials ?? {});
    providers[row.provider] = {
      credentials: maskCredentials(plain as Record<string, unknown>),
      updated_at: row.updated_at,
      encrypted: isEncryptionConfigured(),
      envManaged: false,
    };
  }

  return NextResponse.json({ providers, encrypted: isEncryptionConfigured(), tenantId: ctx.tenantId });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let provider = '';
  let submitted: Record<string, string> = {};
  try {
    const body = await request.json();
    provider = typeof body.provider === 'string' ? body.provider.trim() : '';
    submitted = cleanInputCredentials(body.credentials);
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  if (!ALLOWED_PROVIDERS.has(provider)) return NextResponse.json({ error: 'Proveedor no permitido.' }, { status: 400 });
  if (Object.keys(submitted).length === 0) return NextResponse.json({ error: 'No hay campos para guardar.' }, { status: 400 });

  const existing = await readExisting(provider, ctx.tenantId);
  const nextCredentials = { ...existing, ...submitted };
  const encryptedToPersist = encryptCredentials(nextCredentials);

  const { error } = await insforgeAdmin.database.from('integrations').upsert(
    [
      {
        provider,
        tenant_id: ctx.tenantId,
        credentials: encryptedToPersist,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'provider,tenant_id' },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    tenantId: ctx.tenantId,
    credentials: maskCredentials(nextCredentials),
    encrypted: isEncryptionConfigured(),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'delete' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const provider = new URL(request.url).searchParams.get('provider') ?? '';
  if (!ALLOWED_PROVIDERS.has(provider)) return NextResponse.json({ error: 'Proveedor no permitido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database
    .from('integrations')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tenantId: ctx.tenantId });
}
