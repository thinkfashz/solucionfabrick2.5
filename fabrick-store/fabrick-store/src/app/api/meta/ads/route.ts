import { NextResponse } from 'next/server';

const META_API_VERSION = 'v20.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Variables de entorno META_ACCESS_TOKEN o META_AD_ACCOUNT_ID no configuradas.' },
      { status: 503 }
    );
  }

  try {
    const fields = 'id,name,status,effective_status,insights{spend,clicks,impressions,ctr}';
    const url = `${META_GRAPH_URL}/act_${adAccountId}/ads?fields=${encodeURIComponent(fields)}&access_token=${accessToken}&limit=50`;

    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `Meta API error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.ok ? 502 : res.status });
    }

    return NextResponse.json({ data: json.data ?? [] });
  } catch (err: unknown) {
    console.error('Meta ads fetch error:', err);
    return NextResponse.json({ error: 'Error interno al consultar Meta API.' }, { status: 500 });
  }
}
