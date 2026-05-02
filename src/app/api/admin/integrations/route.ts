import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Providers recognised by the admin integrations UI. Each provider stores a
 * free-form `credentials` JSON object in the InsForge `integrations` table so
 * new providers can be added without a schema migration.
 */
const ALLOWED_PROVIDERS = new Set([
  'meta',         // Facebook + Instagram + Meta Ads
  'google',       // Google OAuth / general Google APIs
  'google_ads',   // Google Ads API
  'tiktok',       // TikTok for Business / TikTok Ads
  'cloudinary',   // Cloudinary media storage
]);

function getClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return createClient({ baseUrl, anonKey });
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

/** Masks every credential value so we never echo secrets back to the client. */
function maskCredentials(credentials: Record<string, unknown> | null | undefined): Record<string, { set: boolean; preview: string }> {
  const out: Record<string, { set: boolean; preview: string }> = {};
  if (!credentials) return out;
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value !== 'string' || value.length === 0) {
      out[key] = { set: false, preview: '' };
      continue;
    }
    const preview = value.length <= 4 ? '•••' : `••• ${value.slice(-4)}`;
    out[key] = { set: true, preview };
  }
  return out;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const client = getClient();
  if (!client) return NextResponse.json({ error: 'InsForge no configurado en el servidor.' }, { status: 503 });

  try {
    const { data, error } = await client.database
      .from('integrations')
      .select('provider, credentials, updated_at');

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Crea la tabla `integrations` en InsForge (provider text PK, credentials jsonb, updated_at timestamptz).',
        },
        { status: 500 },
      );
    }

    const providers: Record<string, { credentials: Record<string, { set: boolean; preview: string }>; updated_at?: string }> = {};
    for (const row of (data ?? []) as Array<{ provider?: string; credentials?: Record<string, unknown>; updated_at?: string }>) {
      if (!row.provider || !ALLOWED_PROVIDERS.has(row.provider)) continue;
      providers[row.provider] = {
        credentials: maskCredentials(row.credentials),
        updated_at: row.updated_at,
      };
    }

    return NextResponse.json({ providers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al consultar integrations.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const client = getClient();
  if (!client) return NextResponse.json({ error: 'InsForge no configurado en el servidor.' }, { status: 503 });

  let provider: string;
  let credentials: Record<string, string>;
  try {
    const body = await request.json();
    provider = String(body.provider ?? '').trim();
    credentials = (body.credentials ?? {}) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Proveedor no permitido.' }, { status: 400 });
  }
  if (!credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 400 });
  }

  // Cloudinary cloud names are lowercase alphanumerics with optional dashes /
  // underscores. Reject obvious mistakes (e.g. spaces or the literal "Root",
  // which is the default *Product Environment* label in Cloudinary's dashboard
  // — users frequently copy that instead of the actual cloud name).
  if (provider === 'cloudinary' && typeof credentials.cloud_name === 'string' && credentials.cloud_name.length > 0) {
    const candidate = credentials.cloud_name.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(candidate)) {
      return NextResponse.json(
        {
          error:
            'Cloud name inválido: sólo se permiten letras, números, guiones y guión bajo. No incluyas espacios ni la URL completa.',
        },
        { status: 400 },
      );
    }
    if (candidate.toLowerCase() === 'root') {
      return NextResponse.json(
        {
          error:
            '"Root" es el nombre del *Product Environment* de Cloudinary, no tu cloud name. Encuéntralo en cloudinary.com → Settings → API Keys (campo "Cloud Name") o en la URL del dashboard (cloudinary://...@TU_CLOUD_NAME).',
        },
        { status: 400 },
      );
    }
  }

  // Merge with existing credentials so the admin can update individual fields
  // (e.g. rotate only the access token) without having to re-enter everything.
  let existing: Record<string, string> = {};
  try {
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', provider)
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as { credentials?: Record<string, string> };
      existing = row.credentials ?? {};
    }
  } catch {
    // ignore — upsert below will recreate the row.
  }

  const nextCredentials: Record<string, string> = { ...existing };
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value !== 'string') continue;
    if (value === '') continue; // empty string means "leave as-is"
    nextCredentials[key] = value.trim();
  }

  // Live-validate Cloudinary credentials against their Admin API before
  // persisting, so bad values never end up in the integrations table.
  if (provider === 'cloudinary') {
    const cloudName = nextCredentials.cloud_name;
    const apiKey = nextCredentials.api_key;
    const apiSecret = nextCredentials.api_secret;
    if (cloudName && apiKey && apiSecret) {
      try {
        const pingUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/usage`;
        const basicAuth = btoa(`${apiKey}:${apiSecret}`);
        const pingRes = await fetch(pingUrl, {
          headers: { Authorization: `Basic ${basicAuth}` },
          cache: 'no-store',
        });
        if (!pingRes.ok) {
          const bodyText = await pingRes.text().catch(() => '');
          let upstreamMessage = '';
          try {
            const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
            upstreamMessage = parsed.error?.message ?? '';
          } catch {
            upstreamMessage = bodyText.slice(0, 200);
          }
          const hint =
            pingRes.status === 401 && /cloud_name/i.test(upstreamMessage)
              ? ' Asegúrate de usar el cloud_name (cloudinary.com → Settings → API Keys → "Cloud Name"), no el nombre del Product Environment ("Root" por defecto).'
              : '';
          return NextResponse.json(
            {
              error: `Cloudinary rechazó las credenciales (HTTP ${pingRes.status}): ${upstreamMessage || 'sin detalle'}.${hint}`,
            },
            { status: 400 },
          );
        }
      } catch (err) {
        return NextResponse.json(
          {
            error: `No se pudo contactar Cloudinary para validar las credenciales: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
          { status: 502 },
        );
      }
    }
  }

  // Live-validate Meta credentials by hitting Graph `/me` and, if an
  // ad_account_id is provided, `/act_<id>`. Only run when an access_token
  // is present in the merged payload — otherwise the form is being used
  // to set non-secret metadata (e.g. just the ad_account_id).
  if (provider === 'meta' && nextCredentials.access_token) {
    const accessToken = nextCredentials.access_token;
    const adAccountIdRaw = (nextCredentials.ad_account_id ?? '').trim();
    try {
      const meUrl = `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
      const meRes = await fetch(meUrl, { cache: 'no-store' });
      const meJson = (await meRes.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number };
      };
      if (!meRes.ok || meJson.error) {
        const upstream = meJson.error?.message ?? `HTTP ${meRes.status}`;
        return NextResponse.json(
          {
            error: `Meta rechazó el access_token: ${upstream}. Genera un token de larga duración desde Graph API Explorer (developers.facebook.com/tools/explorer) con permisos pages_manage_posts, ads_management, business_management.`,
          },
          { status: 400 },
        );
      }
      if (adAccountIdRaw) {
        const adId = adAccountIdRaw.startsWith('act_') ? adAccountIdRaw : `act_${adAccountIdRaw}`;
        if (!/^act_\d+$/.test(adId)) {
          return NextResponse.json(
            {
              error:
                'ad_account_id inválido: debe ser el ID numérico de la cuenta publicitaria (formato "act_1234567890"). Lo encuentras en Business Manager → Ad Accounts.',
            },
            { status: 400 },
          );
        }
        const actUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(adId)}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
        const actRes = await fetch(actUrl, { cache: 'no-store' });
        const actJson = (await actRes.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        if (!actRes.ok || actJson.error) {
          const upstream = actJson.error?.message ?? `HTTP ${actRes.status}`;
          return NextResponse.json(
            {
              error: `Meta rechazó el ad_account_id "${adId}": ${upstream}. Verifica que el token tenga permisos sobre esa cuenta y que el ID sea correcto.`,
            },
            { status: 400 },
          );
        }
        // Persist the canonical "act_<digits>" form so downstream code can rely on it.
        nextCredentials.ad_account_id = adId;
      }
    } catch (err) {
      return NextResponse.json(
        {
          error: `No se pudo contactar Meta para validar las credenciales: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 502 },
      );
    }
  }

  // Live-validate Google Ads credentials by refreshing the OAuth token
  // and then pinging the Google Ads API for the configured customer_id.
  // Requires the full set of secrets: developer_token, client_id,
  // client_secret, refresh_token, customer_id.
  if (provider === 'google_ads') {
    const developerToken = nextCredentials.developer_token;
    const clientId = nextCredentials.client_id;
    const clientSecret = nextCredentials.client_secret;
    const refreshToken = nextCredentials.refresh_token;
    const customerIdRaw = (nextCredentials.customer_id ?? '').replace(/-/g, '').trim();
    const loginCustomerIdRaw = (nextCredentials.login_customer_id ?? '').replace(/-/g, '').trim();

    // Only run live validation when *all* required fields are present.
    // This lets the admin update one field at a time without re-entering everything.
    const haveAll = Boolean(developerToken && clientId && clientSecret && refreshToken && customerIdRaw);
    if (haveAll) {
      if (!/^\d+$/.test(customerIdRaw)) {
        return NextResponse.json(
          {
            error:
              'customer_id inválido: debe ser el número de cliente de Google Ads sin guiones (10 dígitos). Encuéntralo arriba a la derecha del panel ads.google.com.',
          },
          { status: 400 },
        );
      }
      // Persist the canonical (digits-only) form so downstream code is consistent.
      nextCredentials.customer_id = customerIdRaw;
      if (loginCustomerIdRaw) {
        if (!/^\d+$/.test(loginCustomerIdRaw)) {
          return NextResponse.json(
            { error: 'login_customer_id inválido: debe ser el ID de la cuenta MCC sin guiones.' },
            { status: 400 },
          );
        }
        nextCredentials.login_customer_id = loginCustomerIdRaw;
      }

      try {
        // 1) Refresh access token.
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
          const upstream =
            tokenJson.error_description ?? tokenJson.error ?? `HTTP ${tokenRes.status}`;
          return NextResponse.json(
            {
              error: `Google rechazó el refresh_token: ${upstream}. Re-autoriza la app desde el OAuth Playground o tu flujo OAuth y guarda el nuevo refresh_token.`,
            },
            { status: 400 },
          );
        }

        // 2) Ping the Google Ads API for the customer resource.
        const adsUrl = `https://googleads.googleapis.com/v17/customers/${customerIdRaw}`;
        const adsHeaders: Record<string, string> = {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'developer-token': developerToken,
        };
        if (loginCustomerIdRaw) adsHeaders['login-customer-id'] = loginCustomerIdRaw;
        const adsRes = await fetch(adsUrl, { headers: adsHeaders, cache: 'no-store' });
        if (!adsRes.ok) {
          const bodyText = await adsRes.text().catch(() => '');
          let upstream = '';
          try {
            const parsed = JSON.parse(bodyText) as { error?: { message?: string; status?: string } };
            upstream = parsed.error?.message ?? parsed.error?.status ?? '';
          } catch {
            upstream = bodyText.slice(0, 300);
          }
          const hint =
            adsRes.status === 401 && /developer.token/i.test(upstream)
              ? ' Verifica que developer_token corresponda a una cuenta aprobada en ads.google.com → Tools → API Center.'
              : adsRes.status === 403 && /login.customer/i.test(upstream)
                ? ' La cuenta requiere un login_customer_id (ID de la cuenta MCC que administra customer_id).'
                : '';
          return NextResponse.json(
            {
              error: `Google Ads rechazó las credenciales (HTTP ${adsRes.status}): ${upstream || 'sin detalle'}.${hint}`,
            },
            { status: 400 },
          );
        }
      } catch (err) {
        return NextResponse.json(
          {
            error: `No se pudo contactar Google Ads para validar las credenciales: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
          { status: 502 },
        );
      }
    }
  }

  try {
    const { error } = await client.database.from('integrations').upsert([
      {
        provider,
        credentials: nextCredentials,
        updated_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Crea la tabla `integrations` en InsForge (provider text PK, credentials jsonb, updated_at timestamptz).',
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, credentials: maskCredentials(nextCredentials) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al guardar integration.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const client = getClient();
  if (!client) return NextResponse.json({ error: 'InsForge no configurado en el servidor.' }, { status: 503 });

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') ?? '';
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Proveedor no permitido.' }, { status: 400 });
  }

  try {
    const { error } = await client.database.from('integrations').delete().eq('provider', provider);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al eliminar integration.' },
      { status: 500 },
    );
  }
}
