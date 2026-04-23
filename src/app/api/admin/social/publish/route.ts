import { NextRequest, NextResponse } from 'next/server';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Meta page/business account IDs are numeric strings. We enforce this shape
 * on any caller-provided override to prevent request-forgery via crafted path
 * segments (e.g. `..`, `?`, `@host`) being injected into the Graph URL.
 */
function isValidMetaId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{1,32}$/.test(value);
}

/**
 * POST /api/admin/social/publish
 *
 * Publishes a post directly to Facebook and/or Instagram via the Meta Graph
 * API. TikTok does not expose a public publishing API, so the client handles
 * that target by offering the 1080×1080 PNG download separately.
 *
 * Expected body:
 *   {
 *     imageUrls: string[],           // public URLs (InsForge Storage)
 *     caption: string,               // titulo + descripcion + hashtags (client-built)
 *     platforms: {                   // which targets are enabled
 *       instagram?: boolean,
 *       facebook?: boolean,
 *     },
 *     facebookPageId?: string,       // optional override (otherwise uses env)
 *     instagramBusinessId?: string,  // optional override (otherwise uses env)
 *   }
 *
 * Environment variables used:
 *   META_ACCESS_TOKEN             — long-lived page/business access token
 *   META_FACEBOOK_PAGE_ID         — Facebook Page ID for /{page}/photos
 *   META_INSTAGRAM_BUSINESS_ID    — Instagram Business account ID for /{ig}/media
 */

const META_API_VERSION = 'v20.0';
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

interface PublishBody {
  imageUrls?: string[];
  caption?: string;
  platforms?: { instagram?: boolean; facebook?: boolean };
  facebookPageId?: string;
  instagramBusinessId?: string;
}

interface TargetResult {
  platform: 'facebook' | 'instagram';
  ok: boolean;
  postId?: string;
  error?: string;
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
): Promise<TargetResult> {
  try {
    const url = new URL(`${META_GRAPH}/${pageId}/photos`);
    url.searchParams.set('url', imageUrl);
    url.searchParams.set('caption', caption);
    url.searchParams.set('access_token', accessToken);

    const res = await fetch(url.toString(), { method: 'POST' });
    const json = (await res.json()) as { id?: string; post_id?: string; error?: { message?: string } };

    if (!res.ok || json.error) {
      return { platform: 'facebook', ok: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { platform: 'facebook', ok: true, postId: json.post_id || json.id };
  } catch (err) {
    return { platform: 'facebook', ok: false, error: (err as Error).message };
  }
}

async function publishToInstagram(
  igBusinessId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
): Promise<TargetResult> {
  try {
    // 1) Create media container
    const createUrl = new URL(`${META_GRAPH}/${igBusinessId}/media`);
    createUrl.searchParams.set('image_url', imageUrl);
    createUrl.searchParams.set('caption', caption);
    createUrl.searchParams.set('access_token', accessToken);

    const createRes = await fetch(createUrl.toString(), { method: 'POST' });
    const createJson = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!createRes.ok || createJson.error || !createJson.id) {
      return {
        platform: 'instagram',
        ok: false,
        error: createJson.error?.message || `HTTP ${createRes.status}`,
      };
    }

    // 2) Publish the container
    const publishUrl = new URL(`${META_GRAPH}/${igBusinessId}/media_publish`);
    publishUrl.searchParams.set('creation_id', createJson.id);
    publishUrl.searchParams.set('access_token', accessToken);

    const pubRes = await fetch(publishUrl.toString(), { method: 'POST' });
    const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
    if (!pubRes.ok || pubJson.error) {
      return {
        platform: 'instagram',
        ok: false,
        error: pubJson.error?.message || `HTTP ${pubRes.status}`,
      };
    }
    return { platform: 'instagram', ok: true, postId: pubJson.id };
  } catch (err) {
    return { platform: 'instagram', ok: false, error: (err as Error).message };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated admin session. Also ensures only trusted callers
    // can influence the Graph URL path segments below.
    const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
    const session = cookie?.value ? await decodeSession(cookie.value) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const creds = await getMetaCredentials();
    const accessToken = creds?.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            'Falta el access token de Meta. Configura META_ACCESS_TOKEN en el servidor o guarda el token en /admin/configuracion (proveedor Meta).',
          code: 'META_ACCESS_TOKEN_MISSING',
        },
        { status: 503 },
      );
    }

    let body: PublishBody;
    try {
      body = (await request.json()) as PublishBody;
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    const imageUrls = (body.imageUrls ?? []).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos una imagen con URL pública.' },
        { status: 400 },
      );
    }
    const caption = (body.caption ?? '').toString().slice(0, 2200);
    const platforms = body.platforms ?? {};

    const results: TargetResult[] = [];

    if (platforms.facebook) {
      const overridePage = body.facebookPageId;
      // Only honor overrides that match the strict numeric-ID shape.
      const pageId = (overridePage && isValidMetaId(overridePage) ? overridePage : undefined)
        || creds?.facebookPageId;
      if (overridePage && !isValidMetaId(overridePage)) {
        results.push({
          platform: 'facebook',
          ok: false,
          error: 'facebookPageId inválido: debe ser un ID numérico.',
        });
      } else if (!pageId || !isValidMetaId(pageId)) {
        results.push({
          platform: 'facebook',
          ok: false,
          error:
            'Falta Facebook Page ID válido. Configura META_FACEBOOK_PAGE_ID o el campo "Facebook Page ID" en /admin/configuracion.',
        });
      } else {
        // Facebook: publish the first image (covers both "photo post" and the
        // primary thumbnail in feed). Additional images are carried over as
        // URLs in the caption for now.
        results.push(await publishToFacebook(pageId, accessToken, imageUrls[0], caption));
      }
    }

    if (platforms.instagram) {
      const overrideIg = body.instagramBusinessId;
      const igId = (overrideIg && isValidMetaId(overrideIg) ? overrideIg : undefined)
        || creds?.instagramBusinessId;
      if (overrideIg && !isValidMetaId(overrideIg)) {
        results.push({
          platform: 'instagram',
          ok: false,
          error: 'instagramBusinessId inválido: debe ser un ID numérico.',
        });
      } else if (!igId || !isValidMetaId(igId)) {
        results.push({
          platform: 'instagram',
          ok: false,
          error:
            'Falta Instagram Business ID válido. Configura META_INSTAGRAM_BUSINESS_ID o el campo "Instagram Business ID" en /admin/configuracion.',
        });
      } else {
        // Instagram single-image publishing. Carousel is out of scope for MVP.
        results.push(await publishToInstagram(igId, accessToken, imageUrls[0], caption));
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No seleccionaste ninguna plataforma con API de publicación.' },
        { status: 400 },
      );
    }

    const anyOk = results.some((r) => r.ok);
    return NextResponse.json({ ok: anyOk, results }, { status: anyOk ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error inesperado al publicar.',
        code: 'PUBLISH_FAILED',
      },
      { status: 500 },
    );
  }
}
