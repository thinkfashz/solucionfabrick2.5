import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getMetaCredentials } from '@/lib/metaCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/integrations/test?provider=meta
 *
 * Pings the upstream API for the given provider using the currently resolved
 * credentials (env + integrations table fallback) and returns a concrete
 * diagnostic. Lets the admin UI show something more useful than "no conecta".
 *
 * Only `meta` is supported for now because it's the only provider with a
 * publishing endpoint wired up in the app. Additional providers can be added
 * as new branches.
 */

const META_API_VERSION = 'v20.0';
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

interface DiagnosticCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

async function graphGet(path: string, accessToken: string) {
  const url = new URL(`${META_GRAPH}${path}`);
  url.searchParams.set('access_token', accessToken);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; type?: string };
    [k: string]: unknown;
  };
  return { res, json };
}

async function testMeta(): Promise<NextResponse> {
  const creds = await getMetaCredentials();
  const checks: DiagnosticCheck[] = [];

  // --- 1) Access token present? ---
  if (!creds?.accessToken) {
    return NextResponse.json({
      ok: false,
      provider: 'meta',
      error:
        'No hay access token configurado. Guarda tus credenciales en /admin/configuracion (proveedor Meta) o define META_ACCESS_TOKEN en el servidor.',
      checks: [{ name: 'Access token', ok: false, detail: 'No configurado.' }],
      sources: creds?.sources ?? {},
    });
  }

  // --- 2) Token válido (ping a /me) ---
  try {
    const { res, json } = await graphGet('/me?fields=id,name', creds.accessToken);
    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `HTTP ${res.status}`;
      return NextResponse.json({
        ok: false,
        provider: 'meta',
        error: `Access token inválido o expirado: ${msg}`,
        checks: [
          { name: 'Access token válido', ok: false, detail: msg },
        ],
        sources: creds.sources,
      });
    }
    checks.push({
      name: 'Access token válido',
      ok: true,
      detail: `Conectado como ${(json.name as string) || (json.id as string) || 'usuario'} (fuente: ${creds.sources.accessToken}).`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      provider: 'meta',
      error: `Error de red al contactar Meta: ${err instanceof Error ? err.message : String(err)}`,
      checks: [{ name: 'Access token válido', ok: false, detail: 'Error de red.' }],
      sources: creds.sources,
    });
  }

  // --- 3) Facebook Page (si está configurada) ---
  if (creds.facebookPageId) {
    try {
      const { res, json } = await graphGet(
        `/${encodeURIComponent(creds.facebookPageId)}?fields=id,name`,
        creds.accessToken,
      );
      if (!res.ok || json.error) {
        checks.push({
          name: 'Facebook Page',
          ok: false,
          detail: json.error?.message ?? `HTTP ${res.status}. Verifica que el token tenga permisos sobre la página.`,
        });
      } else {
        checks.push({
          name: 'Facebook Page',
          ok: true,
          detail: `Página accesible: ${(json.name as string) || creds.facebookPageId} (fuente: ${creds.sources.facebookPageId}).`,
        });
      }
    } catch (err) {
      checks.push({
        name: 'Facebook Page',
        ok: false,
        detail: err instanceof Error ? err.message : 'Error de red.',
      });
    }
  } else {
    checks.push({
      name: 'Facebook Page',
      ok: false,
      detail: 'No configurada (opcional si sólo publicas en Instagram).',
    });
  }

  // --- 4) Instagram Business (si está configurada) ---
  if (creds.instagramBusinessId) {
    try {
      const { res, json } = await graphGet(
        `/${encodeURIComponent(creds.instagramBusinessId)}?fields=id,username`,
        creds.accessToken,
      );
      if (!res.ok || json.error) {
        checks.push({
          name: 'Instagram Business',
          ok: false,
          detail: json.error?.message ?? `HTTP ${res.status}. Verifica que el ID y permisos sean correctos.`,
        });
      } else {
        checks.push({
          name: 'Instagram Business',
          ok: true,
          detail: `Cuenta accesible: @${(json.username as string) || creds.instagramBusinessId} (fuente: ${creds.sources.instagramBusinessId}).`,
        });
      }
    } catch (err) {
      checks.push({
        name: 'Instagram Business',
        ok: false,
        detail: err instanceof Error ? err.message : 'Error de red.',
      });
    }
  } else {
    checks.push({
      name: 'Instagram Business',
      ok: false,
      detail: 'No configurado (opcional si sólo publicas en Facebook).',
    });
  }

  const anyBlocking = checks.some((c) => c.name === 'Access token válido' && !c.ok);
  return NextResponse.json({
    ok: !anyBlocking,
    provider: 'meta',
    checks,
    sources: creds.sources,
  });
}

