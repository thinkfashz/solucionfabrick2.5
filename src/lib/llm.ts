import 'server-only';

/**
 * Thin LLM client used by the Ads coach (and anywhere else that needs a
 * one-shot JSON completion). Supports OpenAI and Anthropic via env vars.
 * If no key is configured, callers should fall back to deterministic
 * builders — `isLlmConfigured()` lets them branch cleanly.
 *
 * Env (any one of these enables the integration):
 *   OPENAI_API_KEY      → uses https://api.openai.com/v1/chat/completions
 *   OPENAI_MODEL        → defaults to "gpt-4o-mini"
 *   ANTHROPIC_API_KEY   → uses https://api.anthropic.com/v1/messages
 *   ANTHROPIC_MODEL     → defaults to "claude-3-5-haiku-latest"
 *
 * The helper is intentionally tiny — no streaming, no tools, JSON-only.
 */

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export interface LlmJsonOptions {
  /** A short instruction describing the assistant role. */
  system: string;
  /** The actual user prompt; should ask for JSON. */
  user: string;
  /** Hard cap on tokens for the response (default 800). */
  maxTokens?: number;
  /** Sampling temperature (default 0.4 — favour deterministic JSON). */
  temperature?: number;
  /** Abort after this many ms (default 25_000). */
  timeoutMs?: number;
}

/**
 * Calls the configured LLM and returns the parsed JSON object. Throws if
 * no provider is configured, the call fails, or the response is not JSON.
 * Callers should `try`/`catch` and fall back to deterministic output.
 */
export async function llmJson<T = unknown>(opts: LlmJsonOptions): Promise<T> {
  if (!isLlmConfigured()) throw new Error('LLM_NOT_CONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
  try {
    if (process.env.OPENAI_API_KEY) {
      return await callOpenAi<T>(opts, controller.signal);
    }
    return await callAnthropic<T>(opts, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAi<T>(opts: LlmJsonOptions, signal: AbortSignal): Promise<T> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OPENAI_HTTP_${res.status}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OPENAI_EMPTY_RESPONSE');
  return JSON.parse(content) as T;
}

async function callAnthropic<T>(opts: LlmJsonOptions, signal: AbortSignal): Promise<T> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 800,
      temperature: opts.temperature ?? 0.4,
      system: `${opts.system}\n\nResponde SIEMPRE con un único objeto JSON válido, sin texto adicional ni markdown.`,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });
  if (!res.ok) throw new Error(`ANTHROPIC_HTTP_${res.status}`);
  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = json.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('ANTHROPIC_EMPTY_RESPONSE');
  // Claude can occasionally wrap JSON in ```json fences despite the prompt.
  const trimmed = text.trim().replace(/^```json\s*|\s*```$/g, '');
  return JSON.parse(trimmed) as T;
}
