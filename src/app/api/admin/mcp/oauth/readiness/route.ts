import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getMcpOAuthAdminConfig } from '@/lib/mcp/oauth';
import { inspectMcpOAuthIssuer } from '@/lib/mcp/oauthReadiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown> = {};
  try { body = await request.json() as Record<string, unknown>; }
  catch { /* allow configured issuer with an empty body */ }

  const origin = new URL(request.url).origin;
  const config = getMcpOAuthAdminConfig(origin);
  const issuer = String(body.issuer ?? config.issuer ?? '').trim();
  const explicitJwksUri = String(body.jwksUri ?? '').trim();
  if (!issuer) return NextResponse.json({ error: 'Ingresa un issuer OAuth/OIDC para ejecutar el diagnóstico.' }, { status: 400 });

  const report = await inspectMcpOAuthIssuer({ issuer, explicitJwksUri });
  return NextResponse.json({ ok: true, report }, {
    headers: { 'cache-control': 'no-store' },
  });
}