async function testCloudinary(): Promise<NextResponse> {
  // Read credentials directly from the integrations table so we test what's
  // actually persisted (not the form state).
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return NextResponse.json({
      ok: false,
      provider: 'cloudinary',
      error: 'InsForge no configurado en el servidor.',
      checks: [{ name: 'InsForge', ok: false, detail: 'NEXT_PUBLIC_INSFORGE_URL/ANON_KEY ausentes.' }],
    });
  }

  let cloudName = '';
  let apiKey = '';
  let apiSecret = '';
  try {
    const { createClient } = await import('@insforge/sdk');
    const client = createClient({ baseUrl, anonKey });
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'cloudinary')
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      const creds = (data[0] as { credentials?: Record<string, string> }).credentials ?? {};
      cloudName = creds.cloud_name ?? '';
      apiKey = creds.api_key ?? '';
      apiSecret = creds.api_secret ?? '';
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      provider: 'cloudinary',
      error: `Error leyendo integrations: ${err instanceof Error ? err.message : String(err)}`,
      checks: [{ name: 'Lectura integrations', ok: false }],
    });
  }

  const checks: DiagnosticCheck[] = [];
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({
      ok: false,
      provider: 'cloudinary',
      error: 'Cloudinary no configurado. Guarda cloud_name, api_key y api_secret en /admin/configuracion.',
      checks: [
        { name: 'cloud_name', ok: !!cloudName },
        { name: 'api_key', ok: !!apiKey },
        { name: 'api_secret', ok: !!apiSecret },
      ],
    });
  }

  if (cloudName.toLowerCase() === 'root') {
    checks.push({
      name: 'cloud_name',
      ok: false,
      detail: '"Root" es el Product Environment, no el cloud name. Búscalo en Settings → API Keys.',
    });
    return NextResponse.json({ ok: false, provider: 'cloudinary', error: '"Root" no es un cloud name válido.', checks });
  }

  // Ping the Admin API /usage endpoint, which requires both cloud_name and
  // valid api_key:api_secret Basic auth.
  try {
    const pingUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/usage`;
    const basicAuth = btoa(`${apiKey}:${apiSecret}`);
    const res = await fetch(pingUrl, {
      headers: { Authorization: `Basic ${basicAuth}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      let upstreamMessage = '';
      try {
        const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
        upstreamMessage = parsed.error?.message ?? '';
      } catch {
        upstreamMessage = bodyText.slice(0, 200);
      }
      checks.push({
        name: 'Cloudinary /usage',
        ok: false,
        detail: `HTTP ${res.status}: ${upstreamMessage || 'sin detalle'}`,
      });
      return NextResponse.json({
        ok: false,
        provider: 'cloudinary',
        error: `Cloudinary rechazó las credenciales: ${upstreamMessage || `HTTP ${res.status}`}.`,
        checks,
      });
    }
    checks.push({ name: 'Cloudinary /usage', ok: true, detail: `Conectado a cloud "${cloudName}".` });
    return NextResponse.json({ ok: true, provider: 'cloudinary', checks });
  } catch (err) {
    checks.push({
      name: 'Cloudinary /usage',
      ok: false,
      detail: err instanceof Error ? err.message : 'Error de red.',
    });
    return NextResponse.json({
      ok: false,
      provider: 'cloudinary',
      error: `Error de red al contactar Cloudinary: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const provider = new URL(request.url).searchParams.get('provider') ?? '';
    if (provider === 'meta') {
      return await testMeta();
    }
    if (provider === 'cloudinary') {
      return await testCloudinary();
    }
    return NextResponse.json(
      { error: `Proveedor no soportado para test: ${provider || '(vacío)'}.` },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error inesperado.',
        code: 'INTEGRATIONS_TEST_FAILED',
      },
      { status: 500 },
    );
  }
}
