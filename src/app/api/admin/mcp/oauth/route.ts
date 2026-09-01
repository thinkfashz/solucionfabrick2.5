import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { insforgeAdmin } from '@/lib/insforge';
import { getMcpAccessStatus } from '@/lib/mcp/access';
import { getMcpOAuthAdminConfig } from '@/lib/mcp/oauth';
import { hashMcpOAuthSubject, mcpOAuthSubjectHint } from '@/lib/mcp/oauthVerifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanKeyId(value: unknown) {
  const keyId = String(value ?? '').trim().toLowerCase();
  return keyId === 'legacy' || /^[a-f0-9]{16}$/.test(keyId) ? keyId : '';
}

function cleanUuid(value: unknown) {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.ctx.tenantId;
  const origin = new URL(request.url).origin;
  const config = getMcpOAuthAdminConfig(origin);
  const [access, bindingsResult] = await Promise.all([
    getMcpAccessStatus(tenantId),
    insforgeAdmin.database.from('mcp_oauth_bindings')
      .select('id,issuer,subject_hint,client_id,key_id,label,enabled,created_at,updated_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    ok: true,
    config: {
      ready: config.ready,
      verifierEnabled: config.verifierEnabled,
      metadataEnabled: config.metadataEnabled,
      issuer: config.issuer,
      audience: config.audience,
      jwksMode: config.jwksMode,
      jwksConfigured: Boolean(config.jwksUri),
      allowedAlgs: config.allowedAlgs,
      clockSkewSeconds: config.clockSkewSeconds,
    },
    connections: access.connections.map((connection) => ({
      keyId: connection.legacy ? 'legacy' : connection.keyId,
      label: connection.label,
      tokenPrefix: connection.tokenPrefix,
      scopes: connection.scopes,
      legacy: Boolean(connection.legacy),
    })),
    bindings: Array.isArray(bindingsResult.data) ? bindingsResult.data : [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.ctx.tenantId;
  const origin = new URL(request.url).origin;
  const config = getMcpOAuthAdminConfig(origin);
  if (!config.issuer) {
    return NextResponse.json({ error: 'Configura MCP_OAUTH_ISSUER antes de crear vinculaciones OAuth.' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const subject = cleanText(body.subject, 500);
  const clientId = cleanText(body.clientId, 240);
  const keyId = cleanKeyId(body.keyId);
  const label = cleanText(body.label, 80) || 'OAuth MCP';
  if (!subject || !keyId) return NextResponse.json({ error: 'subject y keyId son obligatorios.' }, { status: 400 });

  const access = await getMcpAccessStatus(tenantId);
  const validConnection = access.connections.some((connection) => (connection.legacy ? 'legacy' : connection.keyId) === keyId);
  if (!validConnection) return NextResponse.json({ error: 'La credencial MCP seleccionada no existe o fue revocada.' }, { status: 409 });

  const subjectHash = hashMcpOAuthSubject(config.issuer, subject);
  const { data: existing, error: existingError } = await insforgeAdmin.database.from('mcp_oauth_bindings')
    .select('id,tenant_id')
    .eq('issuer', config.issuer)
    .eq('subject_hash', subjectHash)
    .eq('client_id', clientId)
    .limit(1);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const now = new Date().toISOString();
  if (Array.isArray(existing) && existing[0]) {
    const row = existing[0] as { id?: string; tenant_id?: string };
    if (row.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Esta identidad OAuth ya está vinculada a otro tenant.' }, { status: 409 });
    }
    const { data, error } = await insforgeAdmin.database.from('mcp_oauth_bindings')
      .update({ key_id: keyId, label, enabled: true, subject_hint: mcpOAuthSubjectHint(subject), updated_at: now })
      .eq('id', String(row.id))
      .eq('tenant_id', tenantId)
      .select('id,issuer,subject_hint,client_id,key_id,label,enabled,created_at,updated_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, binding: Array.isArray(data) ? data[0] : data });
  }

  const { data, error } = await insforgeAdmin.database.from('mcp_oauth_bindings').insert([{
    tenant_id: tenantId,
    issuer: config.issuer,
    subject_hash: subjectHash,
    subject_hint: mcpOAuthSubjectHint(subject),
    client_id: clientId,
    key_id: keyId,
    label,
    enabled: true,
    created_at: now,
    updated_at: now,
  }]).select('id,issuer,subject_hint,client_id,key_id,label,enabled,created_at,updated_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, binding: Array.isArray(data) ? data[0] : data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'delete' });
  if (!auth.ok) return auth.response;
  const id = cleanUuid(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id inválido.' }, { status: 400 });
  const { error } = await insforgeAdmin.database.from('mcp_oauth_bindings')
    .delete()
    .eq('tenant_id', auth.ctx.tenantId)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
