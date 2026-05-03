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

/**
 * Reads the credentials JSONB row for a given provider from the InsForge
 * `integrations` table. Returns an empty object if the row is missing or the
 * server isn't configured. Centralised so each provider test stays small.
 */
async function readIntegrationCredentials(provider: string): Promise<Record<string, string>> {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.INSFORGE_API_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return {};
  try {
    const { createClient } = await import('@insforge/sdk');
    const client = createClient({ baseUrl, anonKey });
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', provider)
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as { credentials?: Record<string, string> };
      return row.credentials ?? {};
    }
  } catch {
    /* fall through */
  }
  return {};
}

async function testTikTok(): Promise<NextResponse> {
  const creds = await readIntegrationCredentials('tiktok');
  const token = (creds.access_token ?? '').trim();
  const advertiserId = (creds.advertiser_id ?? '').trim();
  const checks: DiagnosticCheck[] = [];
  if (!token) {
    return NextResponse.json({
      ok: false,
      provider: 'tiktok',
      error: 'TikTok no configurado. Guarda `access_token` en /admin/configuracion.',
      checks: [{ name: 'access_token', ok: false, detail: 'No configurado.' }],
    });
  }
  try {
    const url = new URL('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/');
    if (advertiserId) {
      url.searchParams.set('advertiser_ids', JSON.stringify([advertiserId]));
      url.searchParams.set('fields', JSON.stringify(['name', 'status']));
    }
    const res = await fetch(url.toString(), {
      headers: { 'Access-Token': token, Accept: 'application/json' },
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string; data?: unknown };
    if (!res.ok || (typeof json.code === 'number' && json.code !== 0)) {
      checks.push({
        name: 'TikTok advertiser/info',
        ok: false,
        detail: `${json.message ?? `HTTP ${res.status}`}`,
      });
      return NextResponse.json({
        ok: false,
        provider: 'tiktok',
        error: `TikTok rechazó el token: ${json.message ?? `HTTP ${res.status}`}.`,
        checks,
      });
    }
    checks.push({ name: 'TikTok advertiser/info', ok: true, detail: 'Token válido.' });
    return NextResponse.json({ ok: true, provider: 'tiktok', checks });
  } catch (err) {
    checks.push({
      name: 'TikTok advertiser/info',
      ok: false,
      detail: err instanceof Error ? err.message : 'Error de red.',
    });
    return NextResponse.json({
      ok: false,
      provider: 'tiktok',
      error: `Error de red al contactar TikTok: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

async function testGoogle(): Promise<NextResponse> {
  // For plain Google APIs we validate the OAuth refresh token by exchanging
  // it for an access token. That's the most common failure mode and doesn't
  // require any extra scope/permission.
  const creds = await readIntegrationCredentials('google');
  const checks: DiagnosticCheck[] = [];
  const clientId = (creds.client_id ?? '').trim();
  const clientSecret = (creds.client_secret ?? '').trim();
  const refreshToken = (creds.refresh_token ?? '').trim();
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({
      ok: false,
      provider: 'google',
      error: 'Faltan credenciales OAuth de Google (client_id, client_secret, refresh_token).',
      checks: [
        { name: 'client_id', ok: !!clientId },
        { name: 'client_secret', ok: !!clientSecret },
        { name: 'refresh_token', ok: !!refreshToken },
      ],
    });
  }
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      const detail = json.error_description ?? json.error ?? `HTTP ${res.status}`;
      checks.push({ name: 'OAuth refresh', ok: false, detail });
      return NextResponse.json({
        ok: false,
        provider: 'google',
        error: `Google rechazó el refresh_token: ${detail}.`,
        checks,
      });
    }
    checks.push({ name: 'OAuth refresh', ok: true, detail: 'Refresh token válido.' });
    return NextResponse.json({ ok: true, provider: 'google', checks });
  } catch (err) {
    checks.push({ name: 'OAuth refresh', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'google',
      error: `Error de red al contactar Google: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

async function testGoogleAds(): Promise<NextResponse> {
  // Reuses the same secret set used by the POST validation block — we just
  // re-run it here so the operator can re-test after any rotation.
  const creds = await readIntegrationCredentials('google_ads');
  const checks: DiagnosticCheck[] = [];
  const developerToken = (creds.developer_token ?? '').trim();
  const clientId = (creds.client_id ?? '').trim();
  const clientSecret = (creds.client_secret ?? '').trim();
  const refreshToken = (creds.refresh_token ?? '').trim();
  const customerId = (creds.customer_id ?? '').replace(/-/g, '').trim();
  const loginCustomerId = (creds.login_customer_id ?? '').replace(/-/g, '').trim();
  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return NextResponse.json({
      ok: false,
      provider: 'google_ads',
      error: 'Faltan credenciales de Google Ads. Completa todos los campos en /admin/configuracion.',
      checks: [
        { name: 'developer_token', ok: !!developerToken },
        { name: 'client_id', ok: !!clientId },
        { name: 'client_secret', ok: !!clientSecret },
        { name: 'refresh_token', ok: !!refreshToken },
        { name: 'customer_id', ok: !!customerId },
      ],
    });
  }
  try {
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
      cache: 'no-store',
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      const detail = tokenJson.error_description ?? tokenJson.error ?? `HTTP ${tokenRes.status}`;
      checks.push({ name: 'OAuth refresh', ok: false, detail });
      return NextResponse.json({
        ok: false,
        provider: 'google_ads',
        error: `Google rechazó el refresh_token: ${detail}.`,
        checks,
      });
    }
    checks.push({ name: 'OAuth refresh', ok: true });

    const adsUrl = `https://googleads.googleapis.com/v17/customers/${customerId}`;
    const adsHeaders: Record<string, string> = {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'developer-token': developerToken,
    };
    if (loginCustomerId) adsHeaders['login-customer-id'] = loginCustomerId;
    const adsRes = await fetch(adsUrl, { headers: adsHeaders, cache: 'no-store' });
    if (!adsRes.ok) {
      const bodyText = await adsRes.text().catch(() => '');
      let detail = '';
      try {
        const parsed = JSON.parse(bodyText) as { error?: { message?: string; status?: string } };
        detail = parsed.error?.message ?? parsed.error?.status ?? '';
      } catch {
        detail = bodyText.slice(0, 200);
      }
      checks.push({ name: `customers/${customerId}`, ok: false, detail: detail || `HTTP ${adsRes.status}` });
      return NextResponse.json({
        ok: false,
        provider: 'google_ads',
        error: `Google Ads rechazó las credenciales: ${detail || `HTTP ${adsRes.status}`}.`,
        checks,
      });
    }
    checks.push({ name: `customers/${customerId}`, ok: true, detail: 'Cuenta accesible.' });
    return NextResponse.json({ ok: true, provider: 'google_ads', checks });
  } catch (err) {
    checks.push({ name: 'Google Ads', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'google_ads',
      error: `Error de red al contactar Google Ads: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

async function testVercel(): Promise<NextResponse> {
  const creds = await readIntegrationCredentials('vercel');
  const token = (creds.api_token ?? '').trim() || (process.env.VERCEL_API_TOKEN ?? '').trim();
  const projectId = (creds.project_id ?? '').trim() || (process.env.VERCEL_PROJECT_ID ?? '').trim();
  const teamId = (creds.team_id ?? '').trim() || (process.env.VERCEL_TEAM_ID ?? '').trim();
  const checks: DiagnosticCheck[] = [];
  if (!token) {
    return NextResponse.json({
      ok: false,
      provider: 'vercel',
      error: 'Vercel no configurado. Guarda `api_token` en /admin/configuracion.',
      checks: [{ name: 'api_token', ok: false, detail: 'No configurado.' }],
    });
  }
  try {
    const userRes = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const userJson = (await userRes.json().catch(() => ({}))) as {
      user?: { username?: string; name?: string };
      error?: { message?: string };
    };
    if (!userRes.ok) {
      checks.push({
        name: 'Token /v2/user',
        ok: false,
        detail: userJson.error?.message ?? `HTTP ${userRes.status}`,
      });
      return NextResponse.json({
        ok: false,
        provider: 'vercel',
        error: `Vercel rechazó el token: ${userJson.error?.message ?? `HTTP ${userRes.status}`}.`,
        checks,
      });
    }
    checks.push({
      name: 'Token /v2/user',
      ok: true,
      detail: `Conectado como ${userJson.user?.username ?? userJson.user?.name ?? 'usuario'}.`,
    });

    if (projectId) {
      const projUrl = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`);
      if (teamId) projUrl.searchParams.set('teamId', teamId);
      const projRes = await fetch(projUrl.toString(), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
      });
      const projJson = (await projRes.json().catch(() => ({}))) as {
        name?: string;
        error?: { message?: string };
      };
      if (!projRes.ok) {
        checks.push({
          name: `project ${projectId}`,
          ok: false,
          detail: projJson.error?.message ?? `HTTP ${projRes.status}`,
        });
        return NextResponse.json({
          ok: false,
          provider: 'vercel',
          error: `Vercel no encontró el proyecto: ${projJson.error?.message ?? `HTTP ${projRes.status}`}.`,
          checks,
        });
      }
      checks.push({
        name: `project ${projectId}`,
        ok: true,
        detail: `Proyecto accesible: ${projJson.name ?? projectId}.`,
      });
    } else {
      checks.push({ name: 'project_id', ok: false, detail: 'No configurado (necesario para listar logs).' });
    }
    return NextResponse.json({ ok: checks.every((c) => c.ok), provider: 'vercel', checks });
  } catch (err) {
    checks.push({ name: 'Vercel', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'vercel',
      error: `Error de red al contactar Vercel: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const provider = new URL(request.url).searchParams.get('provider') ?? '';
    if (provider === 'meta') return await testMeta();
    if (provider === 'cloudinary') return await testCloudinary();
    if (provider === 'tiktok') return await testTikTok();
    if (provider === 'google') return await testGoogle();
    if (provider === 'google_ads') return await testGoogleAds();
    if (provider === 'vercel') return await testVercel();
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
