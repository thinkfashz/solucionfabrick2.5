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
import { normalizeAdAccountId } from '@/lib/meta';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/ads/agent
 *
 * Coach IA multi-canal para campañas publicitarias. Cada llamada se persiste
 * en `ads_agent_runs` para que el admin pueda revisar el historial y aplicar
 * sugerencias con un clic más adelante.
 *
 * Body:
 *   {
 *     action: 'analyze' | 'suggest' | 'create' | 'optimize',
 *     channel?: 'meta' | 'google' | 'tiktok',
 *     campaignId?: string,
 *     prompt?: string,        // texto libre para 'create' o 'suggest'
 *     context?: object,       // datos adicionales del UI (objetivo, presupuesto…)
 *   }
 *
 * Estrategia:
 *   - 'analyze': lee KPIs de Meta Ads cuando hay credenciales y devuelve un
 *     diagnóstico estructurado (CTR/CPC/CPM/ROAS por nivel). Cuando faltan
 *     credenciales devuelve un análisis "skeleton" con los pasos a seguir,
 *     en lugar de fallar con 503.
 *   - 'suggest' / 'create' / 'optimize': sin proveedor de IA conectado todavía,
 *     respondemos con plantillas deterministas (copy A/B, audiencias,
 *     pujas) basadas en mejores prácticas de Meta/Google/TikTok. La forma
 *     del JSON está estabilizada para que el front pueda renderizarla
 *     uniformemente, y cuando se conecte un LLM real basta con sustituir
 *     `buildSuggestions()` / `buildCampaignDraft()` / `buildOptimizations()`.
 *
 * El endpoint NUNCA modifica campañas reales — sólo lee y propone. Aplicar
 * una sugerencia requerirá un POST explícito a un endpoint distinto que
 * marque la fila correspondiente con `applied=true`.
 */

type AgentAction = 'analyze' | 'suggest' | 'create' | 'optimize';
type AgentChannel = 'meta' | 'google' | 'tiktok';

interface AgentRequestBody {
  action?: unknown;
  channel?: unknown;
  campaignId?: unknown;
  prompt?: unknown;
  context?: unknown;
}

const ALLOWED_ACTIONS: ReadonlySet<AgentAction> = new Set(['analyze', 'suggest', 'create', 'optimize']);
const ALLOWED_CHANNELS: ReadonlySet<AgentChannel> = new Set(['meta', 'google', 'tiktok']);

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

interface MetaInsight {
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
}

/**
 * Pulls last-7-days insights from Meta. Returns null when credentials are
 * missing OR the upstream call fails — the caller surfaces that as a hint.
 */
async function fetchMetaInsights(): Promise<MetaInsight | null> {
  const creds = await getMetaCredentials();
  if (!creds?.accessToken) return null;
  // Resolve ad_account_id from env first (highest precedence) and then fall
  // back to the integrations table. This mirrors the lookup done in
  // /api/meta/ads so a single source-of-truth governs both the dashboard
  // and the coach.
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
  if (!adAccountIdRaw) return null;
  try {
    const url = new URL(`https://graph.facebook.com/v20.0/${adAccountIdRaw}/insights`);
    url.searchParams.set('fields', 'spend,impressions,clicks,ctr,cpc,cpm,reach');
    url.searchParams.set('date_preset', 'last_7d');
    url.searchParams.set('access_token', creds.accessToken);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as { data?: Array<Record<string, string>> };
    const row = json.data?.[0];
    if (!row) return null;
    const num = (v: string | undefined) => (v != null ? Number(v) : null);
    return {
      ctr: num(row.ctr),
      cpc: num(row.cpc),
      cpm: num(row.cpm),
      spend: num(row.spend),
      impressions: num(row.impressions),
      clicks: num(row.clicks),
      reach: num(row.reach),
    };
  } catch {
    return null;
  }
}

interface AnalysisResult {
  channel: AgentChannel;
  hasCredentials: boolean;
  insights: MetaInsight | null;
  diagnosis: string[];
  recommendations: string[];
}

function diagnoseMeta(insights: MetaInsight | null): { diagnosis: string[]; recommendations: string[] } {
  const diagnosis: string[] = [];
  const recommendations: string[] = [];
  if (!insights) {
    diagnosis.push('Sin datos suficientes para diagnosticar (no hay credenciales Meta o la cuenta está vacía).');
    recommendations.push('Conecta Meta en /admin/configuracion → Integraciones para que el coach pueda leer KPIs reales.');
    return { diagnosis, recommendations };
  }
  // Heurísticas sencillas y públicas (no dependen de un LLM):
  // CTR < 1% = bajo, CPC > $500 CLP = alto para ecommerce CL, etc.
  if (insights.ctr != null && insights.ctr < 1) {
    diagnosis.push(`CTR bajo (${insights.ctr.toFixed(2)}%) — los creatives no están reteniendo atención.`);
    recommendations.push('Prueba 3 variantes A/B con hook visual en los primeros 1.5s y CTA explícito.');
  } else if (insights.ctr != null) {
    diagnosis.push(`CTR saludable (${insights.ctr.toFixed(2)}%).`);
  }
  if (insights.cpc != null && insights.cpc > 500) {
    diagnosis.push(`CPC elevado ($${Math.round(insights.cpc)} CLP) — la subasta está competitiva.`);
    recommendations.push('Refina la audiencia: excluye intereses muy amplios y prueba lookalike 1% del público comprador.');
  }
  if (insights.spend != null && insights.clicks != null && insights.clicks < 10) {
    diagnosis.push('Pocos clics relativos al gasto — la campaña podría estar mal optimizada.');
    recommendations.push('Cambia el objetivo a "Tráfico" o "Conversiones" si está en "Alcance"; sube el presupuesto diario.');
  }
  return { diagnosis, recommendations };
}

