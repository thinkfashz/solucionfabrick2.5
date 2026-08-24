import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { EXTENSION_CATALOG } from '@/lib/extensionsCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ExtensionDef {
  slug: string;
  name: string;
  description: string;
  type: string;
  author: string;
  version: string;
  status: 'available' | 'installed';
  installed_at?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
    if (!auth.ok) return auth.response;

    const client = getAdminInsforge();
    let installed: ExtensionDef[] = [];

    try {
      const { data } = await client.database
        .from('app_extensions')
        .select('slug, name, description, author, version, status, installed_at');

      if (Array.isArray(data)) {
        installed = (data as unknown as Array<Record<string, unknown>>)
          .filter((row): row is Record<string, unknown> => row != null && typeof row === 'object' && !Array.isArray(row))
          .map((row) => ({
            slug: String(row.slug ?? ''),
            name: String(row.name ?? row.slug ?? ''),
            description: typeof row.description === 'string' ? row.description : '',
            type: 'webhook',
            author: typeof row.author === 'string' ? row.author : 'Comunidad',
            version: typeof row.version === 'string' ? row.version : '0.0.0',
            status: row.status === 'installed' ? 'installed' : 'available',
            installed_at: typeof row.installed_at === 'string' ? row.installed_at : null,
          }));
      }
    } catch {
      // The catalog remains available when the persistence tables are not present yet.
    }

    const bySlug = new Map<string, ExtensionDef>();
    for (const entry of EXTENSION_CATALOG) {
      bySlug.set(entry.slug, {
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        type: entry.type,
        author: entry.author,
        version: entry.version,
        status: 'available',
        installed_at: null,
      });
    }

    for (const row of installed) {
      const catalog = bySlug.get(row.slug);
      bySlug.set(row.slug, {
        slug: row.slug,
        name: catalog?.name ?? row.name,
        description: catalog?.description ?? row.description,
        type: catalog?.type ?? row.type,
        author: catalog?.author ?? row.author,
        version: catalog?.version ?? row.version,
        status: row.status,
        installed_at: row.installed_at ?? null,
      });
    }

    return NextResponse.json({
      extensions: Array.from(bySlug.values()),
      canManage: auth.role === 'superadmin',
    });
  } catch (err) {
    return adminError(err, 'EXTENSIONS_LIST_FAILED');
  }
}
