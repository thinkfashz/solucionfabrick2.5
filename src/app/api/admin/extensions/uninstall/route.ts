import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as {
      slug?: unknown;
      purge?: unknown;
    };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });
    const purge = body.purge === true;

    const client = getAdminInsforge();
    let extensionId: string | null = null;

    try {
      const { data } = await client.database.from('app_extensions').select('id').eq('slug', slug).limit(1);
      if (Array.isArray(data) && data.length > 0) extensionId = (data[0] as { id?: string }).id ?? null;
    } catch {
      // Missing table is equivalent to an already-uninstalled extension.
    }

    if (!extensionId) {
      return NextResponse.json({ ok: true, uninstalled: false, note: 'No estaba instalada.' });
    }

    try {
      await client.database.from('extension_hooks').delete().eq('extension_id', extensionId);
    } catch {
      // Hooks may not exist yet.
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
