import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { getVercelCredentials } from '@/lib/vercelClient';
import { decryptCredentials } from '@/lib/integrationsCrypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/system-health
 *
 * Pings every external dependency the platform talks to and persists a
 * per-provider sample (`{provider, latency_ms, ok, error}`) into the
 * `system_health_samples` table. The /admin/estado page reads from that
 * table to render the historical "Pulso" graph.
 *
 * Authorisation:
 *   - Vercel cron jobs send `Authorization: Bearer $CRON_SECRET`. We accept
 *     either that header *or* a valid admin session cookie so an admin can
 *     trigger the cron manually for diagnostics.
 *   - When neither `CRON_SECRET` is set nor an admin session is present we
 *     refuse with 401 to avoid public DDoS amplification of our upstream
 *     dependencies.
 *
 * Probes:
 *   - insforge:    GET ${NEXT_PUBLIC_INSFORGE_URL} (any 2xx/3xx/4xx counts as up)
 *   - mercadopago: GET https://api.mercadopago.com/sites/MLC
 *   - cloudinary:  GET https://api.cloudinary.com/v1_1/<cloud>/usage  (Basic)
 *   - meta:        GET https://graph.facebook.com/v20.0/me?access_token=…
 *   - vercel:      GET https://api.vercel.com/v2/user
 *
 * Each probe times out at 7s so a slow upstream never blocks the cron.
 */

interface ProbeResult {
  provider: string;
  ok: boolean;
  latency_ms: number;
  error: string | null;
}

const PROBE_TIMEOUT_MS = 7000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probe(provider: string, fn: () => Promise<{ ok: boolean; error?: string }>): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const { ok, error } = await withTimeout(fn(), PROBE_TIMEOUT_MS);
    return { provider, ok, latency_ms: Date.now() - t0, error: error ?? null };
  } catch (err) {
    return {
      provider,
      ok: false,
      latency_ms: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeInsforge(): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
  if (!url) return { ok: false, error: 'NEXT_PUBLIC_INSFORGE_URL ausente.' };
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
  if (!res) return { ok: false, error: 'Network error.' };
  // Treat anything < 500 as "service reachable" — even 401/404 means the host
  // is alive; only 5xx counts as a real outage of the upstream platform.
  return { ok: res.status < 500, error: res.status >= 500 ? `HTTP ${res.status}` : undefined };
}

async function probeMercadoPago(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://api.mercadopago.com/sites/MLC', { cache: 'no-store' }).catch(() => null);
  if (!res) return { ok: false, error: 'Network error.' };
  return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
}

async function probeCloudinary(): Promise<{ ok: boolean; error?: string }> {
  // Reads the cloudinary creds the same way the rest of the app does so a
  // probe failure here means the live integration is broken too.
  try {
    const client = getAdminInsforge();
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'cloudinary')
      .limit(1);
    if (!Array.isArray(data) || data.length === 0) return { ok: false, error: 'Sin credenciales.' };
    const creds = decryptCredentials(
      (data[0] as { credentials?: Record<string, unknown> }).credentials ?? {},
    ) as Record<string, string>;
    if (!creds.cloud_name || !creds.api_key || !creds.api_secret) return { ok: false, error: 'Credenciales incompletas.' };
    const auth = Buffer.from(`${creds.api_key}:${creds.api_secret}`).toString('base64');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloud_name)}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    });
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function probeMeta(): Promise<{ ok: boolean; error?: string }> {
  const creds = await getMetaCredentials();
  if (!creds?.accessToken) return { ok: false, error: 'Sin access_token.' };
  const res = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${encodeURIComponent(creds.accessToken)}`, {
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return { ok: false, error: 'Network error.' };
  return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
}

async function probeVercel(): Promise<{ ok: boolean; error?: string }> {
  const creds = await getVercelCredentials();
  if (!creds.apiToken) return { ok: false, error: 'Sin api_token.' };
  const res = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${creds.apiToken}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return { ok: false, error: 'Network error.' };
  return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization') ?? '';
    if (header === `Bearer ${secret}`) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  // Allow the request through if it's coming from a Vercel cron *or* an
  // authenticated admin session.
  if (!isAuthorized(request)) {
    const session = await getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }

  const samples = await Promise.all([
    probe('insforge', probeInsforge),
    probe('mercadopago', probeMercadoPago),
    probe('cloudinary', probeCloudinary),
    probe('meta', probeMeta),
    probe('vercel', probeVercel),
  ]);

  // Persist samples (best-effort). If the table is missing, surface that in
  // the response so an admin running the cron manually sees the hint.
  let persisted = false;
  let persistError: string | null = null;
  try {
    const client = getAdminInsforge();
    const { error } = await client.database.from('system_health_samples').insert(
      samples.map((s) => ({
        provider: s.provider,
        ok: s.ok,
        latency_ms: s.latency_ms,
        error: s.error,
      })),
    );
    if (error) {
      persistError = error.message;
    } else {
      persisted = true;
    }
  } catch (err) {
    persistError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: true,
    persisted,
    persistError,
    samples,
    runAt: new Date().toISOString(),
  });
}
