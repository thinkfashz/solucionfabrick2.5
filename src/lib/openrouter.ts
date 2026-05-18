import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import {
  aggregateMetrics,
  modelScore,
  shouldExcludeModel,
  type MetricRow,
  type MetricStatus,
  type ModelStats,
} from '@/lib/aiChatStats';

const ENV_API_KEYS = ['OPENROUTER_API_KEY', 'OPENROUTER_KEY'] as const;
const ENV_SITE_URL = ['OPENROUTER_SITE_URL', 'NEXT_PUBLIC_SITE_URL'] as const;
const ENV_APP_NAME = ['OPENROUTER_APP_NAME'] as const;

const DEFAULT_APP_NAME = 'Soluciones Fabrick';

function pickEnv(names: readonly string[]): string | null {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

export interface OpenRouterCredentials {
  apiKey: string;
  siteUrl: string | null;
  appName: string;
  source: 'env' | 'db';
}

export async function getOpenRouterCredentials(): Promise<OpenRouterCredentials | null> {
  const envSite = pickEnv(ENV_SITE_URL);
  const envApp = pickEnv(ENV_APP_NAME) ?? DEFAULT_APP_NAME;

  // DB first — consistent with the hybrid pattern used by Resend.
  // Env vars serve as fallback when the DB row is absent or has no api_key.
  try {
    const { data, error } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'openrouter')
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      const creds = decryptCredentials(
        (data as { credentials?: Record<string, unknown> }).credentials ?? {},
      ) as Record<string, string | undefined>;
      const apiKey = typeof creds.api_key === 'string' ? creds.api_key.trim() : '';
      if (apiKey) {
        return {
          apiKey,
          siteUrl: typeof creds.site_url === 'string' && creds.site_url.trim().length > 0 ? creds.site_url.trim() : envSite,
          appName: typeof creds.app_name === 'string' && creds.app_name.trim().length > 0 ? creds.app_name.trim() : DEFAULT_APP_NAME,
          source: 'db',
        };
      }
    }
  } catch {
    // DB unavailable — fall through to env vars
  }

  // Env var fallback
  const envKey = pickEnv(ENV_API_KEYS);
  if (envKey) {
    return { apiKey: envKey, siteUrl: envSite, appName: envApp, source: 'env' };
  }

  return null;
}

const OR_BASE = 'https://openrouter.ai/api/v1';

function defaultHeaders(creds: OpenRouterCredentials): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': creds.appName,
  };
  if (creds.siteUrl) h['HTTP-Referer'] = creds.siteUrl;
  return h;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string | null;
  context_length: number | null;
  pricing: { prompt: number; completion: number };
  /** True si tanto prompt como completion son 0 (gratuito). */
  isFree: boolean;
}

interface RawModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string | number; completion?: string | number };
}

let modelsCache: { ts: number; models: OpenRouterModel[] } | null = null;
const MODELS_TTL_MS = 60 * 60 * 1000; // 1h

