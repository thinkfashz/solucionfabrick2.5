import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  adminError,
  adminUnauthorized,
  getAdminInsforge,
  getAdminSession,
} from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/error-logs
 *
 * Devuelve los últimos errores capturados por `withErrorLogging`.
 * Query params:
 *   - limit: número de resultados (default 100, máx 500)
 *   - resolved: 'true' | 'false' para filtrar por estado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, 500)
      : 100;
    const resolvedParam = url.searchParams.get('resolved');

    const client = getAdminInsforge();
    let query = client.database
      .from('admin_error_logs')
      .select(
        'id, endpoint, method, payload, error_message, status_code, resolved, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (resolvedParam === 'true' || resolvedParam === 'false') {
      query = query.eq('resolved', resolvedParam === 'true');
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DB_ERROR',
          hint: 'Crea la tabla admin_error_logs en /admin/setup.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    return adminError(err);
  }
}

/**
 * DELETE /api/admin/error-logs?scope=resolved
 *
 * Borra todos los logs marcados como resueltos.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');
    if (scope !== 'resolved') {
      return NextResponse.json(
        { error: 'Sólo se permite borrar logs resueltos. Pasa ?scope=resolved.', code: 'BAD_SCOPE' },
        { status: 400 },
      );
    }

    const client = getAdminInsforge();
    const { error } = await client.database
      .from('admin_error_logs')
      .delete()
      .eq('resolved', true);
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'DB_ERROR' },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err);
  }
}
