import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DatabaseError = { message?: string; code?: string; hint?: string } | null;
type JsonRecord = Record<string, unknown>;

const MAX_MEDIA = 350;

function responseError(error: DatabaseError, fallback = 'No se pudo guardar el catálogo.') {
  const message = error?.message || fallback;
  const relationMissing = error?.code === '42P01' || /relation .* does not exist|no existe la relación/i.test(message);
  return NextResponse.json(
    {
      error: relationMissing
        ? 'El catálogo de proyectos aún no está preparado. Ejecuta la configuración de tablas desde el admin.'
        : message,
      code: relationMissing ? 'CATALOG_NOT_READY' : 'CATALOG_DATABASE_ERROR',
      setupRequired: relationMissing,
    },
    { status: relationMissing ? 503 : 500 },
  );
}

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringList(value: unknown, maxItems = 20, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((item) => text(item, maxLength))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function socialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const key of ['instagram', 'facebook', 'pinterest', 'whatsapp']) {
    const candidate = text((value as JsonRecord)[key], 500);
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') result[key] = url.toString();
    } catch {
      // Keep a malformed social link out of the public payload.
    }
  }
  return result;
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(9999, Math.max(-9999, Math.round(parsed))) : fallback;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function mediaPayload(input: JsonRecord, existing?: JsonRecord) {
  const publicId = text(input.public_id ?? existing?.public_id, 240);
  const cloudinaryUrl = text(input.cloudinary_url ?? existing?.cloudinary_url, 1200);
  if (!publicId || !cloudinaryUrl) return { error: 'La imagen seleccionada no tiene un identificador o URL válida.' as const };

  return {
    data: {
      public_id: publicId,
      cloudinary_url: cloudinaryUrl,
      folder: text(input.folder ?? existing?.folder, 100) || 'fabrick/proyectos',
      category_slug: slug(text(input.category_slug ?? existing?.category_slug, 100)) || 'ideas',
      title: text(input.title ?? existing?.title, 180),
      story: text(input.story ?? existing?.story, 5000),
      description: text(input.description ?? existing?.description, 5000),
      seo_title: text(input.seo_title ?? existing?.seo_title, 120),
      seo_description: text(input.seo_description ?? existing?.seo_description, 320),
      keywords: stringList(input.keywords ?? existing?.keywords, 24, 70),
      social: socialLinks(input.social ?? existing?.social),
      is_favorite: boolean(input.is_favorite, Boolean(existing?.is_favorite)),
      is_published: boolean(input.is_published, existing?.is_published !== false),
      sort_order: number(input.sort_order, number(existing?.sort_order, 0)),
      updated_at: new Date().toISOString(),
    },
  };
}

async function requireAdmin(request: NextRequest) {
  const session = await getAdminSession(request);
  return session ? true : false;
}

/**
 * Private catalog used by /admin/proyectos.
 * It deliberately lives beside, rather than inside, the public Cloudinary route:
 * Cloudinary remains the image source of truth and an unavailable metadata table
 * never prevents the public inspiration gallery from rendering.
 */
