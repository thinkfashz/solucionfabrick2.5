import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { runGovernedAgent } from '@/lib/governedAgent';
import { assertOllamaAgentProfile } from '@/lib/ollamaAgentAccess';
import type { AiProvider } from '@/lib/resolveAiConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

const ALLOWED_PROVIDERS = new Set<AiProvider>(['ollama', 'gemini', 'grok', 'openrouter', 'anthropic', 'openai', 'groq', 'custom']);

export async function POST(request: NextRequest) {
  const readAuth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!readAuth.ok) return readAuth.response;

  let body: {
    provider?: string;
    model?: string;
    keyId?: string;
    prompt?: string;
    allowWrites?: boolean;
    conversationId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (body.allowWrites === true) {
    const writeAuth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
    if (!writeAuth.ok) return writeAuth.response;
  }

  const provider = String(body.provider || 'ollama').trim().toLowerCase() as AiProvider;
  const model = String(body.model || '').trim();
  const keyId = String(body.keyId || '').trim().toLowerCase();
  const prompt = String(body.prompt || '').trim();
  const conversationId = String(body.conversationId || '').trim() || null;
  if (!ALLOWED_PROVIDERS.has(provider)) return NextResponse.json({ error: 'Proveedor de IA no soportado por el agente.' }, { status: 400 });
  if (!model || !keyId || !prompt) return NextResponse.json({ error: 'provider, model, keyId y prompt son requeridos.' }, { status: 400 });
  if (prompt.length > 12000) return NextResponse.json({ error: 'El prompt supera 12.000 caracteres.' }, { status: 413 });

  try {
    // El perfil se sigue validando con el mismo contrato MCP usado originalmente por Ollama.
    // El nombre legacy se conserva para no romper rutas existentes, pero el perfil ya es provider-neutral.
    await assertOllamaAgentProfile(readAuth.ctx.tenantId, keyId);
    const result = await runGovernedAgent({
      tenantId: readAuth.ctx.tenantId,
      keyId,
      provider,
      model,
      prompt,
      origin: request.nextUrl.origin,
      allowWrites: body.allowWrites === true,
      conversationId,
      createdBy: readAuth.ctx.userId || null,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'El agente no pudo completar la tarea.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
