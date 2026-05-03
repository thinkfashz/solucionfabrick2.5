import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/social/inbox
 *
 * Lista mensajes recibidos por el inbox social (poblado por los
 * webhooks en /api/admin/social/webhook/[provider]). Devuelve los más
 * recientes primero, agrupables por `thread_id` desde el cliente.
 *
 * Query params:
 *   provider — opcional, filtra por instagram|facebook|tiktok|whatsapp.
 *   limit    — 1..200, default 50.
 *   thread   — opcional, devuelve sólo el hilo indicado.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
    const thread = url.searchParams.get('thread');
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? '50') || 50));

    const client = getAdminInsforge();
    let q = client.database
      .from('social_messages')
      .select(
        'id, provider, thread_id, external_id, sender, sender_name, text, attachments, received_at, read_at, replied_at, customer_match',
      );
    if (provider) q = q.eq('provider', provider);
    if (thread) q = q.eq('thread_id', thread);

    // The SDK's chained .order().limit() throws when the table is missing,
    // so we catch and degrade to "empty inbox" instead of leaking a 500.
    try {
      const { data, error } = await q.order('received_at', { ascending: false }).limit(limit);
      if (error) {
        return NextResponse.json({ messages: [], note: 'Tabla social_messages no existe aún. Corre la migración.' });
      }
      return NextResponse.json({ messages: Array.isArray(data) ? data : [] });
    } catch {
      return NextResponse.json({ messages: [], note: 'Tabla social_messages no existe aún. Corre la migración.' });
    }
  } catch (err) {
    return adminError(err, 'SOCIAL_INBOX_LIST_FAILED');
  }
}
