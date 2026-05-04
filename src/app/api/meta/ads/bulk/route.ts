import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { META_GRAPH_URL, getMetaAdAccountId, normalizeAdAccountId } from '@/lib/meta';
import { decryptCredentials } from '@/lib/integrationsCrypto';

type BulkAction = 'ACTIVATE' | 'PAUSE' | 'ARCHIVE';

async function resolveMetaCredentials(): Promise<{ accessToken?: string; adAccountId?: string }> {
  const envToken = process.env.META_ACCESS_TOKEN;
  const envAccount = getMetaAdAccountId();
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
      const row = data[0] as { credentials?: Record<string, unknown> };
      const creds = decryptCredentials(row.credentials ?? {}) as Record<string, string>;
      return {
        accessToken: envToken ?? creds.access_token,
        adAccountId: envAccount ?? normalizeAdAccountId(creds.ad_account_id),
      };
    }
  } catch {
    // Fall through to env values.
  }

  return { accessToken: envToken, adAccountId: envAccount };
}

function actionToStatus(action: BulkAction): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' {
  if (action === 'ACTIVATE') return 'ACTIVE';
  if (action === 'PAUSE') return 'PAUSED';
  return 'ARCHIVED';
}

export async function POST(request: NextRequest) {
  const { accessToken } = await resolveMetaCredentials();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Credenciales de Meta no configuradas. Configura META_ACCESS_TOKEN o Integración Meta.' },
      { status: 503 },
    );
  }

  let body: { ids?: string[]; action?: BulkAction };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const action = body.action;

  if (!ids.length || !action) {
    return NextResponse.json(
      { error: 'Debes enviar al menos un ID y una acción válida.' },
      { status: 400 },
    );
  }

  const status = actionToStatus(action);

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const params = new URLSearchParams();
        params.set('access_token', accessToken);
        params.set('status', status);

        const res = await fetch(`${META_GRAPH_URL}/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: { message?: string };
        };

        if (!res.ok || json.error) {
          return {
            id,
            ok: false,
            message: json.error?.message ?? `Meta API error ${res.status}`,
          };
        }

        return {
          id,
          ok: true,
        };
      } catch (err) {
        return {
          id,
          ok: false,
          message: err instanceof Error ? err.message : 'Error desconocido',
        };
      }
    }),
  );

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return NextResponse.json({
    ok: true,
    action,
    status,
    total: results.length,
    okCount,
    failCount,
    results,
  });
}
