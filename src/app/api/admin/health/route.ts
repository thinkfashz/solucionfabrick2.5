import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { decryptCredentials } from '@/lib/integrationsCrypto';

export type ServiceStatus = 'online' | 'slow' | 'offline' | 'unconfigured';

type ProbeStatus = 'ok' | 'slow' | 'error' | 'unconfigured';

type CountQueryResult = { count?: number | null; error?: { message?: string } | null };
type CountQuery = PromiseLike<CountQueryResult> & {
  neq: (column: string, value: unknown) => CountQuery;
  gte: (column: string, value: unknown) => CountQuery;
};

interface ServiceResult {
  status: ServiceStatus;
  latency: number;
  /** Optional short note shown in the UI (e.g. "sin credenciales"). */
  note?: string;
}

interface EndpointResult {
  status: ProbeStatus;
  httpStatus: number | null;
  latency: number;
  cache: string | null;
  note?: string;
}

interface DatabaseProbeResult {
  status: ProbeStatus;
  latency: number;
  count?: number;
  note?: string;
}

const SERVICE_TIMEOUT_MS = 4_000;
const ENDPOINT_TIMEOUT_MS = 5_000;
const SLOW_ENDPOINT_MS = 900;
const SLOW_DB_MS = 700;
const MAX_OBSERVATORY_ROWS = 120;

async function pingUrl(url: string, timeoutMs = SERVICE_TIMEOUT_MS): Promise<ServiceResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
    const latency = Date.now() - start;
    if (!response.ok && response.status >= 500) {
      return { status: 'offline', latency, note: `HTTP ${response.status}` };
    }
    return { status: latency > 700 ? 'slow' : 'online', latency };
  } catch {
    const elapsed = Date.now() - start;
    return { status: elapsed >= timeoutMs - 50 ? 'slow' : 'offline', latency: elapsed, note: 'timeout' };
  } finally {
    clearTimeout(timer);
  }
}

async function probeEndpoint(baseUrl: string, path: string, timeoutMs = ENDPOINT_TIMEOUT_MS): Promise<EndpointResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const latency = Date.now() - start;
    const cache = response.headers.get('cache-control');
    const ok = response.ok;
    return {
      status: !ok ? 'error' : latency > SLOW_ENDPOINT_MS ? 'slow' : 'ok',
      httpStatus: response.status,
      latency,
      cache,
      note: ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const latency = Date.now() - start;
    return {
      status: 'error',
      httpStatus: null,
      latency,
      cache: null,
      note: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'fetch_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe an authenticated API. If there is no credential configured the
 * service is reported as `unconfigured` instead of `offline` so the admin
 * panel can distinguish "never set up" from "set up but not responding".
 */
async function probeAuthenticated(
  credential: string | undefined | null,
  url: string | null,
  timeoutMs = SERVICE_TIMEOUT_MS,
): Promise<ServiceResult> {
  if (!credential) {
    return { status: 'unconfigured', latency: 0, note: 'sin credenciales' };
  }
  if (!url) {
    return { status: 'online', latency: 0, note: 'credencial presente' };
  }
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: latency > 800 ? 'slow' : 'online', latency };
    }
    return { status: 'offline', latency, note: `HTTP ${res.status}` };
  } catch {
    return { status: 'offline', latency: Date.now() - start, note: 'timeout' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load credentials for external integrations from the InsForge `integrations`
 * table. Gracefully falls back to environment variables for callers that want
 * to set them via Vercel/dotenv instead of the admin UI.
 */
async function loadIntegrationCredentials(): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};

  // Env-var fallbacks first so they always show up as "configured".
  if (process.env.META_ACCESS_TOKEN) {
    out.meta = {
      access_token: process.env.META_ACCESS_TOKEN,
      ad_account_id: process.env.META_AD_ACCOUNT_ID ?? '',
    };
  }
  if (process.env.GOOGLE_ADS_ACCESS_TOKEN) {
    out.google_ads = { access_token: process.env.GOOGLE_ADS_ACCESS_TOKEN };
  }
  if (process.env.TIKTOK_ADS_ACCESS_TOKEN) {
    out.tiktok = { access_token: process.env.TIKTOK_ADS_ACCESS_TOKEN };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    if (!baseUrl || !anonKey) return out;
    const client = createClient({ baseUrl, anonKey });
    const { data } = await client.database.from('integrations').select('provider, credentials');
    if (Array.isArray(data)) {
      for (const row of data as Array<{ provider?: string; credentials?: Record<string, unknown> }>) {
        if (row.provider && row.credentials && typeof row.credentials === 'object') {
          const plain = decryptCredentials(row.credentials) as Record<string, string>;
          out[row.provider] = { ...out[row.provider], ...plain };
        }
      }
    }
  } catch {
    // Table may not exist yet; callers must handle the "unconfigured" status.
  }
  return out;
}

