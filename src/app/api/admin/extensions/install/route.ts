import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { getExtensionFromCatalog } from '@/lib/extensionsCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/extensions/install
 *
 * Body: { slug: string, config?: Record<string, unknown> }
 *
 * Inserta (o actualiza) `app_extensions` marcando la extensión como
 * instalada y materializa sus hooks en `extension_hooks`. La operación
 * es idempotente: si ya estaba instalada, refresca config y vuelve a
 * sincronizar los hooks (borra los previos, inserta los del manifest).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      slug?: unknown;
      config?: unknown;
    };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      return NextResponse.json({ error: 'slug requerido.' }, { status: 400 });
    }
    const entry = getExtensionFromCatalog(slug);
    if (!entry) {
      return NextResponse.json({ error: 'Extensión no encontrada en el catálogo.' }, { status: 404 });
    }
    const config =
      body.config && typeof body.config === 'object' && !Array.isArray(body.config)
        ? (body.config as Record<string, unknown>)
        : {};

    const client = getAdminInsforge();
    const installedAt = new Date().toISOString();

    // Upsert the extension row. We rely on the unique index on slug to
    // make this idempotent (`onConflict: 'slug'` matches the index in
    // scripts/create-tables.sql → `app_extensions_slug_idx`).
    let extensionId: string | null = null;
    try {
      const { data: upserted } = await client.database
        .from('app_extensions')
        .upsert(
          [
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
          ],
          { onConflict: 'slug' },
        )
        .select('id')
        .limit(1);
      if (Array.isArray(upserted) && upserted.length > 0) {
        extensionId = (upserted[0] as { id?: string }).id ?? null;
      }
    } catch (err) {
      return adminError(err, 'EXTENSION_INSTALL_UPSERT_FAILED');
    }

    // Some PostgREST setups don't return rows from upserts when the row
    // already exists — fall back to a follow-up SELECT in that case.
    if (!extensionId) {
      try {
        const { data } = await client.database
          .from('app_extensions')
          .select('id')
          .eq('slug', entry.slug)
          .limit(1);
        if (Array.isArray(data) && data.length > 0) {
          extensionId = (data[0] as { id?: string }).id ?? null;
        }
      } catch {
        /* ignore */
      }
    }

    if (!extensionId) {
      return NextResponse.json(
        { error: 'No se pudo obtener el id de la extensión instalada.' },
        { status: 500 },
      );
    }

    // Re-sync hooks: delete existing then insert the manifest's hooks.
    try {
      await client.database.from('extension_hooks').delete().eq('extension_id', extensionId);
    } catch {
      /* table might be empty or missing — ignore */
    }
    const hooks = entry.manifest.hooks ?? [];
    if (hooks.length > 0) {
      try {
        await client.database.from('extension_hooks').insert(
          hooks.map((h) => ({
            extension_id: extensionId,
            hook: h.hook,
            handler: h.handler,
            enabled: true,
            priority: typeof h.priority === 'number' ? h.priority : 100,
            config: h.config ?? {},
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
