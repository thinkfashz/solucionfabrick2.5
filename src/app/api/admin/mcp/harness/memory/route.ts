import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { deleteAgentMemory, listAgentMemory, saveAgentMemory } from '@/lib/agentMemory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const conversationId = request.nextUrl.searchParams.get('conversationId')?.trim() || null;
  try {
    const memories = await listAgentMemory(auth.ctx.tenantId, conversationId, 150);
    return NextResponse.json({ ok: true, memories }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la memoria.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { conversationId?: string | null; scope?: 'tenant'|'conversation'; kind?: 'fact'|'preference'|'decision'|'instruction'|'project'|'finding'|'summary'; key?: string; content?: string; tags?: string[]; importance?: number; pinned?: boolean };
    const content = String(body.content || '').trim();
    if (!content) return NextResponse.json({ error: 'content requerido.' }, { status: 400 });
    if (/(password|contraseñ|api[_ -]?key|secret|token|bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9_-]{10,}|sfmcp_[a-f0-9]{8,})/i.test(`${body.key || ''} ${content}`)) {
      return NextResponse.json({ error: 'La memoria no acepta contraseñas, tokens ni claves API.' }, { status: 400 });
    }
    const memory = await saveAgentMemory({ tenantId: auth.ctx.tenantId, conversationId: body.scope === 'tenant' ? null : body.conversationId || null, scope: body.scope || (body.conversationId ? 'conversation' : 'tenant'), kind: body.kind || 'fact', key: body.key || null, content, tags: body.tags || [], importance: body.importance || 3, pinned: body.pinned === true });
    return NextResponse.json({ ok: true, memory });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la memoria.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'delete' });
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });
  try {
    await deleteAgentMemory(auth.ctx.tenantId, id);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo eliminar la memoria.' }, { status: 500 });
  }
}
