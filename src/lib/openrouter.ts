import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials } from '@/lib/integrationsCrypto';

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
  const envKey = pickEnv(ENV_API_KEYS);
  const envSite = pickEnv(ENV_SITE_URL);
  const envApp = pickEnv(ENV_APP_NAME) ?? DEFAULT_APP_NAME;
  if (envKey) {
    return { apiKey: envKey, siteUrl: envSite, appName: envApp, source: 'env' };
  }
  try {
    const { data, error } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'openrouter')
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const creds = decryptCredentials(
      (data as { credentials?: Record<string, unknown> }).credentials ?? {},
    ) as Record<string, string | undefined>;
    const apiKey = typeof creds.api_key === 'string' ? creds.api_key.trim() : '';
    if (!apiKey) return null;
    return {
      apiKey,
      siteUrl: typeof creds.site_url === 'string' && creds.site_url.trim().length > 0 ? creds.site_url.trim() : envSite,
      appName: typeof creds.app_name === 'string' && creds.app_name.trim().length > 0 ? creds.app_name.trim() : DEFAULT_APP_NAME,
      source: 'db',
    };
  } catch {
    return null;
  }
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
}

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatCompletionResult> {
  const creds = await getOpenRouterCredentials();
  if (!creds) {
    throw new Error(
      'OpenRouter no está configurado. Agrega tu API key en /admin/integraciones (tarjeta OpenRouter) o define OPENROUTER_API_KEY.',
    );
  }
  const body = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: false,
  };
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: defaultHeaders(creds),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const txt = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(txt) as Record<string, unknown>;
  } catch {
    /* keep empty */
  }
  if (!res.ok) {
    const err = (payload as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenRouter rechazó la consulta: ${err}`);
  }
  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices ?? [];
  const text = choices[0]?.message?.content ?? '';
  const usageRaw = (payload as { usage?: Record<string, number> }).usage ?? {};
  return {
    text,
    model: ((payload as { model?: string }).model as string) ?? opts.model,
    usage: {
      prompt_tokens: Number(usageRaw.prompt_tokens) || 0,
      completion_tokens: Number(usageRaw.completion_tokens) || 0,
      total_tokens: Number(usageRaw.total_tokens) || 0,
    },
    raw: payload,
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
