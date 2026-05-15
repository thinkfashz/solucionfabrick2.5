import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { isPushEnabled } from '@/lib/push';
import { v, parse, validationError } from '@/lib/validate';

export const runtime = 'nodejs';

const schema = {
  endpoint: v.url({ required: true, max: 2048 }),
};

export async function POST(request: Request) {
  if (!isPushEnabled()) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const result = parse(schema, body);
  if (!result.ok) return validationError(result.errors);

  const { endpoint } = result.data as { endpoint: string };

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