export async function listModels(force = false): Promise<OpenRouterModel[]> {
  if (!force && modelsCache && Date.now() - modelsCache.ts < MODELS_TTL_MS) {
    return modelsCache.models;
  }
  const creds = await getOpenRouterCredentials();
  // GET /models es un endpoint público (no requiere Authorization) y no
  // necesita Content-Type porque es GET. Reusamos `defaultHeaders` para
  // pasar Referer/X-Title (mejora ranking en OpenRouter), pero
  // descartamos `Content-Type` que no aplica a un GET.
  const headers: Record<string, string> = creds ? { ...defaultHeaders(creds) } : {};
  delete headers['Content-Type'];

  let res: Response;
  try {
    res = await fetch(`${OR_BASE}/models`, { headers, cache: 'no-store' });
  } catch (err) {
    throw new Error(`No se pudo contactar OpenRouter: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`OpenRouter /models devolvió HTTP ${res.status}`);
  }
  const json = (await res.json().catch(() => ({}))) as { data?: RawModel[] };
  const raw = Array.isArray(json.data) ? json.data : [];
  const models: OpenRouterModel[] = raw.map((m) => {
    const promptCost = Number(m.pricing?.prompt ?? 0);
    const completionCost = Number(m.pricing?.completion ?? 0);
    return {
      id: m.id,
      name: m.name ?? m.id,
      description: typeof m.description === 'string' ? m.description : null,
      context_length: typeof m.context_length === 'number' ? m.context_length : null,
      pricing: {
        prompt: Number.isFinite(promptCost) ? promptCost : 0,
        completion: Number.isFinite(completionCost) ? completionCost : 0,
      },
      isFree: promptCost === 0 && completionCost === 0,
    };
  });
  modelsCache = { ts: Date.now(), models };
  return models;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  text: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  raw: unknown;
  /** Latencia de la llamada exitosa que produjo este resultado, en ms. */
  latency_ms: number;
  /** Lista (en orden) de modelos intentados antes de obtener este resultado. */
  tried: TriedModel[];
}

export interface TriedModel {
  model: string;
  status: MetricStatus;
  latency_ms: number;
  http_status: number | null;
  error?: string;
}

export interface CallChatModelResult {
  ok: boolean;
  status: MetricStatus;
  http_status: number | null;
  latency_ms: number;
  text: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  images: GeneratedImage[];
  raw: unknown;
  error?: string;
}

export interface GeneratedImage {
  /** data:URL completa o https:URL si OpenRouter devuelve un link absoluto. */
  dataUrl: string;
  mimeType: string;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_FALLBACK_ATTEMPTS = 4;
const MAX_FALLBACK_TOTAL_MS = 60_000;

function getTimeoutMs(): number {
  const v = Number(process.env.CHAT_TIMEOUT_MS);
  return Number.isFinite(v) && v >= 1000 && v <= 120_000 ? v : DEFAULT_TIMEOUT_MS;
}

function classifyHttpStatus(status: number): MetricStatus {
  if (status === 429) return 'rate_limit';
  if (status >= 500 && status < 600) return 'error';
  return 'error';
}

interface RawMessage {
  content?: string;
  images?: Array<{ image_url?: { url?: string } | string }>;
}

function extractImages(msg: RawMessage | undefined): GeneratedImage[] {
  if (!msg || !Array.isArray(msg.images)) return [];
  const out: GeneratedImage[] = [];
  for (const img of msg.images) {
    let url: string | null = null;
    if (typeof img === 'string') url = img;
    else if (img && typeof img === 'object') {
      const inner = (img as { image_url?: { url?: string } | string }).image_url;
      if (typeof inner === 'string') url = inner;
      else if (inner && typeof inner.url === 'string') url = inner.url;
    }
    if (!url) continue;
    const m = /^data:([^;]+);/i.exec(url);
    out.push({ dataUrl: url, mimeType: m?.[1] ?? 'image/png' });
  }
  return out;
}

/**
 * Llamada base al endpoint de chat con métrica + timeout. NO lanza
 * excepciones por errores de red/HTTP — siempre devuelve un objeto con
 * `ok` y `status`. El caller decide si reintenta otro modelo.
 */
export async function callChatModel(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Modalities ['image','text'] activa generación de imagen. */
  modalities?: Array<'text' | 'image'>;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<CallChatModelResult> {
  const creds = await getOpenRouterCredentials();
  const startedAt = Date.now();
  if (!creds) {
    return {
      ok: false,
      status: 'error',
      http_status: null,
      latency_ms: 0,
      text: '',
      model: opts.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      images: [],
      raw: null,
      error:
        'OpenRouter no está configurado. Agrega tu API key en /admin/integraciones (tarjeta OpenRouter) o define OPENROUTER_API_KEY.',
    };
  }

  const timeoutMs = opts.timeoutMs ?? getTimeoutMs();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const externalListener = () => abort.abort();
  if (opts.signal) {
    if (opts.signal.aborted) abort.abort();
    else opts.signal.addEventListener('abort', externalListener, { once: true });
  }

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: false,
  };
  if (opts.modalities && opts.modalities.length > 0) {
    body.modalities = opts.modalities;
  }

  let res: Response;
  try {
    res = await fetch(`${OR_BASE}/chat/completions`, {
      method: 'POST',
      headers: defaultHeaders(creds),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: abort.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', externalListener);
    const aborted = (err as Error).name === 'AbortError';
    return {
      ok: false,
      status: aborted ? 'timeout' : 'error',
      http_status: null,
      latency_ms: Date.now() - startedAt,
      text: '',
      model: opts.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      images: [],
      raw: null,
      error: aborted ? `Timeout tras ${timeoutMs} ms` : (err as Error).message,
    };
  }
  clearTimeout(timer);
  if (opts.signal) opts.signal.removeEventListener('abort', externalListener);

  const latency = Date.now() - startedAt;
  const txt = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(txt) as Record<string, unknown>;
  } catch {
    /* keep empty */
  }

  if (!res.ok) {
    const errMsg = (payload as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return {
      ok: false,
      status: classifyHttpStatus(res.status),
      http_status: res.status,
      latency_ms: latency,
      text: '',
      model: opts.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      images: [],
      raw: payload,
      error: errMsg,
    };
  }

  const choices =
    (payload as { choices?: Array<{ message?: RawMessage }> }).choices ?? [];
  const message = choices[0]?.message;
  const text = message?.content ?? '';
  const images = extractImages(message);
  const usageRaw = (payload as { usage?: Record<string, number> }).usage ?? {};
  const usage = {
    prompt_tokens: Number(usageRaw.prompt_tokens) || 0,
    completion_tokens: Number(usageRaw.completion_tokens) || 0,
    total_tokens: Number(usageRaw.total_tokens) || 0,
  };
  const isImageMode = (opts.modalities ?? []).includes('image');
  const empty = isImageMode ? images.length === 0 : text.trim().length === 0;
  if (empty) {
    return {
      ok: false,
      status: 'empty',
      http_status: res.status,
      latency_ms: latency,
      text,
      model: ((payload as { model?: string }).model as string) ?? opts.model,
      usage,
      images,
      raw: payload,
      error: 'Respuesta vacía del modelo',
    };
  }

  return {
    ok: true,
    status: 'ok',
    http_status: res.status,
    latency_ms: latency,
    text,
    model: ((payload as { model?: string }).model as string) ?? opts.model,
    usage,
    images,
    raw: payload,
  };
}

/** Persiste una fila en `ai_model_metrics`. Best-effort. */
async function recordModelMetric(row: {
  model: string;
  status: MetricStatus;
  latency_ms: number;
  http_status: number | null;
  tokens_in?: number;
  tokens_out?: number;
  isFree?: boolean;
  errorCode?: string;
  kind?: 'chat' | 'image';
}): Promise<void> {
  try {
    await insforgeAdmin.database.from('ai_model_metrics').insert([
      {
        model: row.model,
        latency_ms: Math.max(0, Math.round(row.latency_ms)),
        status: row.status,
        http_status: row.http_status,
        tokens_in: row.tokens_in ?? null,
        tokens_out: row.tokens_out ?? null,
        is_free: row.isFree ?? false,
        error_code: row.errorCode ?? null,
        kind: row.kind ?? 'chat',
      },
    ]);
  } catch {
    /* best-effort: la tabla puede no existir aún */
  }
}

/** Descarga últimas 2h de métricas para alimentar el fallback. */
async function loadRecentMetrics(hours = 2): Promise<MetricRow[]> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data } = await insforgeAdmin.database
      .from('ai_model_metrics')
      .select('model,ts,latency_ms,status,is_free')
      .gte('ts', since)
      .order('ts', { ascending: false })
      .limit(500);
    return Array.isArray(data) ? (data as MetricRow[]) : [];
  } catch {
    return [];
  }
}

/**
 * Versión legacy/simple (usada por seoSuggestions, etc.). Mantiene el
 * contrato previo: lanza si falla. Persiste métrica.
 */
export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatCompletionResult> {
  const result = await callChatModel(opts);
  void recordModelMetric({
    model: opts.model,
    status: result.status,
    latency_ms: result.latency_ms,
    http_status: result.http_status,
    tokens_in: result.usage.prompt_tokens,
    tokens_out: result.usage.completion_tokens,
    isFree: opts.model.endsWith(':free'),
    errorCode: result.error?.slice(0, 200),
    kind: 'chat',
  });
  if (!result.ok) {
    throw new Error(`OpenRouter rechazó la consulta: ${result.error ?? result.status}`);
  }
  return {
    text: result.text,
    model: result.model,
    usage: result.usage,
    raw: result.raw,
    latency_ms: result.latency_ms,
    tried: [
      { model: opts.model, status: result.status, latency_ms: result.latency_ms, http_status: result.http_status },
    ],
  };
}

/** Modelos sugeridos como recomendados (gratis o muy baratos). Se muestran en la UI con badge. */
export const RECOMMENDED_FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
];

/** Modelos image-out gratuitos sugeridos. */
export const RECOMMENDED_FREE_IMAGE_MODELS = [
  'google/gemini-2.5-flash-image-preview:free',
  'google/gemini-2.0-flash-exp:free',
];

/** Umbral (USD por token) para considerar un modelo "de pago barato". */
const CHEAP_PAID_MAX_PRICE_PER_TOKEN = 0.5e-6; // $0.5 / 1M tokens

/**
 * Construye la lista ordenada de candidatos para el fallback.
 * Pure-ish: recibe modelos+métricas y devuelve el orden a intentar.
 */
export function buildCandidateList(opts: {
  preferredModel: string;
  models: OpenRouterModel[];
  metrics: MetricRow[];
  allowPaid: boolean;
  recommendedFree?: string[];
  now?: number;
}): string[] {
  const now = opts.now ?? Date.now();
  const recommended = opts.recommendedFree ?? RECOMMENDED_FREE_MODELS;
  const byModel = new Map<string, MetricRow[]>();
  for (const r of opts.metrics) {
    const arr = byModel.get(r.model);
    if (arr) arr.push(r);
    else byModel.set(r.model, [r]);
  }

  const stats = new Map<string, ModelStats>();
  for (const s of aggregateMetrics(opts.metrics, now)) stats.set(s.model, s);

  const isExcluded = (id: string): boolean => {
    const rows = byModel.get(id);
    if (!rows) return false;
    return shouldExcludeModel(rows, now);
  };

  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (id: string | undefined | null) => {
    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);
    candidates.push(id);
  };

  // 1. preferido (incluso si está excluido — el usuario lo eligió). Siempre va primero.
  push(opts.preferredModel);

  // 2. recomendados gratis disponibles, ordenados por score; excluyendo los caídos
  const freeAvailable = opts.models.filter((m) => m.isFree).map((m) => m.id);
  const recommendedAvailable = recommended
    .filter((id) => freeAvailable.includes(id))
    .filter((id) => !isExcluded(id))
    .sort((a, b) => {
      const sa = stats.get(a);
      const sb = stats.get(b);
      const scoreA = sa ? modelScore(sa) : 0.5;
      const scoreB = sb ? modelScore(sb) : 0.5;
      return scoreB - scoreA;
    });
  for (const id of recommendedAvailable) push(id);

  // 3. otros gratis con buen score (working) excluyendo caídos
  const otherFreeGood = freeAvailable
    .filter((id) => !seen.has(id))
    .filter((id) => !isExcluded(id))
    .map((id) => ({ id, score: stats.get(id) ? modelScore(stats.get(id)!) : 0.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.id);
  for (const id of otherFreeGood) push(id);

  // 4. de pago baratos (si allowPaid), por buen historial
  if (opts.allowPaid) {
    const cheapPaid = opts.models
      .filter((m) => !m.isFree)
      .filter((m) => {
        const max = Math.max(m.pricing.prompt, m.pricing.completion);
        return max > 0 && max <= CHEAP_PAID_MAX_PRICE_PER_TOKEN;
      })
      .filter((m) => !isExcluded(m.id))
      .map((m) => ({ id: m.id, score: stats.get(m.id) ? modelScore(stats.get(m.id)!) : 0.5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.id);
    for (const id of cheapPaid) push(id);
  }

  return candidates;
}

/**
 * Llamada con auto-fallback. Si el modelo preferido falla con timeout,
 * 5xx, 429 o respuesta vacía, prueba el siguiente candidato. Máx 4
 * intentos / 60 s totales.
 */
export async function chatCompletionWithFallback(opts: {
  preferredModel: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  allowPaid?: boolean;
  modalities?: Array<'text' | 'image'>;
  /** Para tests: inyecta lista de candidatos en lugar de calcularla. */
  candidatesOverride?: string[];
  /** Para tests: inyecta modelos en lugar de llamar a listModels(). */
  modelsOverride?: OpenRouterModel[];
  metricsOverride?: MetricRow[];
  /** Para tests: stub del callChatModel. */
  callImpl?: typeof callChatModel;
  recordImpl?: typeof recordModelMetric;
  now?: number;
}): Promise<ChatCompletionResult> {
  const callImpl = opts.callImpl ?? callChatModel;
  const recordImpl = opts.recordImpl ?? recordModelMetric;
  let candidates: string[];
  if (opts.candidatesOverride) {
    candidates = opts.candidatesOverride;
  } else {
    const [models, metrics] = await Promise.all([
      opts.modelsOverride ? Promise.resolve(opts.modelsOverride) : listModels().catch(() => []),
      opts.metricsOverride ? Promise.resolve(opts.metricsOverride) : loadRecentMetrics(2),
    ]);
    candidates = buildCandidateList({
      preferredModel: opts.preferredModel,
      models,
      metrics,
      allowPaid: opts.allowPaid ?? false,
      now: opts.now,
    });
  }

  const tried: TriedModel[] = [];
  const startedAt = Date.now();
  let lastResult: CallChatModelResult | null = null;

  for (let i = 0; i < Math.min(MAX_FALLBACK_ATTEMPTS, candidates.length); i++) {
    if (Date.now() - startedAt >= MAX_FALLBACK_TOTAL_MS) break;
    const model = candidates[i];
    const remaining = MAX_FALLBACK_TOTAL_MS - (Date.now() - startedAt);
    const timeoutMs = Math.min(getTimeoutMs(), Math.max(2000, remaining));
    const result = await callImpl({
      model,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      modalities: opts.modalities,
      timeoutMs,
    });
    void recordImpl({
      model,
      status: result.status,
      latency_ms: result.latency_ms,
      http_status: result.http_status,
      tokens_in: result.usage.prompt_tokens,
      tokens_out: result.usage.completion_tokens,
      isFree: model.endsWith(':free'),
      errorCode: result.error?.slice(0, 200),
      kind: (opts.modalities ?? []).includes('image') ? 'image' : 'chat',
    });
    tried.push({
      model,
      status: result.status,
      latency_ms: result.latency_ms,
      http_status: result.http_status,
      error: result.error,
    });
    lastResult = result;
    if (result.ok) {
      return {
        text: result.text,
        model: result.model,
        usage: result.usage,
        raw: result.raw,
        latency_ms: result.latency_ms,
        tried,
      };
    }
  }

  const last = lastResult;
  const summary = tried.map((t) => `${t.model}=${t.status}`).join(' → ');
  throw new Error(
    `Ningún modelo respondió correctamente (${summary}). Último error: ${last?.error ?? 'sin detalles'}`,
  );
}

/**
 * Generación de imágenes vía OpenRouter (modelos con `modalities:['image','text']`).
 * Reusa el mismo motor de fallback + métricas que `chatCompletionWithFallback`.
 */
export async function generateImage(opts: {
  preferredModel?: string;
  prompt: string;
  allowPaid?: boolean;
}): Promise<{
  images: GeneratedImage[];
  text: string;
  model: string;
  usage: ChatCompletionResult['usage'];
  tried: TriedModel[];
  latency_ms: number;
}> {
  const preferred = opts.preferredModel ?? RECOMMENDED_FREE_IMAGE_MODELS[0];
  const messages: ChatMessage[] = [{ role: 'user', content: opts.prompt }];

  // Construir candidatos: empezamos por el preferido y seguimos con la lista de imagen.
  const [models, metrics] = await Promise.all([
    listModels().catch(() => [] as OpenRouterModel[]),
    loadRecentMetrics(2),
  ]);
  const candidates = buildCandidateList({
    preferredModel: preferred,
    models,
    metrics,
    allowPaid: opts.allowPaid ?? false,
    recommendedFree: RECOMMENDED_FREE_IMAGE_MODELS,
  });

  const tried: TriedModel[] = [];
  const startedAt = Date.now();
  let lastResult: CallChatModelResult | null = null;
  for (let i = 0; i < Math.min(MAX_FALLBACK_ATTEMPTS, candidates.length); i++) {
    if (Date.now() - startedAt >= MAX_FALLBACK_TOTAL_MS) break;
    const model = candidates[i];
    const result = await callChatModel({
      model,
      messages,
      modalities: ['image', 'text'],
    });
    void recordModelMetric({
      model,
      status: result.status,
      latency_ms: result.latency_ms,
      http_status: result.http_status,
      tokens_in: result.usage.prompt_tokens,
      tokens_out: result.usage.completion_tokens,
      isFree: model.endsWith(':free'),
      errorCode: result.error?.slice(0, 200),
      kind: 'image',
    });
    tried.push({
      model,
      status: result.status,
      latency_ms: result.latency_ms,
      http_status: result.http_status,
      error: result.error,
    });
    lastResult = result;
    if (result.ok && result.images.length > 0) {
      return {
        images: result.images,
        text: result.text,
        model: result.model,
        usage: result.usage,
        tried,
        latency_ms: result.latency_ms,
      };
    }
  }
  throw new Error(
    `No se pudo generar la imagen (${tried.map((t) => `${t.model}=${t.status}`).join(' → ')}). ${lastResult?.error ?? ''}`.trim(),
  );
}
