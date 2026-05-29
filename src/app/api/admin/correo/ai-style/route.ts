export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveAiConfig } from '@/lib/resolveAiConfig';

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
  // Remove ```html ... ``` or ``` ... ``` wrappers the model might add
  return text
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

async function callAi(html: string, instruccion: string): Promise<string> {
  const config = await resolveAiConfig();
  if (!config) throw new Error('Sin proveedor IA configurado. Configura uno en Centro de Integraciones.');

  const userContent = instruccion
    ? `Instrucción: ${instruccion}\n\nHTML original:\n${html}`
    : `Mejora el estilo visual de este email HTML:\n${html}`;

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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.html === 'string') html = body.html;
    if (typeof body.instruccion === 'string') instruccion = body.instruccion;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!html.trim()) {
    return NextResponse.json({ ok: false, error: 'El HTML no puede estar vacío' }, { status: 400 });
  }

  try {
    const improved = await callAi(html, instruccion);
    if (!improved) {
      return NextResponse.json({ ok: false, error: 'La IA no devolvió contenido' }, { status: 502 });
    }

    // Retrieve config again to return provider info (no key)
    const config = await resolveAiConfig();
    return NextResponse.json({
      ok: true,
      html: improved,
      provider: config?.provider ?? 'unknown',
      modelo: config?.modelo ?? '',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
