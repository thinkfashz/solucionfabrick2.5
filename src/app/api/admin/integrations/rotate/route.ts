import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';
import { rotateResendKey } from '@/lib/resendKeyRotation';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROTATABLE_PROVIDERS = new Set(['resend']);

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let provider = '';
  try {
    const body = await request.json();
    provider = typeof body?.provider === 'string' ? body.provider.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  if (!ROTATABLE_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'rotate_not_supported', code: 'rotate_not_supported' }, { status: 400 });
  }

  const { data, error } = await insforgeAdmin.database
    .from('integrations')
    .select('credentials')
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', 'resend')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ error: 'No hay una API key de Resend guardada para esta empresa.' }, { status: 404 });

  const dbCreds = decryptCredentials((data[0] as { credentials?: Record<string, unknown> }).credentials ?? {}) as Record<string, unknown>;
  const currentKey = typeof dbCreds.api_key === 'string' ? dbCreds.api_key.trim() : '';
  if (!currentKey) return NextResponse.json({ error: 'La integración Resend no tiene api_key para esta empresa.' }, { status: 404 });

  const result = await rotateResendKey({ currentKey, permission: 'full_access' });
  if (!result.success) {
    return NextResponse.json({ error: `Rotación fallida (${result.stage}): ${result.error}`, stage: result.stage }, { status: result.stage === 'create' || result.stage === 'list' ? 502 : 500 });
  }

  const encrypted = encryptCredentials({ ...dbCreds, api_key: result.newKey, rotated_at: new Date().toISOString() });
  const save = await insforgeAdmin.database.from('integrations').upsert([
    { provider: 'resend', tenant_id: ctx.tenantId, credentials: encrypted, updated_at: new Date().toISOString() },
  ], { onConflict: 'provider,tenant_id' });

  if (save.error) {
    return NextResponse.json({ error: `La key nueva fue creada pero no pudo guardarse: ${save.error.message}`, newKeyId: result.newKeyId }, { status: 500 });
  }

  try {
    await insforgeAdmin.database.from('integration_audit').insert([{
      provider: 'resend', action: 'rotate', actor: ctx.session.email ?? null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
      details: { tenantId: ctx.tenantId, old_key_id: result.oldKeyId, new_key_id: result.newKeyId, delete_warning: result.deleteWarning },
    }]);
  } catch {
    // Auditoría best-effort: la rotación no se revierte si la tabla de auditoría no existe.
  }

  return NextResponse.json({ ok: true, newKeyId: result.newKeyId, oldKeyId: result.oldKeyId, deleteWarning: result.deleteWarning, tenantId: ctx.tenantId });
}
