import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  adminError,
  adminUnauthorized,
  getAdminInsforge,
  getAdminSession,
} from '@/lib/adminApi';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import { normalizeAdAccountId, META_GRAPH_URL } from '@/lib/meta';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/ads/agent/[id]/apply
 *
 * Aplica una sugerencia previamente generada por el coach IA. Marca
 * `ads_agent_runs.applied = true` y, cuando la sugerencia es un
 * `campaign_draft` para Meta, dispara la creación real de la campaña
 * (estado PAUSED — el operador la activa después de adjuntar creative).
 *
 * Para Google Ads / TikTok el endpoint deja la fila marcada como
 * aplicada y guarda en `applied_result` un payload listo para que
 * un humano lo importe en la consola del proveedor (no hay API
 * pública para crear campañas Google/TikTok sin OAuth previo).
 */

interface CampaignDraft {
  objective?: string;
  audience?: { age_min?: number; age_max?: number; geo?: string; interests?: string[] };
  budget?: { daily_clp?: number; duration_days?: number };
  creatives?: { copyA?: string; copyB?: string };
}

async function getRun(
  client: ReturnType<typeof getAdminInsforge>,
  id: string,
): Promise<{
  id: string;
  channel: string | null;
  action: string | null;
  response: Record<string, unknown> | null;
  applied: boolean | null;
} | null> {
  try {
    const { data, error } = await client.database
      .from('ads_agent_runs')
      .select('id, channel, action, response, applied')
      .eq('id', id)
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as never;
  } catch {
    return null;
  }
}

async function applyMetaCampaignDraft(draft: CampaignDraft): Promise<{
  ok: boolean;
  campaign_id?: string;
  error?: string;
}> {
  const creds = await getMetaCredentials();
  if (!creds?.accessToken) {
    return { ok: false, error: 'Falta token de Meta. Configúralo en /admin/configuracion → Integraciones.' };
  }

  // Resolve ad_account_id (env first, DB fallback) — same precedence as
  // /api/meta/ads & the analyzer in the agent route.
  let adAccountIdRaw: string | null = normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID) ?? null;
  if (!adAccountIdRaw) {
    try {
      const client = getAdminInsforge();
      const { data } = await client.database
        .from('integrations')
        .select('credentials')
        .eq('provider', 'meta')
        .limit(1);
      if (Array.isArray(data) && data.length > 0) {
        const raw = (data[0] as { credentials?: Record<string, unknown> }).credentials ?? {};
        const dbCreds = decryptCredentials(raw) as Record<string, string>;
        adAccountIdRaw = normalizeAdAccountId(dbCreds.ad_account_id) ?? null;
      }
    } catch {
      /* ignore — surface "no ad account" */
    }
  }
  if (!adAccountIdRaw) {
    return { ok: false, error: 'Falta ad_account_id de Meta. Setéalo en META_AD_ACCOUNT_ID o en la integración.' };
  }

  // Map our internal objective to Meta's canonical name. We default to
  // OUTCOME_TRAFFIC because it's the safest choice for ecommerce small
  // budgets; the operator can later switch to OUTCOME_SALES in the Meta UI.
  const OBJECTIVE_MAP: Record<string, string> = {
    TRAFFIC: 'OUTCOME_TRAFFIC',
    CONVERSIONS: 'OUTCOME_SALES',
    REACH: 'OUTCOME_AWARENESS',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  };
  const objective = OBJECTIVE_MAP[(draft.objective || 'TRAFFIC').toUpperCase()] || 'OUTCOME_TRAFFIC';

  try {
    const campaignName = `Fabrick Coach — ${new Date().toISOString().slice(0, 10)}`;
    const campaignRes = await fetch(`${META_GRAPH_URL}/act_${adAccountIdRaw}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignName,
        objective,
        // Created paused — the operator must add creatives + activate.
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: creds.accessToken,
      }),
    });
    const campaignJson = (await campaignRes.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!campaignRes.ok || !campaignJson.id) {
      return { ok: false, error: campaignJson.error?.message || `Meta API error ${campaignRes.status}` };
    }
    return { ok: true, campaign_id: campaignJson.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido al crear campaña.' };
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id requerido.' }, { status: 400 });
    }

    const client = getAdminInsforge();
    const run = await getRun(client, id);
    if (!run) return NextResponse.json({ error: 'Sugerencia no encontrada.' }, { status: 404 });
    if (run.applied) {
      return NextResponse.json({ error: 'Esta sugerencia ya fue aplicada.' }, { status: 409 });
    }

    const response = run.response ?? {};
    const kind = typeof response.kind === 'string' ? response.kind : null;
    const channel = run.channel || 'meta';

    let appliedResult: Record<string, unknown> = { kind, channel };
    let success = true;
    let errorMsg: string | undefined;

    if (kind === 'campaign_draft' && channel === 'meta') {
      const draft = response as unknown as CampaignDraft;
      const r = await applyMetaCampaignDraft(draft);
      if (!r.ok) {
        success = false;
        errorMsg = r.error;
        appliedResult = { ...appliedResult, error: r.error };
      } else {
        appliedResult = {
          ...appliedResult,
          campaign_id: r.campaign_id,
          status: 'PAUSED',
          note: 'Campaña creada en estado PAUSED. Adjunta creatives y actívala desde Meta Ads Manager.',
        };
      }
    } else {
      // For non-Meta channels or non-campaign kinds (suggestions/optimizations)
      // we just mark the run as "acknowledged" — no upstream call. The applied_result
      // exposes the original payload so the operator can paste it into the
      // provider's UI.
      appliedResult = {
        ...appliedResult,
        manual: true,
        note: 'Sin API directa para este canal/tipo. Copia el draft a la consola del proveedor.',
        payload: response,
      };
    }

    if (success) {
      try {
        await client.database
          .from('ads_agent_runs')
          .update({
            applied: true,
            applied_at: new Date().toISOString(),
            applied_result: appliedResult,
          })
          .eq('id', id);
      } catch {
        /* best-effort persistence */
      }
    }

    return NextResponse.json(
      { ok: success, error: errorMsg, result: appliedResult },
      { status: success ? 200 : 502 },
    );
  } catch (err) {
    return adminError(err, 'ADS_AGENT_APPLY_FAILED');
  }
}
