export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolveAiConfig } from '@/lib/resolveAiConfig';

interface AnthropicMsg { content?: { text?: string }[] }
interface OpenAiMsg { choices?: { message?: { content?: string } }[] }
interface GeminiMsg { candidates?: { content?: { parts?: { text?: string }[] } }[] }

export async function POST() {
  const t0 = Date.now();
  const config = await resolveAiConfig();
  if (!config) return NextResponse.json({ ok: false, error: 'Sin API key configurada. Configura un proveedor en el Centro de Integraciones.' }, { status: 400 });

  const OPENAI_COMPAT_URLS: Partial<Record<string, string>> = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    grok: 'https://api.x.ai/v1/chat/completions',
  };

  try {
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
        body: JSON.stringify({ model: config.modelo, max_tokens: 16, messages: [{ role: 'user', content: 'Di OK.' }] }),
        signal: AbortSignal.timeout(20_000),
      });
      const latency_ms = Date.now() - t0;
      if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
      const data = await res.json() as OpenAiMsg;
      return NextResponse.json({ ok: true, model: config.modelo, provider: config.provider, latency_ms, reply: data.choices?.[0]?.message?.content || 'OK' });
    }

    if (config.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Di OK.' }] }], generationConfig: { maxOutputTokens: 16 } }),
        signal: AbortSignal.timeout(20_000),
      });
      const latency_ms = Date.now() - t0;
      if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
      const data = await res.json() as GeminiMsg;
      return NextResponse.json({ ok: true, model: config.modelo, provider: 'gemini', latency_ms, reply: data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK' });
    }

    // Anthropic
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.modelo, max_tokens: 16, messages: [{ role: 'user', content: 'Di OK.' }] }),
      signal: AbortSignal.timeout(20_000),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
    const data = await res.json() as AnthropicMsg;
    return NextResponse.json({ ok: true, model: config.modelo, provider: 'anthropic', latency_ms, reply: data.content?.[0]?.text || 'OK' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, latency_ms: Date.now() - t0 }, { status: 502 });
  }
}
