import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OAUTH_PROVIDERS = new Set(['mercadolibre', 'google', 'meta', 'tiktok']);

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'delete' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let provider = '';
  try {
    const body = (await request.json()) as { provider?: unknown };
    provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  if (!OAUTH_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Proveedor no soportado para revocación OAuth.' }, { status: 400 });
  }

  const { error } = await insforgeAdmin.database
    .from('integrations')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null;
    await insforgeAdmin.database.from('integration_audit').insert([{
      provider,
      action: 'delete',
      actor: ctx.session.email ?? null,
      ip,
      user_agent: request.headers.get('user-agent') ?? null,
      details: { via: 'tenant_oauth_revoke', tenantId: ctx.tenantId },
    }]);
  } catch {
    /* audit best-effort */
  }

  return NextResponse.json({ ok: true, revokedAtProvider: false, providerDetail: 'Credenciales eliminadas para esta empresa. Revocación externa manual si el proveedor lo requiere.', tenantId: ctx.tenantId });
}
