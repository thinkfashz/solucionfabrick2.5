import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Obtiene hilo + mensajes ordenados. */
export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const { id } = await ctx.params;

  try {
    const client = getAdminInsforge();
    const { data: thread } = await client.database
      .from('ai_chat_threads')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (!thread) return NextResponse.json({ error: 'no encontrado' }, { status: 404 });
    const { data: messages } = await client.database
      .from('ai_chat_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .limit(500);
    return NextResponse.json({ thread, messages: messages ?? [] });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const { id } = await ctx.params;
  try {
    const client = getAdminInsforge();
    await client.database.from('ai_chat_messages').delete().eq('thread_id', id);
    await client.database.from('ai_chat_threads').delete().eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}
