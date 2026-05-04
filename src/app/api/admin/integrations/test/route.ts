import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { getMercadoLibreCredentials } from '@/lib/mercadoLibreCredentials';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import { detectMpMode, getMpTokenPrefix } from '@/lib/mercadopago';

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
      const raw = (data[0] as { credentials?: Record<string, unknown> }).credentials ?? {};
      const creds = decryptCredentials(raw) as Record<string, string>;
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
      const row = data[0] as { credentials?: Record<string, unknown> };
      return decryptCredentials(row.credentials ?? {}) as Record<string, string>;
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

async function testMercadoLibre(): Promise<NextResponse> {
  const creds = await getMercadoLibreCredentials();
  const token = creds.accessToken?.trim() ?? '';
  const checks: DiagnosticCheck[] = [];
  if (!token) {
    return NextResponse.json({
      ok: false,
      provider: 'mercadolibre',
      error: 'MercadoLibre no configurado. Guarda `access_token` en la pantalla de integraciones o define MERCADOLIBRE_ACCESS_TOKEN en el servidor.',
      checks: [{ name: 'access_token', ok: false, detail: 'No configurado.' }],
      sources: creds.sources,
    });
  }

  try {
    const meRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const meJson = (await meRes.json().catch(() => ({}))) as {
      id?: number;
      nickname?: string;
      message?: string;
      error?: string;
    };
    if (!meRes.ok || !meJson.id) {
      const detail = meJson.message ?? meJson.error ?? `HTTP ${meRes.status}`;
      checks.push({ name: 'Token /users/me', ok: false, detail });
      return NextResponse.json({
        ok: false,
        provider: 'mercadolibre',
        error: `MercadoLibre rechazó el token: ${detail}.`,
        checks,
        sources: creds.sources,
      });
    }

    checks.push({
      name: 'Token /users/me',
      ok: true,
      detail: `Conectado como ${meJson.nickname ?? meJson.id} (fuente: ${creds.sources.accessToken ?? 'desconocida'}).`,
    });

    const itemsRes = await fetch(`https://api.mercadolibre.com/users/${meJson.id}/items/search?limit=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const itemsJson = (await itemsRes.json().catch(() => ({}))) as {
      paging?: { total?: number };
      message?: string;
      error?: string;
    };
    if (!itemsRes.ok) {
      checks.push({
        name: 'Lectura de publicaciones',
        ok: false,
        detail: itemsJson.message ?? itemsJson.error ?? `HTTP ${itemsRes.status}`,
      });
      return NextResponse.json({
        ok: false,
        provider: 'mercadolibre',
        error: `El token es válido, pero falló la lectura de publicaciones: ${itemsJson.message ?? itemsJson.error ?? `HTTP ${itemsRes.status}`}.`,
        checks,
        sources: creds.sources,
      });
    }

    checks.push({
      name: 'Lectura de publicaciones',
      ok: true,
      detail: `Acceso correcto al inventario del vendedor. Total detectado: ${itemsJson.paging?.total ?? 0}.`,
    });

    return NextResponse.json({ ok: true, provider: 'mercadolibre', checks, sources: creds.sources });
  } catch (err) {
    checks.push({ name: 'MercadoLibre', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'mercadolibre',
      error: `Error de red al contactar MercadoLibre: ${err instanceof Error ? err.message : String(err)}`,
      checks,
      sources: creds.sources,
    });
  }
}

async function testMercadoPago(): Promise<NextResponse> {
  const creds = await getMercadoPagoCredentials();
  const accessToken = creds.accessToken?.trim() ?? '';
  const publicKey = creds.publicKey?.trim() ?? '';
  const checks: DiagnosticCheck[] = [];
  if (!accessToken && !publicKey) {
    return NextResponse.json({
      ok: false,
      provider: 'mercadopago',
      error: 'MercadoPago no configurado. Guarda access_token y public_key en el centro de integraciones.',
      checks: [
        { name: 'access_token', ok: false, detail: 'No configurado.' },
        { name: 'public_key', ok: false, detail: 'No configurada.' },
      ],
      sources: creds.sources,
    });
  }

  if (!publicKey) {
    checks.push({ name: 'public_key', ok: false, detail: 'Falta la clave pública para tokenización en checkout.' });
  } else {
    checks.push({ name: 'public_key', ok: true, detail: `Clave pública presente (fuente: ${creds.sources.publicKey ?? 'desconocida'}).` });
  }

  if (!accessToken) {
    checks.push({ name: 'access_token', ok: false, detail: 'Falta el token privado para cobros del servidor.' });
    return NextResponse.json({
      ok: false,
      provider: 'mercadopago',
      error: 'Falta access_token de MercadoPago.',
      checks,
      sources: creds.sources,
    });
  }

  try {
    const res = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MLC', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (res.status === 401 || res.status === 403) {
      checks.push({ name: 'Gateway probe', ok: false, detail: json.message ?? json.error ?? `HTTP ${res.status}` });
      return NextResponse.json({
        ok: false,
        provider: 'mercadopago',
        error: `MercadoPago rechazó el access_token: ${json.message ?? json.error ?? `HTTP ${res.status}`}.`,
        checks,
        sources: creds.sources,
      });
    }
    if (!res.ok) {
      checks.push({ name: 'Gateway probe', ok: false, detail: json.message ?? json.error ?? `HTTP ${res.status}` });
      return NextResponse.json({
        ok: false,
        provider: 'mercadopago',
        error: `MercadoPago respondió con error: ${json.message ?? json.error ?? `HTTP ${res.status}`}.`,
        checks,
        sources: creds.sources,
      });
    }

    checks.push({
      name: 'Gateway probe',
      ok: true,
      detail: `API reachable. Modo: ${detectMpMode(accessToken)}. Prefijo del token: ${getMpTokenPrefix(accessToken) || 'n/a'}.`,
    });
    return NextResponse.json({ ok: checks.every((check) => check.ok), provider: 'mercadopago', checks, sources: creds.sources });
  } catch (err) {
    checks.push({ name: 'Gateway probe', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'mercadopago',
      error: `Error de red al contactar MercadoPago: ${err instanceof Error ? err.message : String(err)}`,
      checks,
      sources: creds.sources,
    });
  }
}

async function testStripe(): Promise<NextResponse> {
  const creds = await readIntegrationCredentials('stripe');
  const secretKey = (creds.secret_key ?? '').trim();
  const publicKey = (creds.public_key ?? '').trim();
  const checks: DiagnosticCheck[] = [];

  if (!secretKey && !publicKey) {
    return NextResponse.json({
      ok: false,
      provider: 'stripe',
      error: 'Stripe no configurado. Guarda al menos secret_key y public_key en el centro de integraciones.',
      checks: [
        { name: 'secret_key', ok: false, detail: 'No configurada.' },
        { name: 'public_key', ok: false, detail: 'No configurada.' },
      ],
    });
  }

  if (!publicKey) {
    checks.push({ name: 'public_key', ok: false, detail: 'Falta la clave pública para frontend.' });
  } else if (!/^pk_(test|live)_/i.test(publicKey)) {
    checks.push({ name: 'public_key', ok: false, detail: 'Formato inválido.' });
  } else {
    checks.push({ name: 'public_key', ok: true, detail: 'Clave pública presente.' });
  }

  if (!secretKey) {
    checks.push({ name: 'secret_key', ok: false, detail: 'Falta la clave secreta para backend.' });
    return NextResponse.json({ ok: false, provider: 'stripe', error: 'Falta secret_key de Stripe.', checks });
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      email?: string;
      display_name?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      checks.push({ name: 'Stripe /v1/account', ok: false, detail: json.error?.message ?? `HTTP ${res.status}` });
      return NextResponse.json({
        ok: false,
        provider: 'stripe',
        error: `Stripe rechazó la secret_key: ${json.error?.message ?? `HTTP ${res.status}`}.`,
        checks,
      });
    }
    checks.push({
      name: 'Stripe /v1/account',
      ok: true,
      detail: `Cuenta accesible: ${json.display_name ?? json.email ?? json.id ?? 'Stripe account'}.`,
    });
    return NextResponse.json({ ok: checks.every((check) => check.ok), provider: 'stripe', checks });
  } catch (err) {
    checks.push({ name: 'Stripe /v1/account', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'stripe',
      error: `Error de red al contactar Stripe: ${err instanceof Error ? err.message : String(err)}`,
      checks,
    });
  }
}

async function testWhatsApp(): Promise<NextResponse> {
  const creds = await readIntegrationCredentials('whatsapp');
  const accessToken = (creds.access_token ?? '').trim();
  const phoneNumberId = (creds.phone_number_id ?? '').trim();
  const businessAccountId = (creds.business_account_id ?? '').trim();
  const checks: DiagnosticCheck[] = [];

  if (!accessToken && !phoneNumberId && !businessAccountId) {
    return NextResponse.json({
      ok: false,
      provider: 'whatsapp',
      error: 'WhatsApp Business no configurado. Guarda access_token y phone_number_id en el centro de integraciones.',
      checks: [
        { name: 'access_token', ok: false, detail: 'No configurado.' },
        { name: 'phone_number_id', ok: false, detail: 'No configurado.' },
      ],
    });
  }

  if (!accessToken) {
    checks.push({ name: 'access_token', ok: false, detail: 'Falta token de Cloud API.' });
    return NextResponse.json({ ok: false, provider: 'whatsapp', error: 'Falta access_token de WhatsApp Business.', checks });
    }

  if (!phoneNumberId) {
    checks.push({ name: 'phone_number_id', ok: false, detail: 'Falta el ID del número de teléfono.' });
    return NextResponse.json({ ok: false, provider: 'whatsapp', error: 'Falta phone_number_id para validar WhatsApp Business.', checks });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      checks.push({ name: 'WhatsApp phone number', ok: false, detail: json.error?.message ?? `HTTP ${res.status}` });
      return NextResponse.json({
        ok: false,
        provider: 'whatsapp',
        error: `WhatsApp Business rechazó las credenciales: ${json.error?.message ?? `HTTP ${res.status}`}.`,
        checks,
      });
    }
    checks.push({
      name: 'WhatsApp phone number',
      ok: true,
      detail: `Número accesible: ${json.display_phone_number ?? phoneNumberId}${json.verified_name ? ` · ${json.verified_name}` : ''}${json.quality_rating ? ` · quality ${json.quality_rating}` : ''}.`,
    });
    if (businessAccountId) {
      checks.push({ name: 'business_account_id', ok: true, detail: `WABA configurado: ${businessAccountId}.` });
    }
    return NextResponse.json({ ok: checks.every((check) => check.ok), provider: 'whatsapp', checks });
  } catch (err) {
    checks.push({ name: 'WhatsApp phone number', ok: false, detail: err instanceof Error ? err.message : 'Error de red.' });
    return NextResponse.json({
      ok: false,
      provider: 'whatsapp',
      error: `Error de red al contactar WhatsApp Business: ${err instanceof Error ? err.message : String(err)}`,
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
    if (provider === 'mercadolibre') return await testMercadoLibre();
    if (provider === 'mercadopago') return await testMercadoPago();
    if (provider === 'stripe') return await testStripe();
    if (provider === 'whatsapp') return await testWhatsApp();
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
