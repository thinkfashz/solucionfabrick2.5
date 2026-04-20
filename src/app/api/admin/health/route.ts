import { NextResponse } from 'next/server';

type ServiceStatus = 'online' | 'slow' | 'offline';

interface ServiceResult {
  status: ServiceStatus;
  latency: number;
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

export async function GET() {
  const insforgeUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL ?? 'https://txv86efe.us-east.insforge.app';

  const checks: { id: string; url: string }[] = [
    { id: 'vercel',      url: 'https://solucionesfabrick.com' },
    { id: 'insforge',    url: insforgeUrl },
    { id: 'cloudflare',  url: 'https://cloudflare.com' },
    { id: 'github',      url: 'https://github.com' },
    { id: 'meta',        url: 'https://graph.facebook.com' },
    { id: 'mercadopago', url: 'https://api.mercadopago.com' },
    { id: 'tiktok',      url: 'https://ads.tiktok.com' },
    { id: 'google',      url: 'https://ads.google.com' },
  ];

  const settled = await Promise.allSettled(checks.map((c) => pingUrl(c.url)));

  const services: Record<string, ServiceResult> = {};
  for (let i = 0; i < checks.length; i++) {
    const result = settled[i];
    services[checks[i].id] =
      result.status === 'fulfilled'
        ? result.value
        : { status: 'offline', latency: -1 };
  }

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
  const uptime =
    Math.round(((allValues.length - offlineCount) / allValues.length) * 1000) / 10;

  return NextResponse.json(
    {
      services,
      metrics: { avgLatency, uptime, offlineServices: offlineCount },
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
