import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Lista hilos del usuario admin (todos los admins comparten — es admin tooling). */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('ai_chat_threads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) return adminError(error.message ?? 'Error', 'INTERNAL_ERROR', 500);
    return NextResponse.json({ threads: data ?? [] });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

interface CreateBody {
  title?: unknown;
  model?: unknown;
  system_prompt?: unknown;
  preset_key?: unknown;
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('ai_chat_threads')
      .insert([
        {
          title: typeof body.title === 'string' ? body.title.trim().slice(0, 200) : 'Nueva conversación',
          model: typeof body.model === 'string' ? body.model.slice(0, 200) : null,
          system_prompt: typeof body.system_prompt === 'string' ? body.system_prompt.slice(0, 8000) : null,
          preset_key: typeof body.preset_key === 'string' ? body.preset_key.slice(0, 50) : null,
          created_by: session.email ?? null,
        },
      ])
      .select('*')
      .limit(1);
    if (error) return adminError(error.message ?? 'Error', 'INTERNAL_ERROR', 500);
    return NextResponse.json({ thread: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}