function buildSuggestions(prompt: string): { copyA: string; copyB: string; ctas: string[]; hashtags: string[] } {
  const seed = (prompt || 'producto').toLowerCase().replace(/\s+/g, ' ').trim();
  return {
    copyA: `🚀 ${seed.charAt(0).toUpperCase() + seed.slice(1)}: la solución que tu casa necesitaba. Despacho gratis a todo Chile.`,
    copyB: `Diseño minimalista, calidad premium. Si no te convence, te devolvemos el 100%. Conoce ${seed}.`,
    ctas: ['Compra ahora', 'Ver más', 'Aprovecha la oferta', 'Reserva el tuyo'],
    hashtags: ['#fabrickcl', '#diseñochileno', `#${seed.replace(/[^a-z0-9]+/g, '')}`, '#hechoenchile'],
  };
}

function buildCampaignDraft(prompt: string, context: Record<string, unknown>): {
  objective: string;
  audience: { age_min: number; age_max: number; geo: string; interests: string[] };
  budget: { daily_clp: number; duration_days: number };
  creatives: { copyA: string; copyB: string };
} {
  const objective = (typeof context.objective === 'string' && context.objective) || 'TRAFFIC';
  const dailyClp =
    typeof context.budget_clp === 'number' && Number.isFinite(context.budget_clp)
      ? Math.max(2000, Math.round(context.budget_clp))
      : 5000;
  const duration =
    typeof context.duration_days === 'number' && Number.isFinite(context.duration_days)
      ? Math.max(3, Math.round(context.duration_days))
      : 7;
  const sug = buildSuggestions(prompt);
  return {
    objective,
    audience: {
      age_min: 25,
      age_max: 55,
      geo: typeof context.geo === 'string' ? context.geo : 'CL',
      interests: ['Decoración del hogar', 'Diseño de interiores', 'Mejora del hogar'],
    },
    budget: { daily_clp: dailyClp, duration_days: duration },
    creatives: { copyA: sug.copyA, copyB: sug.copyB },
  };
}

function buildOptimizations(insights: MetaInsight | null): string[] {
  const out: string[] = [];
  if (insights?.ctr != null && insights.ctr < 1) out.push('Pausa los anuncios con CTR < 0.7% y duplica los top 2.');
  out.push('Programa la entrega entre 18:00 y 23:00 (mejor performance ecommerce CL).');
  out.push('Activa optimización de presupuesto a nivel de campaña (CBO).');
  if (insights?.cpc != null && insights.cpc > 500) out.push('Excluye intereses con frecuencia >3 para refrescar audiencia.');
  return out;
}

async function persistRun(
  channel: AgentChannel,
  campaignId: string | null,
  action: AgentAction,
  prompt: string | null,
  response: unknown,
): Promise<string | null> {
  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('ads_agent_runs')
      .insert([
        {
          channel,
          campaign_id: campaignId,
          action,
          prompt,
          response,
          applied: false,
        },
      ])
      .select('id')
      .limit(1);
    if (error) return null;
    if (Array.isArray(data) && data.length > 0) {
      return (data[0] as { id?: string }).id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as AgentRequestBody;
    const action = typeof body.action === 'string' ? (body.action as AgentAction) : 'analyze';
    const channel = typeof body.channel === 'string' ? (body.channel as AgentChannel) : 'meta';
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const context = asObject(body.context);

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: `Acción no permitida. Usa: ${[...ALLOWED_ACTIONS].join(', ')}.` },
        { status: 400 },
      );
    }
    if (!ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json(
        { error: `Canal no soportado. Usa: ${[...ALLOWED_CHANNELS].join(', ')}.` },
        { status: 400 },
      );
    }

    let response: Record<string, unknown>;
    if (action === 'analyze') {
      const insights = channel === 'meta' ? await fetchMetaInsights() : null;
      const { diagnosis, recommendations } = diagnoseMeta(insights);
      const result: AnalysisResult = {
        channel,
        hasCredentials: insights !== null,
        insights,
        diagnosis,
        recommendations,
      };
      response = { kind: 'analysis', ...result };
    } else if (action === 'suggest') {
      response = { kind: 'suggestions', channel, ...buildSuggestions(prompt) };
    } else if (action === 'create') {
      response = { kind: 'campaign_draft', channel, ...buildCampaignDraft(prompt, context) };
    } else {
      const insights = channel === 'meta' ? await fetchMetaInsights() : null;
      response = { kind: 'optimizations', channel, optimizations: buildOptimizations(insights) };
    }

    const runId = await persistRun(channel, campaignId, action, prompt || null, response);
    return NextResponse.json({ ok: true, runId, response });
  } catch (err) {
    return adminError(err, 'ADS_AGENT_FAILED');
  }
}
