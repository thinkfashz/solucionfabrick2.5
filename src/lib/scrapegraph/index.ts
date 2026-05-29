/**
 * scrapegraph/index.ts
 * TypeScript implementation of ScrapeGraphAI concept.
 * Uses Playwright (BrowserSession) + LLM to extract structured data from web pages.
 */

export type { AiConfig } from '@/lib/resolveAiConfig';
export { resolveAiConfig, resolveSerperKey } from '@/lib/resolveAiConfig';
import type { AiConfig } from '@/lib/resolveAiConfig';

const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

async function rawsql(query: string): Promise<{ data?: { rows?: Record<string, unknown>[] } } | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
  } catch {
    return null;
  }
}

export interface SmartScrapeResult {
  data: unknown;
  rawText: string;
  url: string;
  model: string;
  duration_ms: number;
}

export interface BatchScrapeResult {
  results: Array<{ url: string; data: unknown; error?: string }>;
  duration_ms: number;
}

export interface SearchScrapeResult {
  results: Array<{ url: string; data: unknown }>;
  duration_ms: number;
}

/* ─── LLM caller ─────────────────────────────────────────────────────────── */
async function callLLM(aiConfig: AiConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  // OpenAI-compatible providers: Groq, OpenRouter, OpenAI, Grok
  const OPENAI_COMPAT_URLS: Partial<Record<string, string>> = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    grok: 'https://api.x.ai/v1/chat/completions',
  };

  const openaiUrl = OPENAI_COMPAT_URLS[aiConfig.provider];
  if (openaiUrl) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (aiConfig.provider === 'openrouter') {
      if (aiConfig.siteUrl) headers['HTTP-Referer'] = aiConfig.siteUrl;
      if (aiConfig.appName) headers['X-Title'] = aiConfig.appName;
    }

    const res = await fetch(openaiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiConfig.modelo,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${aiConfig.provider} error: ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message.content ?? '';
  }

  // Gemini — different REST format
  if (aiConfig.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.modelo}:generateContent?key=${aiConfig.apiKey}`;
    const combined = `${systemPrompt}\n\n${userPrompt}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: combined }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  // Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': aiConfig.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: aiConfig.modelo,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((b) => b.type === 'text')?.text ?? '';
}

/* ─── Text extractor — self-contained Playwright fetch ───────────────────── */
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
  '--ignore-certificate-errors',
];

const BLOCK_TYPES = new Set(['image', 'stylesheet', 'font', 'media', 'websocket']);

const MAX_TEXT = 10_000;

function cleanText(raw: string): string {
  return raw.replace(/\s{3,}/g, '\n\n').replace(/\n{4,}/g, '\n\n').trim().slice(0, MAX_TEXT);
}

async function fetchPageText(url: string): Promise<string> {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  try {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => {
      if (BLOCK_TYPES.has(route.request().resourceType())) {
        route.abort().catch(() => null);
      } else {
        route.continue().catch(() => null);
      }
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(700);
    const raw = await page.evaluate(() => {
      const rm = (sel: string) => document.querySelectorAll(sel).forEach((el) => el.remove());
      rm('script'); rm('style'); rm('nav'); rm('footer');
      rm('header'); rm('noscript'); rm('[aria-hidden="true"]');
      return document.body?.innerText ?? '';
    });
    return cleanText(raw);
  } catch {
    return '';
  } finally {
    await browser.close().catch(() => null);
  }
}

const SYSTEM_EXTRACT = `Eres un extractor de datos web. El usuario te dará el contenido de una página y un prompt de extracción. Debes responder ÚNICAMENTE con JSON válido (sin markdown, sin bloques de código, sin explicaciones). Si no encuentras los datos, devuelve un objeto vacío {} o array vacío [].`;

function parseJsonSafe(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown code blocks if LLM ignores instructions
  const stripped = trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Try to find JSON substring
    const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { /* noop */ }
    }
    return { raw: stripped, parse_error: true };
  }
}

