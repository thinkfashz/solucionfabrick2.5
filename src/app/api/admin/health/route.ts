import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

type ServiceStatus = 'online' | 'slow' | 'offline' | 'unconfigured';

interface ServiceResult {
  status: ServiceStatus;
  latency: number;
  /** Optional short note shown in the UI (e.g. "sin credenciales"). */
  note?: string;
}

async function pingUrl(url: string, timeoutMs = 5000): Promise<ServiceResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    const latency = Date.now() - start;
    return { status: latency > 500 ? 'slow' : 'online', latency };
  } catch {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    return { status: elapsed >= timeoutMs - 50 ? 'slow' : 'offline', latency: elapsed };
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
  timeoutMs = 5000,
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
    clearTimeout(timer);
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: latency > 800 ? 'slow' : 'online', latency };
    }
    return { status: 'offline', latency, note: `HTTP ${res.status}` };
  } catch {
    clearTimeout(timer);
    return { status: 'offline', latency: Date.now() - start, note: 'timeout' };
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
      for (const row of data as Array<{ provider?: string; credentials?: Record<string, string> }>) {
        if (row.provider && row.credentials && typeof row.credentials === 'object') {
          out[row.provider] = { ...out[row.provider], ...row.credentials };
        }
      }
    }
  } catch {
    // Table may not exist yet; callers must handle the "unconfigured" status.
  }
  return out;
}

export async function GET() {
  const insforgeUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL ?? 'https://txv86efe.us-east.insforge.app';

  const creds = await loadIntegrationCredentials();

  const publicChecks: { id: string; url: string }[] = [
    { id: 'vercel',      url: 'https://solucionesfabrick.com' },
    { id: 'insforge',    url: insforgeUrl },
    { id: 'cloudflare',  url: 'https://cloudflare.com' },
    { id: 'github',      url: 'https://github.com' },
    { id: 'mercadopago', url: 'https://api.mercadopago.com' },
  ];

  const publicResults = await Promise.allSettled(publicChecks.map((c) => pingUrl(c.url)));

  const services: Record<string, ServiceResult> = {};
  for (let i = 0; i < publicChecks.length; i++) {
    const result = publicResults[i];
    services[publicChecks[i].id] =
      result.status === 'fulfilled'
        ? result.value
        : { status: 'offline', latency: -1 };
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

  // USUARIOS ACTIVOS is a synthetic node representing the end-user/browser layer in the
  // network topology visualisation. It is not a checkable external service; we derive its
  // status from Vercel (the hosting layer end-users hit), so it is always reported online here.
  services['usuarios'] = { status: 'online', latency: 0 };

  const allValues = Object.values(services);
  const withLatency = allValues.filter((s) => s.latency > 0);
  const avgLatency =
    withLatency.length > 0
      ? Math.round(withLatency.reduce((sum, s) => sum + s.latency, 0) / withLatency.length)
      : 0;
  const offlineCount = allValues.filter((s) => s.status === 'offline').length;
  // Uptime only counts services that are actually configured — otherwise brand-new
  // accounts would look permanently degraded.
  const configuredCount = allValues.filter((s) => s.status !== 'unconfigured').length;
  const uptime = configuredCount > 0
    ? Math.round(((configuredCount - offlineCount) / configuredCount) * 1000) / 10
    : 100;

  return NextResponse.json(
    {
      services,
      metrics: {
        avgLatency,
        uptime,
        offlineServices: offlineCount,
        unconfiguredServices: allValues.filter((s) => s.status === 'unconfigured').length,
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
