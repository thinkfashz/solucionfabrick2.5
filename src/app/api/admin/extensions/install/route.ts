import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getExtensionFromCatalog } from '@/lib/extensionsCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as {
      slug?: unknown;
      config?: unknown;
    };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });

    const entry = getExtensionFromCatalog(slug);
    if (!entry) return NextResponse.json({ error: 'Extensión no encontrada en el catálogo.' }, { status: 404 });

    const config = body.config && typeof body.config === 'object' && !Array.isArray(body.config)
      ? (body.config as Record<string, unknown>)
      : {};

    const client = getAdminInsforge();
    const installedAt = new Date().toISOString();
    let extensionId: string | null = null;

    try {
      const { data: upserted } = await client.database
        .from('app_extensions')
        .upsert([
          {
            slug: entry.slug,
            name: entry.name,
            description: entry.description,
            author: entry.author,
            version: entry.version,
            status: 'installed',
            config,
            manifest: entry.manifest,
            installed_at: installedAt,
          },
        ], { onConflict: 'slug' })
        .select('id')
        .limit(1);

      if (Array.isArray(upserted) && upserted.length > 0) {
        extensionId = (upserted[0] as { id?: string }).id ?? null;
      }
    } catch (err) {
      return adminError(err, 'EXTENSION_INSTALL_UPSERT_FAILED');
    }

    if (!extensionId) {
      try {
        const { data } = await client.database.from('app_extensions').select('id').eq('slug', entry.slug).limit(1);
        if (Array.isArray(data) && data.length > 0) extensionId = (data[0] as { id?: string }).id ?? null;
      } catch {
        // handled below
      }
    }

    if (!extensionId) {
      return NextResponse.json({ error: 'No se pudo obtener el id de la extensión instalada.' }, { status: 500 });
    }

    try {
      await client.database.from('extension_hooks').delete().eq('extension_id', extensionId);
    } catch {
      // Missing/empty hook table does not prevent installation.
    }

    const hooks = entry.manifest.hooks ?? [];
    if (hooks.length > 0) {
      try {
        await client.database.from('extension_hooks').insert(
          hooks.map((hook) => ({
            extension_id: extensionId,
            hook: hook.hook,
            handler: hook.handler,
            enabled: true,
            priority: typeof hook.priority === 'number' ? hook.priority : 100,
            config: hook.config ?? {},
          })),
        );
      } catch (err) {
        return adminError(err, 'EXTENSION_HOOK_INSERT_FAILED');
      }
    }

    return NextResponse.json({
      ok: true,
      extension: { id: extensionId, slug: entry.slug, status: 'installed', installed_at: installedAt },
      hooks_registered: hooks.length,
    });
  } catch (err) {
    return adminError(err, 'EXTENSION_INSTALL_FAILED');
  }
}
