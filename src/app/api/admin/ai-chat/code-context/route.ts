import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { readRepoFiles, UnsafePathError } from '@/lib/repoCodeContext';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/ai-chat/code-context
 * Body: { paths: string[] }
 *
 * Lee uno o varios archivos del repo (con whitelist + protecciones de
 * traversal) y los devuelve para que el cliente los envíe como
 * contexto al modelo IA. Es admin-only.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: { paths?: unknown };
  try {
    body = (await request.json()) as { paths?: unknown };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string') : [];
  if (!paths.length) return NextResponse.json({ error: 'paths vacío' }, { status: 400 });

  try {
    const snippets = await readRepoFiles(paths);
    return NextResponse.json({ snippets });
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}
