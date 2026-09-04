import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getConversationMarkdown } from '@/lib/agentMemory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });
  try {
    const markdown = await getConversationMarkdown(auth.ctx.tenantId, id);
    if (markdown === null) return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="fabrick-agent-${id.slice(0, 8)}.md"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo exportar Markdown.' }, { status: 500 });
  }
}
