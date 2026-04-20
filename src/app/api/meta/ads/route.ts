import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

const META_API_VERSION = 'v20.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Resolves Meta credentials from env vars first, then from the InsForge
 * `integrations` table (provider = 'meta'). This lets the admin paste the
 * access token into the UI instead of redeploying with new env vars.
 */
async function resolveMetaCredentials(): Promise<{ accessToken?: string; adAccountId?: string }> {
  const envToken = process.env.META_ACCESS_TOKEN;
  const envAccount = process.env.META_AD_ACCOUNT_ID;
  if (envToken && envAccount) {
    return { accessToken: envToken, adAccountId: envAccount };
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return { accessToken: envToken, adAccountId: envAccount };
  }
  try {
    const client = createClient({ baseUrl, anonKey });
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'meta')
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as { credentials?: Record<string, string> };
      return {
        accessToken: envToken ?? row.credentials?.access_token,
        adAccountId: envAccount ?? row.credentials?.ad_account_id,
      };
    }
  } catch {
    // Table may be missing — fall through to env-only values.
  }
  return { accessToken: envToken, adAccountId: envAccount };
}

export async function GET() {
  const { accessToken, adAccountId } = await resolveMetaCredentials();

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Credenciales de Meta no configuradas. Agrega META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en Configuración → Integraciones.' },
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