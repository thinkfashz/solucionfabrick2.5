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
