export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveAiConfig, resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiConfig, AiProvider } from '@/lib/resolveAiConfig';

const SYSTEM_PROMPT =
  'Eres un experto en diseño de emails HTML. El usuario quiere mejorar el estilo de su email. ' +
  'Responde SOLO con el HTML completo del email mejorado, sin explicaciones ni markdown. ' +
  'No incluyas bloques de código ni comillas. Solo el HTML puro comenzando con <!DOCTYPE html> o <html> o directamente con el contenido.';

const OPENAI_COMPAT_URLS: Partial<Record<string, string>> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  grok: 'https://api.x.ai/v1/chat/completions',
};

function stripMarkdown(text: string): string {
  return text
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

async function callProvider(config: AiConfig, userContent: string): Promise<string> {
  const openaiUrl = OPENAI_COMPAT_URLS[config.provider];

  if (openaiUrl) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (config.provider === 'openrouter') {
      if (config.siteUrl) headers['HTTP-Referer'] = config.siteUrl;
      if (config.appName) headers['X-Title'] = config.appName;
    }
    const res = await fetch(openaiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`${config.provider} ${res.status}: ${err}`);
    }
    interface OAIResponse { choices?: { message?: { content?: string } }[] }
    const data = (await res.json()) as OAIResponse;
    return stripMarkdown(data.choices?.[0]?.message?.content ?? '');
  }

  if (config.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent?key=${config.apiKey}`;
    const combined = `${SYSTEM_PROMPT}\n\n${userContent}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: combined }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`gemini ${res.status}: ${err}`);
    }
    interface GeminiResponse { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const data = (await res.json()) as GeminiResponse;
    return stripMarkdown(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
  }

  // Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelo,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`anthropic ${res.status}: ${err}`);
  }
  interface AnthropicResponse { content?: { text?: string }[] }
  const data = (await res.json()) as AnthropicResponse;
  return stripMarkdown(data.content?.[0]?.text ?? '');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  let html = '';
  let instruccion = '';
  let providerParam = '';
  let modeloParam = '';

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.html === 'string') html = body.html;
    if (typeof body.instruccion === 'string') instruccion = body.instruccion;
    if (typeof body.provider === 'string') providerParam = body.provider;
    if (typeof body.modelo === 'string') modeloParam = body.modelo;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!html.trim()) {
    return NextResponse.json({ ok: false, error: 'El HTML no puede estar vacío' }, { status: 400 });
  }

  const userContent = instruccion
    ? `Instrucción: ${instruccion}\n\nHTML original:\n${html}`
    : `Mejora el estilo visual de este email HTML:\n${html}`;

  const errors: string[] = [];

  // Resolve primary config
  let primaryConfig: AiConfig | null = null;
  if (providerParam && providerParam !== 'auto') {
    primaryConfig = await resolveProviderConfig(providerParam as AiProvider, modeloParam);
  } else {
    primaryConfig = await resolveAiConfig();
  }

  // 1. Try primary config
  if (primaryConfig) {
    try {
      const improved = await callProvider(primaryConfig, userContent);
      if (improved) {
        return NextResponse.json({
          ok: true,
          html: improved,
          provider: primaryConfig.provider,
          modelo: primaryConfig.modelo,
          usedFallback: false,
        });
      }
      errors.push(`${primaryConfig.provider}: respuesta vacía`);
    } catch (err) {
      errors.push((err as Error).message);
    }
  } else {
    errors.push('Sin proveedor IA configurado. Configura uno en Centro de Integraciones.');
  }

  // 2. Fallback: OpenRouter free models
  const openrouterFreeModels = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1:free',
  ];
  for (const model of openrouterFreeModels) {
    const config = await resolveProviderConfig('openrouter', model);
    if (!config) break; // No OpenRouter key at all, skip remaining
    try {
      const improved = await callProvider(config, userContent);
      if (improved) {
        return NextResponse.json({
          ok: true,
          html: improved,
          provider: config.provider,
          modelo: config.modelo,
          usedFallback: true,
        });
      }
      errors.push(`openrouter/${model}: respuesta vacía`);
    } catch (err) {
      errors.push(`openrouter/${model}: ${(err as Error).message}`);
    }
  }

  // 3. Fallback: Groq free models
  const groqFreeModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];
  for (const model of groqFreeModels) {
    const config = await resolveProviderConfig('groq', model);
    if (!config) break; // No Groq key at all, skip remaining
    try {
      const improved = await callProvider(config, userContent);
      if (improved) {
        return NextResponse.json({
          ok: true,
          html: improved,
          provider: config.provider,
          modelo: config.modelo,
          usedFallback: true,
        });
      }
      errors.push(`groq/${model}: respuesta vacía`);
    } catch (err) {
      errors.push(`groq/${model}: ${(err as Error).message}`);
    }
  }

  // All failed
  return NextResponse.json(
    { ok: false, error: `Todos los proveedores fallaron: ${errors.join(' | ')}` },
    { status: 502 },
  );
}
