import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ReorderInput {
  order?: Array<{ id: string; position: number }>;
}

/**
 * PATCH /api/admin/home/sections/reorder
 * Body: { order: [{ id, position }, ...] }
 *
 * Persists contiguous positions per the supplied id list. The client always
 * sends the full ordered list to keep the operation idempotent.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const body = (await request.json().catch(() => ({}))) as ReorderInput;
    const order = Array.isArray(body.order) ? body.order : [];
    if (order.length === 0) {
      return NextResponse.json({ error: 'Lista vacía.', code: 'VALIDATION' }, { status: 400 });
    }

    const client = getAdminInsforge();
    const now = new Date().toISOString();
    const errors: Array<{ id: string; error: string }> = [];
    for (let i = 0; i < order.length; i += 1) {
      const item = order[i];
      if (!item || typeof item.id !== 'string') continue;
      const position = typeof item.position === 'number' ? item.position : i;
      const { error } = await client.database
        .from('home_sections')
        .update({ position, updated_at: now })
        .eq('id', item.id);
      if (error) errors.push({ id: item.id, error: error.message });
    }
    try {
      revalidatePath('/');
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'home', action: 'reorder', paths: ['/'] });
    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors, code: 'PARTIAL' }, { status: 207 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'HOME_REORDER_FAILED');
  }
}
