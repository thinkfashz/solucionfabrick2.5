import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/extensions/uninstall
 *
 * Body: { slug: string }
 *
 * Elimina los hooks asociados y marca la fila de la extensión como
 * `available` (no se borra la fila para conservar el historial de
 * configuración). Si pasamos `purge: true` también elimina la fila.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      slug?: unknown;
      purge?: unknown;
    };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });
    }
    const purge = body.purge === true;

    const client = getAdminInsforge();

    // Find the extension to get its id (so we can delete hooks).
    let extensionId: string | null = null;
    try {
      const { data } = await client.database
        .from('app_extensions')
        .select('id')
        .eq('slug', slug)
        .limit(1);
      if (Array.isArray(data) && data.length > 0) {
        extensionId = (data[0] as { id?: string }).id ?? null;
      }
    } catch {
      /* table missing — treat as already uninstalled */
    }

    if (!extensionId) {
      // Idempotent: nothing to uninstall.
      return NextResponse.json({ ok: true, uninstalled: false, note: 'No estaba instalada.' });
    }

    // Always remove hooks — even when keeping the row — so the bus
    // immediately stops dispatching to the extension.
    try {
      await client.database.from('extension_hooks').delete().eq('extension_id', extensionId);
    } catch {
      /* ignore */
    }

    if (purge) {
      try {
        await client.database.from('app_extensions').delete().eq('id', extensionId);
      } catch (err) {
        return adminError(err, 'EXTENSION_UNINSTALL_DELETE_FAILED');
      }
    } else {
      try {
        await client.database
          .from('app_extensions')
          .update({ status: 'available', installed_at: null })
          .eq('id', extensionId);
      } catch (err) {
        return adminError(err, 'EXTENSION_UNINSTALL_UPDATE_FAILED');
      }
    }

    return NextResponse.json({ ok: true, uninstalled: true, purged: purge });
  } catch (err) {
    return adminError(err, 'EXTENSION_UNINSTALL_FAILED');
  }
}
