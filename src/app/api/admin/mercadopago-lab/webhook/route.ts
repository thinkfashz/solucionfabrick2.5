import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { appendMercadoPagoLabEvent, mpLabFetch } from '@/lib/mercadoPagoLab';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MaybeRecord = Record<string, unknown>;

function valueAsString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function extractPaymentId(query: URLSearchParams, body: unknown) {
  const bodyObj = typeof body === 'object' && body ? body as MaybeRecord : {};
  const data = typeof bodyObj.data === 'object' && bodyObj.data ? bodyObj.data as MaybeRecord : {};
  return (
    query.get('data.id') ||
    query.get('id') ||
    valueAsString(data.id) ||
    valueAsString(bodyObj.id) ||
    valueAsString(bodyObj.resource)?.split('/').pop()
  );
}

function queryRecord(query: URLSearchParams) {
  const out: Record<string, string> = {};
  query.forEach((value, key) => { out[key] = value; });
  return out;
}

async function readBody(request: NextRequest) {
  const text = await request.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await readBody(request) : null;
  const bodyObj = typeof body === 'object' && body ? body as MaybeRecord : {};
  const paymentId = extractPaymentId(url.searchParams, body);
  let payment: unknown = null;
  if (paymentId) {
    try {
      payment = await mpLabFetch<Record<string, unknown>>(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
    } catch {
      payment = null;
    }
  }

  const event = {
    id: `mp_lab_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    method: request.method,
    query: queryRecord(url.searchParams),
    body,
    paymentId: paymentId || undefined,
    topic: valueAsString(bodyObj.topic) || url.searchParams.get('topic') || undefined,
    type: valueAsString(bodyObj.type) || url.searchParams.get('type') || undefined,
    action: valueAsString(bodyObj.action) || undefined,
    userId: valueAsString(bodyObj.user_id) || undefined,
    liveMode: typeof bodyObj.live_mode === 'boolean' ? bodyObj.live_mode : undefined,
    payment,
  };

  await appendMercadoPagoLabEvent(event);
  return NextResponse.json({ ok: true, received: true, paymentId: paymentId || null });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
