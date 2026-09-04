import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TrackPayload {
  event: string;
  user_id?: string | null;
  platform?: string | null;
  meta?: Record<string, unknown>;
}

const ALLOWED_EVENTS = new Set([
  'install_prompt_available', 'install_prompt_shown', 'install_accepted', 'install_dismissed',
  'install_banner_dismissed', 'installed', 'push_granted', 'push_denied', 'push_unsubscribed',
  'onboarding_started', 'onboarding_completed', 'onboarding_skipped', 'page_view', 'session_end',
  'budget_category_selected', 'budget_service_selected', 'budget_service_added',
  'budget_product_added', 'budget_receipt_viewed', 'budget_submitted', 'budget_whatsapp_opened',
]);

function ipHash(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  if (!forwarded) return null;
  const salt = process.env.ANALYTICS_IP_SALT || process.env.ADMIN_JWT_SECRET || 'fabrick-anonymous-analytics';
  return createHash('sha256').update(`${salt}:${forwarded}`).digest('hex').slice(0, 16);
}

function botType(userAgent: string | null) {
  if (!userAgent) return 'unknown';
  return /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|googlebot|bingbot/i.test(userAgent) ? 'bot' : 'human';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<TrackPayload>;
    const event = typeof body.event === 'string' ? body.event.trim() : '';
    if (!event || event.length > 64 || !ALLOWED_EVENTS.has(event)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

    const ua = request.headers.get('user-agent')?.slice(0, 255) ?? null;
    const platform = typeof body.platform === 'string' ? body.platform.slice(0, 64) : null;
    const incomingMeta = body.meta && typeof body.meta === 'object' ? body.meta : {};
    const meta = {
      ...incomingMeta,
      ip_hash: ipHash(request),
      visitor_type: botType(ua),
      country: request.headers.get('x-vercel-ip-country') || null,
      region: request.headers.get('x-vercel-ip-country-region') || null,
      city: request.headers.get('x-vercel-ip-city') || null,
    };

    try {
      await insforgeAdmin.database.from('pwa_events').insert([{
        event,
        user_id: typeof body.user_id === 'string' ? body.user_id.slice(0, 64) : null,
        ua,
        platform,
        meta,
        created_at: new Date().toISOString(),
      }]);
    } catch (insertError) {
      console.warn('[pwa/track] insert failed:', insertError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'track_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
