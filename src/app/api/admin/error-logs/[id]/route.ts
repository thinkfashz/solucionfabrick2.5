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

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/error-logs/[id]
 * Body: { resolved: boolean }
 *
 * Marca un log como resuelto o re-abierto.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido', code: 'BAD_REQUEST' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido', code: 'BAD_JSON' }, { status: 400 });
    }
    const resolved =
      body && typeof body === 'object' && 'resolved' in body
        ? Boolean((body as { resolved: unknown }).resolved)
        : true;

    const client = getAdminInsforge();
    const { error } = await client.database
      .from('admin_error_logs')
      .update({ resolved })
      .eq('id', id);
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

/**
 * DELETE /api/admin/error-logs/[id]
 * Borra un log individual.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const client = getAdminInsforge();
    const { error } = await client.database
      .from('admin_error_logs')
      .delete()
      .eq('id', id);
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
