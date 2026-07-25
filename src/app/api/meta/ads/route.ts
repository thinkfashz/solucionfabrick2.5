import { NextResponse, type NextRequest } from 'next/server';
import { META_GRAPH_URL, normalizeAdAccountId } from '@/lib/meta';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie) : null;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const credentials = await getMetaCredentials();
  const accessToken = credentials?.accessToken;
  const adAccountId = normalizeAdAccountId(credentials?.adAccountId);

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Credenciales de Meta no configuradas. Agrégalas en Configuración → Integraciones.' },
      { status: 503 },
    );
  }

  try {
    const fields = [
      'id',
      'name',
      'status',
      'effective_status',
      'created_time',
      'updated_time',
      'campaign{id,name,objective,status,effective_status}',
      'adset{id,name,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,status,effective_status}',
      'creative{id,name}',
      'insights{spend,clicks,impressions,reach,frequency,ctr,cpc,cpm,actions,cost_per_action_type}',
    ].join(',');
    const url = `${META_GRAPH_URL}/act_${adAccountId}/ads?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}&limit=100`;
    const response = await fetch(url, { cache: 'no-store' });
    const json = await response.json();

    if (!response.ok || json.error) {
      const message = json.error?.message ?? `Meta API error ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.ok ? 502 : response.status });
    }

    return NextResponse.json({ data: json.data ?? [], paging: json.paging ?? null });
  } catch (error) {
    console.error('Meta ads fetch error:', error);
    return NextResponse.json({ error: 'Error interno al consultar Meta API.' }, { status: 500 });
  }
}
