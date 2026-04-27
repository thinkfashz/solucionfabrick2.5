import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

/**
 * Lightweight beacon endpoint for PWA adoption analytics. Stores anonymous
 * events (install prompt shown / accepted / dismissed, push granted, etc.) in
 * the `pwa_events` table. Designed to be no-op safe — never throws to the
 * client and never blocks navigation.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TrackPayload {
  event: string;
  user_id?: string | null;
  platform?: string | null;
  meta?: Record<string, unknown>;
}

const ALLOWED_EVENTS = new Set([
  'install_prompt_available',
  'install_prompt_shown',
  'install_accepted',
  'install_dismissed',
  'install_banner_dismissed',
  'installed',
  'push_granted',
  'push_denied',
  'push_unsubscribed',
  'onboarding_started',
  'onboarding_completed',
  'onboarding_skipped',
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<TrackPayload>;
    const event = typeof body.event === 'string' ? body.event.trim() : '';
    if (!event || event.length > 64 || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
    }

    const ua = request.headers.get('user-agent')?.slice(0, 255) ?? null;
    const platform = typeof body.platform === 'string' ? body.platform.slice(0, 64) : null;
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : null;

    try {
      await insforge.database.from('pwa_events').insert([
        {
          event,
          user_id: typeof body.user_id === 'string' ? body.user_id.slice(0, 64) : null,
          ua,
          platform,
          meta,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (insertErr) {
      // Swallow DB errors so analytics never breaks the app. Surface in logs.
      // eslint-disable-next-line no-console
      console.warn('[pwa/track] insert failed:', insertErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'track_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
