import { NextResponse, type NextRequest } from 'next/server';
import { META_GRAPH_URL, normalizeAdAccountId } from '@/lib/meta';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function minorToMajor(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const credentials = await getMetaCredentials();
  const accessToken = credentials?.accessToken;
  const adAccountId = normalizeAdAccountId(credentials?.adAccountId);
  if (!accessToken || !adAccountId) return NextResponse.json({ error: 'Meta no está configurado.' }, { status: 503 });

  const fields = 'id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,min_daily_budget,disable_reason,business_name,funding_source_details';
  const response = await fetch(`${META_GRAPH_URL}/act_${adAccountId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`, { cache: 'no-store' });
  const json = await response.json();
  if (!response.ok || json.error) return NextResponse.json({ error: json.error?.message || 'No se pudo consultar la cuenta publicitaria.' }, { status: response.ok ? 502 : response.status });

  const amountSpent = minorToMajor(json.amount_spent);
  const balance = minorToMajor(json.balance);
  const spendCap = minorToMajor(json.spend_cap);
  const remainingToCap = spendCap > 0 ? Math.max(0, spendCap - amountSpent) : null;

  return NextResponse.json({
    ok: true,
    account: {
      id: json.id,
      name: json.name || json.business_name || 'Cuenta publicitaria',
      status: Number(json.account_status || 0),
      disableReason: Number(json.disable_reason || 0),
      currency: json.currency || 'CLP',
      timezone: json.timezone_name || null,
      amountSpent,
      balance,
      spendCap,
      remainingToCap,
      minDailyBudget: minorToMajor(json.min_daily_budget),
      fundingSource: json.funding_source_details ? { type: json.funding_source_details.type || null, displayString: json.funding_source_details.display_string || null } : null,
      note: 'Meta puede informar balance adeudado, crédito prepago o límite según el tipo de facturación de la cuenta. Se muestra sin reinterpretarlo como dinero disponible garantizado.',
    },
  });
}
