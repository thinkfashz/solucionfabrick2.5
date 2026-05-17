import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Provider = 'auto' | 'openai' | 'openrouter' | 'claude';
type Mode = 'lectura' | 'propuesta' | 'pr';
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type Body = {
  provider?: Provider;
  mode?: Mode;
  prompt?: string;
  messages?: Array<{ role?: string; content?: string; text?: string }>;
};

const MODELS = {
  openai: 'gpt-4.1-mini',
  openrouter: 'openai/gpt-4.1-mini',
  claude: 'claude-3-5-sonnet-latest',
} as const;

const SYSTEM = `Eres Fabrick AI Developer, asistente interno de desarrollo para Soluciones Fabrick.
No reveles secretos. No hagas merge ni deploy. No digas que modificaste código si solo respondes desde chat. Trabaja modular, seguro y por etapas.`;

function providerOf(value: unknown): Provider {
  return value === 'openai' || value === 'openrouter' || value === 'claude' || value === 'auto' ? value : 'auto';
}

function modeOf(value: unknown): Mode {
  return value === 'lectura' || value === 'propuesta' || value === 'pr' ? value : 'lectura';
}

function modeText(mode: Mode) {
  if (mode === 'lectura') return 'Modo solo lectura: analiza y recomienda sin acciones de escritura.';
  if (mode === 'propuesta') return 'Modo propuesta: entrega plan, riesgos, archivos probables y checklist.';
  return 'Modo preparar PR: propón cambios revisables, sin merge ni deploy.';
}

function messagesOf(body: Body): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (Array.isArray(body.messages)) {
    for (const item of body.messages.slice(-20)) {
      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const raw = typeof item.content === 'string' ? item.content : typeof item.text === 'string' ? item.text : '';
      const content = raw.trim().slice(0, 8000);
      if (role && content) out.push({ role, content });
    }
  }
  if (out.length === 0 && typeof body.prompt === 'string' && body.prompt.trim()) {
    out.push({ role: 'user', content: body.prompt.trim().slice(0, 8000) });
  }
  return out;
}

async function selectProvider(preferred: Provider) {
  const order: Array<'openai' | 'openrouter' | 'claude'> = preferred === 'auto' ? ['openai', 'openrouter', 'claude'] : [preferred];
  for (const provider of order) {
    const resolved = await resolveIntegrationCredentials(provider, ['api_key'], true);
    if (resolved.values.api_key && resolved.missing.length === 0) return { provider, resolved };
  }
  return null;
}

async function callChatCompletions(args: { apiKey: string; baseUrl: string; model: string; messages: ChatMessage[]; headers?: Record<string, string> }) {
  const res = await fetch(`${args.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json', ...(args.headers ?? {}) },
    body: JSON.stringify({ model: args.model, messages: args.messages, temperature: 0.2, max_tokens: 1600 }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Proveedor rechazó HTTP ${res.status}`);
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('El proveedor no devolvió contenido.');
  return text.trim();
}

async function callClaude(args: { apiKey: string; model: string; messages: ChatMessage[] }) {
  const system = args.messages.find((m) => m.role === 'system')?.content ?? SYSTEM;
  const messages = args.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': args.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: args.model, max_tokens: 1600, temperature: 0.2, system, messages }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Claude rechazó HTTP ${res.status}`);
  const text = Array.isArray(json?.content) ? json.content.map((p: { text?: string }) => p.text ?? '').join('\n').trim() : '';
  if (!text) throw new Error('Claude no devolvió contenido.');
  return text;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'read' });
  if (!auth.ok) return auth.response;
  if (auth.role === 'viewer') return NextResponse.json({ error: 'Modo demo: Fabrick AI Developer está bloqueado para viewer.' }, { status: 403 });

  let body: Body;
  try { body = (await request.json()) as Body; } catch { return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 }); }

  const providerInput = providerOf(body.provider);
  const mode = modeOf(body.mode);
  const userMessages = messagesOf(body);
  if (userMessages.length === 0) return NextResponse.json({ error: 'Mensaje requerido.' }, { status: 400 });

  const selected = await selectProvider(providerInput);
  if (!selected) {
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'admin', metadata: { module: 'ai-developer', provider: providerInput, reason: 'missing_ai_credentials' } });
    return NextResponse.json({ error: 'Faltan credenciales IA. Configura OpenAI, OpenRouter o Claude en /admin/integraciones o Vercel.', missing: ['api_key'] }, { status: 400 });
  }

  const { provider, resolved } = selected;
  const model = resolved.values.model || MODELS[provider];
  const messages: ChatMessage[] = [{ role: 'system', content: `${SYSTEM}\n${modeText(mode)}` }, ...userMessages];

  try {
    const message = provider === 'claude'
      ? await callClaude({ apiKey: resolved.values.api_key, model, messages })
      : await callChatCompletions({
          apiKey: resolved.values.api_key,
          baseUrl: provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1',
          model,
          messages,
          headers: provider === 'openrouter' ? { 'HTTP-Referer': resolved.values.site_url || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.solucionesfabrick.com', 'X-Title': resolved.values.app_name || 'Soluciones Fabrick Admin' } : undefined,
        });

    await recordAdminAudit({ session: auth.session, request, action: 'read', resource: 'admin', metadata: { module: 'ai-developer', provider, mode, model, source: resolved.source, messageCount: userMessages.length } });
    return NextResponse.json({ ok: true, provider, mode, model, source: resolved.source, message });
  } catch (err) {
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'admin', metadata: { module: 'ai-developer', provider, mode, model, source: resolved.source, error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo consultar el proveedor IA.' }, { status: 502 });
  }
}
