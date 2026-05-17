import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Provider = 'openai' | 'openrouter' | 'claude';

type Body = {
  provider?: Provider;
};

function providerOf(value: unknown): Provider | null {
  if (value === 'openai' || value === 'openrouter' || value === 'claude') return value;
  return null;
}

async function testOpenAICompatible(args: { provider: 'openai' | 'openrouter'; apiKey: string; model: string; siteUrl?: string; appName?: string }) {
  const startedAt = Date.now();
  const baseUrl = args.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
      ...(args.provider === 'openrouter'
        ? {
            'HTTP-Referer': args.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.solucionesfabrick.com',
            'X-Title': args.appName || 'Soluciones Fabrick Admin',
          }
        : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: 'Responde solo OK.' }],
      temperature: 0,
      max_tokens: 8,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Proveedor rechazó HTTP ${res.status}`);
  return { latencyMs: Date.now() - startedAt, sample: json?.choices?.[0]?.message?.content ?? 'OK' };
}

async function testClaude(args: { apiKey: string; model: string }) {
  const startedAt = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: 'user', content: 'Responde solo OK.' }],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Claude rechazó HTTP ${res.status}`);
  const sample = Array.isArray(json?.content) ? json.content.map((p: { text?: string }) => p.text ?? '').join('\n') : 'OK';
  return { latencyMs: Date.now() - startedAt, sample };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  if (auth.role === 'viewer') {
    return NextResponse.json({ error: 'Modo demo: test de proveedores IA bloqueado.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const provider = providerOf(body.provider);
  if (!provider) return NextResponse.json({ error: 'Proveedor IA no soportado.' }, { status: 400 });

  const resolved = await resolveIntegrationCredentials(provider, ['api_key'], true);
  if (!resolved.values.api_key || resolved.missing.includes('api_key')) {
    await recordAdminFailure({ session: auth.session, request, action: 'test', resource: 'integrations', metadata: { module: 'ai-developer', provider, reason: 'missing_api_key' } });
    return NextResponse.json({ error: `Falta API key para ${provider}.`, missing: ['api_key'], source: resolved.source }, { status: 400 });
  }

  const model = resolved.values.model || (provider === 'claude' ? 'claude-3-5-sonnet-latest' : provider === 'openrouter' ? 'openai/gpt-4.1-mini' : 'gpt-4.1-mini');

  try {
    const result = provider === 'claude'
      ? await testClaude({ apiKey: resolved.values.api_key, model })
      : await testOpenAICompatible({
          provider,
          apiKey: resolved.values.api_key,
          model,
          siteUrl: resolved.values.site_url,
          appName: resolved.values.app_name,
        });

    await recordAdminAudit({ session: auth.session, request, action: 'test', resource: 'integrations', metadata: { module: 'ai-developer', provider, model, source: resolved.source, latencyMs: result.latencyMs } });
    return NextResponse.json({ ok: true, provider, model, source: resolved.source, latencyMs: result.latencyMs, sample: result.sample });
  } catch (err) {
    await recordAdminFailure({ session: auth.session, request, action: 'test', resource: 'integrations', metadata: { module: 'ai-developer', provider, model, source: resolved.source, error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo testear el proveedor IA.' }, { status: 502 });
  }
}