/* ─── smartScrape ────────────────────────────────────────────────────────── */
export async function smartScrape(params: {
  url: string;
  prompt: string;
  outputSchema?: string;
  aiConfig: AiConfig;
  onProgress?: (msg: string) => void;
}): Promise<SmartScrapeResult> {
  const { url, prompt, outputSchema, aiConfig, onProgress } = params;
  const t0 = Date.now();

  onProgress?.(`Navegando a ${url}…`);
  const rawText = await fetchPageText(url);

  onProgress?.('Extrayendo datos con IA…');
  const schemaHint = outputSchema
    ? `\n\nSchema de salida esperado (orientativo):\n${outputSchema}`
    : '';

  const userPrompt = `Página: ${url}\n\nContenido:\n${rawText.slice(0, 12_000)}\n\nExtrae: ${prompt}${schemaHint}\n\nResponde SOLO con JSON válido, sin markdown.`;

  const llmText = await callLLM(aiConfig, SYSTEM_EXTRACT, userPrompt);
  const data = parseJsonSafe(llmText);

  return {
    data,
    rawText: rawText.slice(0, 3_000),
    url,
    model: aiConfig.modelo,
    duration_ms: Date.now() - t0,
  };
}

/* ─── searchAndScrape ────────────────────────────────────────────────────── */
export async function searchAndScrape(params: {
  query: string;
  prompt: string;
  maxPages?: number;
  serperKey?: string;
  aiConfig: AiConfig;
  onProgress?: (msg: string) => void;
}): Promise<SearchScrapeResult> {
  const { query, prompt, maxPages = 3, serperKey, aiConfig, onProgress } = params;
  const t0 = Date.now();

  onProgress?.(`Buscando: "${query}"…`);

  let urls: string[] = [];

  // Try Serper first
  if (serperKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, gl: 'cl', num: maxPages * 2 }),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = await res.json() as { organic?: Array<{ link: string }> };
        urls = (data.organic ?? []).map((r) => r.link).filter(Boolean).slice(0, maxPages);
      }
    } catch { /* fall through to DuckDuckGo */ }
  }

  // Fallback: DuckDuckGo HTML search
  if (!urls.length) {
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const text = await fetchPageText(ddgUrl);
      // Extract URLs from text
      const matches = text.matchAll(/https?:\/\/[^\s"'<>]+/g);
      for (const m of matches) {
        const u = m[0].replace(/[,;)\]>]+$/, '');
        if (!u.includes('duckduckgo') && !u.includes('duck.co')) {
          urls.push(u);
          if (urls.length >= maxPages) break;
        }
      }
    } catch { /* noop */ }
  }

  if (!urls.length) {
    return { results: [], duration_ms: Date.now() - t0 };
  }

  onProgress?.(`Analizando ${urls.length} páginas…`);

  const results: Array<{ url: string; data: unknown }> = [];
  for (const url of urls) {
    try {
      onProgress?.(`Scrapeando ${url}…`);
      const r = await smartScrape({ url, prompt, aiConfig });
      results.push({ url, data: r.data });
    } catch {
      results.push({ url, data: null });
    }
  }

  return { results, duration_ms: Date.now() - t0 };
}

/* ─── batchScrape ────────────────────────────────────────────────────────── */
export async function batchScrape(params: {
  urls: string[];
  prompt: string;
  aiConfig: AiConfig;
  onProgress?: (msg: string) => void;
}): Promise<BatchScrapeResult> {
  const { urls, prompt, aiConfig, onProgress } = params;
  const t0 = Date.now();

  const results: Array<{ url: string; data: unknown; error?: string }> = [];

  for (const url of urls) {
    try {
      onProgress?.(`Scrapeando ${url}…`);
      const r = await smartScrape({ url, prompt, aiConfig });
      results.push({ url, data: r.data });
    } catch (err) {
      results.push({ url, data: null, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { results, duration_ms: Date.now() - t0 };
}
