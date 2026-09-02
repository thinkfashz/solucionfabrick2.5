import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getAdminTenantId } from '@/lib/adminApi';
import { auditMcpAction, claimMcpRateLimit } from '@/lib/mcp/governance';
import { getHarnessAgentProfile, harnessAgentAccess } from '@/lib/mcp/agentProfile';
import { runOllamaAgent } from '@/lib/ollamaAgent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type RequestBody = {
  modelo?: string;
  messages?: ChatMessage[];
  allowCommit?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400, headers: NO_STORE });
  }

  const model = String(body.modelo || '').trim();
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-20)
    : [];
  if (!model || !messages.length) {
    return NextResponse.json({ error: 'modelo y messages son requeridos.' }, { status: 400, headers: NO_STORE });
  }

  try {
    const profile = await getHarnessAgentProfile(tenantId);
    if (!profile.enabled) return NextResponse.json({ error: 'El agente Ollama está deshabilitado.' }, { status: 403, headers: NO_STORE });
    const access = harnessAgentAccess(profile);
    await claimMcpRateLimit(access, 'request');
    await auditMcpAction({
      access,
      toolName: '__ollama_agent_request__',
      phase: 'request',
      outcome: 'ok',
      payload: { model, allowCommit: body.allowCommit === true, messages: messages.length },
      result: { count: messages.length },
      requestId: request.headers.get('x-request-id') || request.headers.get('x-vercel-id'),
    });

    const result = await runOllamaAgent({
      access,
      profile,
      model,
      messages,
      allowCommit: body.allowCommit === true,
    });

    return NextResponse.json({ ok: true, profile: { enabled: profile.enabled, scopes: profile.scopes, maxSteps: profile.maxSteps }, ...result }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar el agente.';
    const status = message === 'OLLAMA_NOT_CONFIGURED' ? 409
      : message === 'AGENT_DISABLED' ? 403
        : message.startsWith('MCP_RATE_LIMITED:') ? 429
          : 500;
    return NextResponse.json({ error: message }, { status, headers: NO_STORE });
  }
}
