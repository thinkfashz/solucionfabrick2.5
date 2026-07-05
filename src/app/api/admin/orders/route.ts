import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { normalizeOrderRecord } from '@/lib/commerce';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHIPMENT_QUEUE = new Set(['pendiente', 'confirmado', 'en_preparacion', 'enviado']);

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'all';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 80), 1), 200);

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : []).map((row) => {
    const raw = row as Record<string, unknown>;
    const normalized = normalizeOrderRecord(raw);
    return {
      ...normalized,
      tracking_number: typeof raw.tracking_number === 'string' ? raw.tracking_number : '',
      carrier: typeof raw.carrier === 'string' ? raw.carrier : '',
      shipping_notes: typeof raw.shipping_notes === 'string' ? raw.shipping_notes : '',
      status_email_sent_at: typeof raw.status_email_sent_at === 'string' ? raw.status_email_sent_at : '',
      status_email_last_status: typeof raw.status_email_last_status === 'string' ? raw.status_email_last_status : '',
    };
  });

  const orders = scope === 'shipping' ? rows.filter((row) => SHIPMENT_QUEUE.has(row.status)) : rows;

  return NextResponse.json({ ok: true, orders, total: orders.length, scope }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
