import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { isPushEnabled } from '@/lib/push';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isPushEnabled()) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { endpoint } = (body ?? {}) as { endpoint?: unknown };
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  }

  try {
    const { error } = await insforgeAdmin.database
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    if (error) {
      console.warn('[push/unsubscribe] delete error:', error);
    }
  } catch (err) {
    console.warn('[push/unsubscribe] unexpected:', err);
  }

  return NextResponse.json({ ok: true });
}
