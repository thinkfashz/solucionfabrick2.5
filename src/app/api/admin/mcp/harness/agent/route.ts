import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { runOllamaAgent } from '@/lib/ollamaAgent';
import { assertOllamaAgentProfile } from '@/lib/ollamaAgentAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const readAuth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!readAuth.ok) return readAuth.response;

  let body: {
    model?: string;
    keyId?: string;
    prompt?: string;
    allowWrites?: boolean;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

  const model = String(body.model || '').trim();
  const keyId = String(body.keyId || '').trim().toLowerCase();
  const prompt = String(body.prompt || '').trim();
  if (!model || !keyId || !prompt) return NextResponse.json({ error: 'model, keyId y prompt son requeridos.' }, { status: 400 });
  if (prompt.length > 12000) return NextResponse.json({ error: 'El prompt supera 12.000 caracteres.' }, { status: 413 });

  try {
    await assertOllamaAgentProfile(readAuth.ctx.tenantId, keyId);
    const result = await runOllamaAgent({
      tenantId: readAuth.ctx.tenantId,
      keyId,
      model,
      prompt,
      origin: request.nextUrl.origin,
      allowWrites: body.allowWrites === true,
      history: Array.isArray(body.history) ? body.history.slice(-12) : [],
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'El agente Ollama no pudo completar la tarea.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