export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return adminUnauthorized();

    const client = getAdminInsforge();
    const [categoriesResult, mediaResult, commentsResult] = await Promise.all([
      client.database.from('project_categories').select('*').order('sort_order', { ascending: true }).limit(100),
      client.database.from('project_media').select('*').order('is_favorite', { ascending: false }).order('updated_at', { ascending: false }).limit(MAX_MEDIA),
      client.database.from('project_media_comments').select('*').order('created_at', { ascending: false }).limit(1000),
    ]);

    const failure = [categoriesResult, mediaResult, commentsResult]
      .map((result) => result.error as DatabaseError)
      .find(Boolean);
    if (failure) return responseError(failure);

    return NextResponse.json({
      ready: true,
      categories: categoriesResult.data || [],
      media: mediaResult.data || [],
      comments: commentsResult.data || [],
    });
  } catch (error) {
    return adminError(error, 'PROJECT_STUDIO_LIST_FAILED', 500, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return adminUnauthorized();
    const body = record(await request.json().catch(() => ({})));
    const action = text(body.action, 40);
    const input = record(body.data);
    const client = getAdminInsforge();

    if (action === 'category') {
      const name = text(input.name, 80);
      const categorySlug = slug(text(input.slug, 80) || name);
      if (!name || !categorySlug) {
        return NextResponse.json({ error: 'Indica un nombre válido para la categoría.' }, { status: 422 });
      }
      const { data, error } = await client.database.from('project_categories').insert([{
        name,
        slug: categorySlug,
        description: text(input.description, 280),
        color: text(input.color, 24) || '#FDE047',
        sort_order: number(input.sort_order, 0),
      }]);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === 'media') {
      const payload = mediaPayload(input);
      if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: 422 });

      const existingResult = await client.database
        .from('project_media')
        .select('*')
        .eq('public_id', payload.data.public_id)
        .limit(1);
      if (existingResult.error) return responseError(existingResult.error as DatabaseError);
      const existing = Array.isArray(existingResult.data) ? existingResult.data[0] as JsonRecord | undefined : undefined;
      const completePayload = mediaPayload(input, existing);
      if ('error' in completePayload) return NextResponse.json({ error: completePayload.error }, { status: 422 });

      if (existing?.id) {
        const { data, error } = await client.database.from('project_media').update(completePayload.data).eq('id', existing.id);
        if (error) return responseError(error as DatabaseError);
        return NextResponse.json({ data, created: false });
      }
      const { data, error } = await client.database.from('project_media').insert([completePayload.data]);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data, created: true }, { status: 201 });
    }

    if (action === 'comment') {
      const mediaId = text(input.media_id, 80);
      const bodyText = text(input.body, 1200);
      if (!mediaId || !bodyText) {
        return NextResponse.json({ error: 'Escribe un comentario antes de enviarlo.' }, { status: 422 });
      }
      const { data, error } = await client.database.from('project_media_comments').insert([{
        media_id: mediaId,
        author_name: text(input.author_name, 80) || 'Equipo Fabrick',
        body: bodyText,
        is_resolved: false,
      }]);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción de catálogo no reconocida.' }, { status: 400 });
  } catch (error) {
    return adminError(error, 'PROJECT_STUDIO_CREATE_FAILED', 500, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return adminUnauthorized();
    const body = record(await request.json().catch(() => ({})));
    const entity = text(body.entity, 40);
    const id = text(body.id, 100);
    const input = record(body.data);
    if (!id) return NextResponse.json({ error: 'Falta el identificador del registro.' }, { status: 422 });
    const client = getAdminInsforge();

    if (entity === 'media') {
      const existingResult = await client.database.from('project_media').select('*').eq('id', id).limit(1);
      if (existingResult.error) return responseError(existingResult.error as DatabaseError);
      const existing = Array.isArray(existingResult.data) ? existingResult.data[0] as JsonRecord | undefined : undefined;
      if (!existing) return NextResponse.json({ error: 'No encontramos esa imagen en el catálogo.' }, { status: 404 });
      const payload = mediaPayload(input, existing);
      if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: 422 });
      const { data, error } = await client.database.from('project_media').update(payload.data).eq('id', id);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data });
    }

    if (entity === 'comment') {
      const patch: JsonRecord = {};
      if (typeof input.is_resolved === 'boolean') patch.is_resolved = input.is_resolved;
      if (typeof input.body === 'string') patch.body = text(input.body, 1200);
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 422 });
      const { data, error } = await client.database.from('project_media_comments').update(patch).eq('id', id);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data });
    }

    if (entity === 'category') {
      const patch: JsonRecord = { updated_at: new Date().toISOString() };
      if (typeof input.name === 'string') patch.name = text(input.name, 80);
      if (typeof input.description === 'string') patch.description = text(input.description, 280);
      if (typeof input.color === 'string') patch.color = text(input.color, 24);
      if (input.sort_order !== undefined) patch.sort_order = number(input.sort_order, 0);
      const { data, error } = await client.database.from('project_categories').update(patch).eq('id', id);
      if (error) return responseError(error as DatabaseError);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Entidad de catálogo no reconocida.' }, { status: 400 });
  } catch (error) {
    return adminError(error, 'PROJECT_STUDIO_UPDATE_FAILED', 500, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return adminUnauthorized();
    const url = new URL(request.url);
    const entity = text(url.searchParams.get('entity'), 40);
    const id = text(url.searchParams.get('id'), 100);
    if (!id) return NextResponse.json({ error: 'Falta el identificador del registro.' }, { status: 422 });
    const table = entity === 'comment'
      ? 'project_media_comments'
      : entity === 'category'
        ? 'project_categories'
        : entity === 'media'
          ? 'project_media'
          : '';
    if (!table) return NextResponse.json({ error: 'Entidad de catálogo no reconocida.' }, { status: 400 });
    const { error } = await getAdminInsforge().database.from(table).delete().eq('id', id);
    if (error) return responseError(error as DatabaseError);
    // Deleting media here only removes editorial metadata. It never destroys the
    // Cloudinary original, which prevents an accidental admin action from blanking
    // the public gallery.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminError(error, 'PROJECT_STUDIO_DELETE_FAILED', 500, request);
  }
}