async function probeDatabaseCount(
  table: string,
  build?: (query: CountQuery) => CountQuery,
): Promise<DatabaseProbeResult> {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return { status: 'unconfigured', latency: 0, note: 'InsForge env incompleto' };

  const start = Date.now();
  try {
    const client = createClient({ baseUrl, anonKey });
    let query = client.database.from(table).select('id', { count: 'exact', head: true }) as unknown as CountQuery;
    if (build) query = build(query);
    const { count, error } = await query;
    const latency = Date.now() - start;
    if (error) return { status: 'error', latency, note: error.message };
    return { status: latency > SLOW_DB_MS ? 'slow' : 'ok', latency, count: count ?? 0 };
  } catch (error) {
    return { status: 'error', latency: Date.now() - start, note: error instanceof Error ? error.message : 'db_probe_failed' };
  }
}

function buildReadinessReport(args: {
  services: Record<string, ServiceResult>;
  endpoints: Record<string, EndpointResult>;
  database: Record<string, DatabaseProbeResult>;
}) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const [id, endpoint] of Object.entries(args.endpoints)) {
    if (endpoint.status === 'error') blockers.push(`Endpoint ${id} no responde correctamente (${endpoint.note ?? endpoint.httpStatus ?? 'error'}).`);
    if (endpoint.status === 'slow') warnings.push(`Endpoint ${id} lento: ${endpoint.latency}ms.`);
  }

  for (const [id, probe] of Object.entries(args.database)) {
    if (probe.status === 'error') blockers.push(`DB ${id} con error: ${probe.note ?? 'error'}.`);
    if (probe.status === 'slow') warnings.push(`DB ${id} lenta: ${probe.latency}ms.`);
  }

  if (args.services.insforge?.status === 'offline') blockers.push('InsForge está offline o inaccesible.');
  if (args.services.mercadopago?.status === 'offline') warnings.push('Mercado Pago no responde; checkout puede degradarse.');

  const catalogCache = args.endpoints.catalog?.cache ?? '';
  if (catalogCache && !/s-maxage/i.test(catalogCache)) warnings.push('El catálogo no muestra header s-maxage; revisa caché CDN.');

  const publicPagesReady = !blockers.some((item) => /catalog|site_structure|InsForge/i.test(item));
  const checkoutReady = !blockers.some((item) => /checkout|orders|payment|Mercado/i.test(item));

  return {
    level: blockers.length > 0 ? 'degraded' : warnings.length > 0 ? 'watch' : 'ready',
    publicPagesReady,
    checkoutReady,
    blockers,
    warnings,
    note: 'Esta lectura valida salud y latencia; no sustituye una prueba de carga progresiva con tráfico controlado.',
  };
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value || !(await decodeSession(sessionCookie.value))) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const appBaseUrl = new URL(request.url).origin;
  const creds = await loadIntegrationCredentials();

  const publicChecks: { id: string; url: string }[] = [
    { id: 'vercel',      url: appBaseUrl },
    ...(insforgeUrl ? [{ id: 'insforge', url: insforgeUrl }] : []),
    { id: 'cloudflare',  url: 'https://cloudflare.com' },
    { id: 'github',      url: 'https://github.com' },
    { id: 'mercadopago', url: 'https://api.mercadopago.com' },
  ];

  const endpointChecks: Record<string, string> = {
    catalog: '/api/tienda/products',
    productos: '/api/productos?limit=3',
    site_structure: '/api/site-structure/nav-menu',
    mp_status: '/api/payments/mp-status',
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const hourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [publicResults, endpointResults, dbResults] = await Promise.all([
    Promise.allSettled(publicChecks.map((c) => pingUrl(c.url))),
    Promise.allSettled(Object.entries(endpointChecks).map(async ([id, path]) => [id, await probeEndpoint(appBaseUrl, path)] as const)),
    Promise.allSettled([
      probeDatabaseCount('products', (q) => q.neq('activo', false)),
      probeDatabaseCount('orders', (q) => q.gte('created_at', todayIso)),
      probeDatabaseCount('payment_webhooks', (q) => q.gte('created_at', todayIso)),
      probeDatabaseCount('admin_error_logs', (q) => q.gte('created_at', hourAgoIso)),
    ]),
  ]);

  const services: Record<string, ServiceResult> = {};
  if (!insforgeUrl) {
    services.insforge = { status: 'unconfigured', latency: -1 } as ServiceResult;
  }
  for (let i = 0; i < publicChecks.length; i++) {
    const result = publicResults[i];
    services[publicChecks[i].id] =
      result.status === 'fulfilled'
        ? result.value
        : { status: 'offline', latency: -1 };
  }

  const endpoints: Record<string, EndpointResult> = {};
  for (const result of endpointResults) {
    if (result.status === 'fulfilled') endpoints[result.value[0]] = result.value[1];
  }

  const dbKeys = ['products_active', 'orders_today', 'payment_webhooks_today', 'errors_hour'] as const;
  const database: Record<string, DatabaseProbeResult> = {};
  for (let i = 0; i < dbKeys.length; i++) {
    const result = dbResults[i];
    database[dbKeys[i]] = result.status === 'fulfilled' ? result.value : { status: 'error', latency: -1 };
  }

  // Authenticated probes — real connectivity depends on whether the user has
  // supplied API credentials (either via env or the `integrations` table).
  const metaToken = creds.meta?.access_token;
  const googleToken = creds.google_ads?.access_token;
  const tiktokToken = creds.tiktok?.access_token;

  const [metaRes, googleRes, tiktokRes] = await Promise.all([
    probeAuthenticated(
      metaToken,
      metaToken ? `https://graph.facebook.com/v20.0/me?access_token=${encodeURIComponent(metaToken)}` : null,
    ),
    probeAuthenticated(
      googleToken,
      null, // Google Ads API requires full OAuth; presence of a token is enough here.
    ),
    probeAuthenticated(
      tiktokToken,
      null, // TikTok Ads API requires advertiser_id + signed requests; presence of token is enough.
    ),
  ]);

  services.meta = metaRes;
  services.google = googleRes;
  services.tiktok = tiktokRes;

  // USUARIOS ACTIVOS is a synthetic node representing the end-user/browser layer.
  services.usuarios = { status: 'online', latency: 0 };

  const allValues = Object.values(services);
  const withLatency = [
    ...allValues.map((s) => s.latency),
    ...Object.values(endpoints).map((s) => s.latency),
    ...Object.values(database).map((s) => s.latency),
  ].filter((n) => n > 0);
  const avgLatency =
    withLatency.length > 0
      ? Math.round(withLatency.reduce((sum, latency) => sum + latency, 0) / withLatency.length)
      : 0;
  const offlineCount = allValues.filter((s) => s.status === 'offline').length + Object.values(endpoints).filter((s) => s.status === 'error').length + Object.values(database).filter((s) => s.status === 'error').length;
  const configuredCount = allValues.filter((s) => s.status !== 'unconfigured').length;
  const uptime = configuredCount > 0
    ? Math.round(((configuredCount - allValues.filter((s) => s.status === 'offline').length) / configuredCount) * 1000) / 10
    : 100;
  const readiness = buildReadinessReport({ services, endpoints, database });

  // Persist per-service ping results to the `observatory_logs` table so the
  // Observatory live feed and admin dashboard alerts panel can stream them.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    if (baseUrl && anonKey) {
      const client = createClient({ baseUrl, anonKey });
      const rows = [
        ...Object.entries(services).map(([id, svc]) => ({
          tipo: 'ping',
          servicio: id,
          mensaje: svc.note
            ? `${id.toUpperCase()} · ${svc.note}`
            : `${id.toUpperCase()} · ${svc.latency > 0 ? `${svc.latency}ms` : svc.status}`,
          latencia: svc.latency ?? 0,
          status:
            svc.status === 'online'  ? 'ok'
            : svc.status === 'slow'  ? 'slow'
            : svc.status === 'offline' ? 'error'
            : 'unconfigured',
        })),
        ...Object.entries(endpoints).map(([id, endpoint]) => ({
          tipo: 'endpoint',
          servicio: id,
          mensaje: `${id.toUpperCase()} · ${endpoint.httpStatus ?? 'ERR'} · ${endpoint.latency}ms`,
          latencia: endpoint.latency,
          status: endpoint.status,
        })),
        ...Object.entries(database).map(([id, probe]) => ({
          tipo: 'database',
          servicio: id,
          mensaje: `${id.toUpperCase()} · ${probe.count ?? 0} · ${probe.latency}ms`,
          latencia: probe.latency,
          status: probe.status,
        })),
        {
          tipo: 'readiness',
          servicio: 'scale-readiness',
          mensaje: `READINESS ${readiness.level.toUpperCase()} · blockers=${readiness.blockers.length} · warnings=${readiness.warnings.length}`,
          latencia: avgLatency,
          status: readiness.level === 'ready' ? 'ok' : readiness.level === 'watch' ? 'slow' : 'error',
        },
      ].slice(0, MAX_OBSERVATORY_ROWS);

      void (async () => {
        try { await client.database.from('observatory_logs').insert(rows); }
        catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[health] observatory_logs insert failed:', err);
          }
        }
      })();
    }
  } catch {
    // ignore — logging is best-effort.
  }

  return NextResponse.json(
    {
      services,
      endpoints,
      database,
      readiness,
      metrics: {
        avgLatency,
        uptime,
        offlineServices: offlineCount,
        unconfiguredServices: allValues.filter((s) => s.status === 'unconfigured').length,
        slowEndpoints: Object.values(endpoints).filter((s) => s.status === 'slow').length,
        dbErrors: Object.values(database).filter((s) => s.status === 'error').length,
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
