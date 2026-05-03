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
import { isLlmConfigured, llmJson } from '@/lib/llm';

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

/* ------------------------------- LLM layer ------------------------------- */
//
// Cuando OPENAI_API_KEY o ANTHROPIC_API_KEY están presentes, las funciones
// llm* devuelven respuestas generadas por el modelo en el mismo schema que
// las versiones deterministas (`build*`). Si la llamada falla por timeout,
// rate-limit, JSON inválido, etc. devolvemos `null` y el caller cae al
// builder determinista. Así nunca rompemos la UI por una caída del LLM.

const SYSTEM_PROMPT_BASE =
  'Eres un experto en publicidad digital para ecommerce chileno (Fabrick — diseño, decoración y mejora del hogar). ' +
  'Tu tono es directo, sin exageraciones de marketing barato. Responde siempre en español de Chile.';

interface SuggestionsShape {
  copyA: string;
  copyB: string;
  ctas: string[];
  hashtags: string[];
}

async function llmSuggestions(prompt: string, channel: AgentChannel): Promise<SuggestionsShape | null> {
  if (!isLlmConfigured()) return null;
  try {
    const result = await llmJson<SuggestionsShape>({
      system: SYSTEM_PROMPT_BASE,
      user: [
        `Genera variantes de copy publicitario para el canal ${channel.toUpperCase()}.`,
        prompt ? `Contexto del producto: "${prompt}".` : 'Producto genérico de hogar.',
        'Devuelve un JSON con esta forma exacta:',
        '{ "copyA": string (≤140 chars), "copyB": string (≤140 chars), "ctas": string[4], "hashtags": string[4] }',
        'copyA debe ser orientado a conversión, copyB a awareness. Hashtags sin espacios y con #.',
      ].join('\n'),
    });
    if (
      typeof result?.copyA === 'string' &&
      typeof result?.copyB === 'string' &&
      Array.isArray(result?.ctas) &&
      Array.isArray(result?.hashtags)
    ) {
      return {
        copyA: result.copyA.slice(0, 280),
        copyB: result.copyB.slice(0, 280),
        ctas: result.ctas.filter((x): x is string => typeof x === 'string').slice(0, 6),
        hashtags: result.hashtags.filter((x): x is string => typeof x === 'string').slice(0, 8),
      };
    }
    return null;
  } catch {
    return null;
  }
}

interface CampaignDraftShape {
  objective: string;
  audience: { age_min: number; age_max: number; geo: string; interests: string[] };
  budget: { daily_clp: number; duration_days: number };
  creatives: { copyA: string; copyB: string };
}

async function llmCampaignDraft(
  prompt: string,
  channel: AgentChannel,
  context: Record<string, unknown>,
): Promise<CampaignDraftShape | null> {
  if (!isLlmConfigured()) return null;
  try {
    const result = await llmJson<CampaignDraftShape>({
      system: SYSTEM_PROMPT_BASE,
      user: [
        `Genera un draft de campaña para ${channel.toUpperCase()} listo para publicar.`,
        prompt ? `Producto/objetivo: "${prompt}".` : 'Producto genérico de hogar.',
        `Contexto del operador (puede estar vacío): ${JSON.stringify(context).slice(0, 1000)}`,
        'Devuelve un JSON con esta forma exacta:',
        '{ "objective": "TRAFFIC"|"CONVERSIONS"|"REACH"|"ENGAGEMENT", "audience": { "age_min": number, "age_max": number, "geo": "CL"|otro código ISO, "interests": string[3..6] }, "budget": { "daily_clp": number ≥2000, "duration_days": number ≥3 }, "creatives": { "copyA": string, "copyB": string } }',
        'Presupuesto razonable para PYME chilena: 5000–20000 CLP/día. Geo por defecto CL.',
      ].join('\n'),
    });
    if (
      typeof result?.objective === 'string' &&
      result?.audience &&
      typeof result.audience.age_min === 'number' &&
      typeof result.audience.age_max === 'number' &&
      Array.isArray(result.audience.interests) &&
      result?.budget &&
      typeof result.budget.daily_clp === 'number' &&
      typeof result.budget.duration_days === 'number' &&
      result?.creatives &&
      typeof result.creatives.copyA === 'string' &&
      typeof result.creatives.copyB === 'string'
    ) {
      return {
        objective: result.objective,
        audience: {
          age_min: Math.max(13, Math.min(65, Math.round(result.audience.age_min))),
          age_max: Math.max(13, Math.min(65, Math.round(result.audience.age_max))),
          geo: typeof result.audience.geo === 'string' ? result.audience.geo : 'CL',
          interests: result.audience.interests
            .filter((x): x is string => typeof x === 'string')
            .slice(0, 6),
        },
        budget: {
          daily_clp: Math.max(2000, Math.round(result.budget.daily_clp)),
          duration_days: Math.max(3, Math.round(result.budget.duration_days)),
        },
        creatives: { copyA: result.creatives.copyA, copyB: result.creatives.copyB },
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function llmOptimizations(
  insights: MetaInsight | null,
  channel: AgentChannel,
): Promise<string[] | null> {
  if (!isLlmConfigured()) return null;
  try {
    const result = await llmJson<{ optimizations?: string[] }>({
      system: SYSTEM_PROMPT_BASE,
      user: [
        `Genera recomendaciones de optimización para ${channel.toUpperCase()}.`,
        `KPIs últimos 7 días: ${JSON.stringify(insights ?? {})}`,
        'Devuelve un JSON con esta forma exacta:',
        '{ "optimizations": string[3..6] }',
        'Cada item es una acción concreta, en imperativo, ≤160 chars.',
      ].join('\n'),
    });
    if (Array.isArray(result?.optimizations)) {
      return result.optimizations
        .filter((x): x is string => typeof x === 'string')
        .slice(0, 8);
    }
    return null;
  } catch {
    return null;
  }
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
      const sug = await llmSuggestions(prompt, channel) ?? buildSuggestions(prompt);
      response = { kind: 'suggestions', channel, ...sug };
    } else if (action === 'create') {
      const draft =
        (await llmCampaignDraft(prompt, channel, context)) ?? buildCampaignDraft(prompt, context);
      response = { kind: 'campaign_draft', channel, ...draft };
    } else {
      const insights = channel === 'meta' ? await fetchMetaInsights() : null;
      const opts = (await llmOptimizations(insights, channel)) ?? buildOptimizations(insights);
      response = { kind: 'optimizations', channel, optimizations: opts };
    }

    const runId = await persistRun(channel, campaignId, action, prompt || null, response);
    return NextResponse.json({ ok: true, runId, response });
  } catch (err) {
    return adminError(err, 'ADS_AGENT_FAILED');
  }
}
