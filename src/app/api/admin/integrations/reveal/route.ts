import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { timingSafeEqual } from 'node:crypto';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import { serializeSdkError } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_PROVIDERS = new Set([
  'meta',
  'google',
  'google_ads',
  'tiktok',
  'cloudinary',
  'vercel',
  'mercadolibre',
  'mercadopago',
  'stripe',
  'whatsapp',
]);

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL;
  const anonKey = process.env.INSFORGE_API_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return createClient({ baseUrl, anonKey });
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

function getAdminViewPassword() {
  return normalize(process.env.ADMIN_VIEW_PASSWORD);
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function writeIntegrationAudit(
  client: ReturnType<typeof createClient>,
  request: NextRequest,
  session: { sub?: string; email?: string } | null,
  provider: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null;
    const ua = request.headers.get('user-agent') ?? null;
    await client.database.from('integration_audit').insert([
      {
        provider,
        action: 'reveal',
        actor: session?.email ?? session?.sub ?? null,
        ip,
        user_agent: ua,
        details,
      },
    ]);
  } catch {
    /* swallow — audit is best effort */
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const adminViewPassword = getAdminViewPassword();
  if (!adminViewPassword) {
    return NextResponse.json(
      {
        error: 'ADMIN_VIEW_PASSWORD no está configurada en el servidor.',
        hint: 'Define ADMIN_VIEW_PASSWORD en Vercel/InsForge para habilitar el revelado temporal de claves en el admin.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: 'InsForge no configurado en el servidor.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  let provider = '';
  let password = '';
  try {
    const body = (await request.json()) as { provider?: string; password?: string };
    provider = normalize(body.provider);
    password = normalize(body.password);
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Proveedor no permitido.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!password) {
    return NextResponse.json({ error: 'Debes ingresar la contraseña de visualización.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!safeEqualText(password, adminViewPassword)) {
    return NextResponse.json(
      { error: 'Contraseña de visualización inválida.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { data, error } = await client.database
      .from('integrations')
      .select('credentials, updated_at')
      .eq('provider', provider)
      .limit(1);

    if (error) {
      const sdk = serializeSdkError(error);
      return NextResponse.json({ ...sdk, error: sdk.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No hay credenciales guardadas para este proveedor.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const row = data[0] as { credentials?: Record<string, unknown>; updated_at?: string };
    const plain = decryptCredentials(row.credentials ?? {});
    const credentials = Object.fromEntries(
      Object.entries(plain).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
    ) as Record<string, string>;

    await writeIntegrationAudit(client, request, session, provider, {
      keys: Object.keys(credentials),
      expires_in_seconds: 30,
    });

    return NextResponse.json(
      {
        ok: true,
        provider,
        credentials,
        updatedAt: row.updated_at ?? null,
        expiresInSeconds: 30,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const sdk = serializeSdkError(err);
    return NextResponse.json({ ...sdk, error: sdk.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
