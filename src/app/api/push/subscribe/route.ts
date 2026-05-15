import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { isPushEnabled, isValidSubscription } from '@/lib/push';
import { v, parse, validationError } from '@/lib/validate';

export const runtime = 'nodejs';

const schema = {
  subscription: v.object({ required: true }),
};

export async function POST(request: Request) {
  if (!isPushEnabled()) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const result = parse(schema, body);
  if (!result.ok) return validationError(result.errors);

  const { subscription } = result.data as { subscription?: unknown };
  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ error: 'Suscripción push inválida.' }, { status: 422 });
  }

  const record = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get('user-agent') ?? null,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await insforgeAdmin.database
      .from('push_subscriptions')
      .insert([record]);
    if (error) {
      const message = error.message ?? '';
      if (/relation|does not exist|not found/i.test(message)) {
        console.warn('[push/subscribe] push_subscriptions table missing:', message);
        return NextResponse.json({ ok: false, warning: 'storage_unavailable' }, { status: 202 });
      }
      if (/duplicate|unique/i.test(message)) {
        return NextResponse.json({ ok: true, deduped: true });
      }
      console.error('[push/subscribe] insert error:', error);
      return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
    }
  } catch (err) {
    console.error('[push/subscribe] unexpected:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
