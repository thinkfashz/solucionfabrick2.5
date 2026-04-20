import { NextRequest, NextResponse } from 'next/server';

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
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN no está configurado en el servidor.' },
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
    const pageId = body.facebookPageId || process.env.META_FACEBOOK_PAGE_ID;
    if (!pageId) {
      results.push({
        platform: 'facebook',
        ok: false,
        error: 'Falta META_FACEBOOK_PAGE_ID para publicar en Facebook.',
      });
    } else {
      // Facebook: publish the first image (covers both "photo post" and the
      // primary thumbnail in feed). Additional images are carried over as
      // URLs in the caption for now.
      results.push(await publishToFacebook(pageId, accessToken, imageUrls[0], caption));
    }
  }

  if (platforms.instagram) {
    const igId = body.instagramBusinessId || process.env.META_INSTAGRAM_BUSINESS_ID;
    if (!igId) {
      results.push({
        platform: 'instagram',
        ok: false,
        error: 'Falta META_INSTAGRAM_BUSINESS_ID para publicar en Instagram.',
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
}
