import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { EXTENSION_CATALOG } from '@/lib/extensionsCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/extensions
 *
 * Catálogo + estado del marketplace. La fuente de la verdad son las
 * filas de `app_extensions` con `status='installed'`. Para no perder
 * el catálogo demo cuando la tabla está vacía, lo mergeamos con un
 * snapshot estático en `EXTENSION_CATALOG`.
 */

interface ExtensionDef {
  slug: string;
  name: string;
  description: string;
  type: string;
  author: string;
  version: string;
  status: 'available' | 'installed';
  installed_at?: string | null;
  config?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const client = getAdminInsforge();
    let installed: ExtensionDef[] = [];
    try {
      const { data } = await client.database
        .from('app_extensions')
        .select('slug, name, description, author, version, status, config, manifest, installed_at');
      if (Array.isArray(data)) {
        installed = (data as unknown as Array<Record<string, unknown>>)
          .filter((row): row is Record<string, unknown> =>
            row != null && typeof row === 'object' && !Array.isArray(row),
          )
          .map((row) => ({
            slug: String(row.slug ?? ''),
            name: String(row.name ?? row.slug ?? ''),
            description: typeof row.description === 'string' ? row.description : '',
            type: 'webhook',
            author: typeof row.author === 'string' ? row.author : 'Comunidad',
            version: typeof row.version === 'string' ? row.version : '0.0.0',
            status: row.status === 'installed' ? 'installed' : 'available',
            installed_at: typeof row.installed_at === 'string' ? row.installed_at : null,
            config: (row.config ?? null) as Record<string, unknown> | null,
            manifest: (row.manifest ?? null) as Record<string, unknown> | null,
          }));
      }
    } catch {
      /* table missing — fall back to catalog only */
    }

    const bySlug = new Map<string, ExtensionDef>();
    for (const c of EXTENSION_CATALOG) {
      bySlug.set(c.slug, {
        slug: c.slug,
        name: c.name,
        description: c.description,
        type: c.type,
        author: c.author,
        version: c.version,
        status: 'available',
        manifest: c.manifest as unknown as Record<string, unknown>,
      });
    }
    for (const i of installed) {
      const base = bySlug.get(i.slug);
      bySlug.set(i.slug, {
        ...(base ?? {
          slug: i.slug,
          name: i.name,
          description: i.description,
          type: 'webhook',
          author: i.author,
          version: i.version,
          status: 'available',
          manifest: i.manifest,
        }),
        status: i.status,
        installed_at: i.installed_at,
        config: i.config ?? null,
        manifest: i.manifest ?? base?.manifest ?? null,
      });
    }

    return NextResponse.json({ extensions: Array.from(bySlug.values()) });
  } catch (err) {
    return adminError(err, 'EXTENSIONS_LIST_FAILED');
  }
}
