import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSession, ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { isPushEnabled, sendPush, type PushPayload } from '@/lib/push';
import type { PushSubscription } from 'web-push';

export const runtime = 'nodejs';

interface SubscriptionRow {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function toPushSubscription(row: SubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

export async function POST(request: Request) {
  if (!isPushEnabled()) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  const sessionCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const session = sessionCookie ? await decodeSession(sessionCookie) : null;
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = (body ?? {}) as Partial<PushPayload>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const bodyText = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (!title || !bodyText) {
    return NextResponse.json({ error: '`title` and `body` are required' }, { status: 400 });
  }

  const payload: PushPayload = {
    title: title.slice(0, 120),
    body: bodyText.slice(0, 400),
    url: typeof raw.url === 'string' ? raw.url : '/',
    icon: typeof raw.icon === 'string' ? raw.icon : '/icon-192.png',
    tag: typeof raw.tag === 'string' ? raw.tag : 'fabrick-broadcast',
  };

  let rows: SubscriptionRow[] = [];
  try {
    const { data, error } = await insforgeAdmin.database
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');
    if (error) {
      console.error('[push/send] fetch subscriptions failed:', error);
      return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
    }
    rows = (data as SubscriptionRow[] | null) ?? [];
  } catch (err) {
    console.error('[push/send] unexpected:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }

  let sent = 0;
  let removed = 0;
  let failed = 0;
  const goneIds: string[] = [];

  for (const row of rows) {
    const result = await sendPush(toPushSubscription(row), payload);
    if (result === 'ok') sent += 1;
    else if (result === 'gone') {
      removed += 1;
      if (row.id) goneIds.push(row.id);
    } else failed += 1;
  }

  if (goneIds.length > 0) {
    try {
      await insforgeAdmin.database
        .from('push_subscriptions')
        .delete()
        .in('id', goneIds);
    } catch (err) {
      console.warn('[push/send] cleanup failed:', err);
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, sent, removed, failed });
}
