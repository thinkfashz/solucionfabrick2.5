import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getAgentConversation, listAgentConversations } from '@/lib/agentMemory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id')?.trim();
  try {
    if (id) {
      const state = await getAgentConversation(auth.ctx.tenantId, id);
      if (!state) return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
      return NextResponse.json({ ok: true, ...state }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
    const conversations = await listAgentConversations(auth.ctx.tenantId, 80);
    return NextResponse.json({ ok: true, conversations }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el historial.' }, { status: 500 });
  }
}
