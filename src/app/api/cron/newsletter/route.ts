import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { sendCampaign } from '@/lib/newsletterSender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/newsletter
 *
 * Disparado por Vercel Cron (config en vercel.json). Levanta cualquier
 * campaña con `status='scheduled'` y `scheduled_at <= now()` y la
 * envía a través de Resend. Es seguro re-correrlo: el sender es
 * idempotente por `(campaign_id, subscriber_email)`.
 *
 * Auth:
 *  - `Authorization: Bearer $CRON_SECRET` (Vercel Cron lo envía
 *    automáticamente cuando defines `CRON_SECRET` como env var).
 *  - O sesión admin válida (para disparo manual desde browser).
 */
function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // Buscar campañas vencidas
  const now = new Date().toISOString();
  let due: Array<{ id: string }> = [];
  try {
    const { data } = await insforgeAdmin.database
      .from('newsletter_campaigns')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(20);
    due = (data ?? []) as Array<{ id: string }>;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const results = [];
  for (const c of due) {
    try {
      const r = await sendCampaign(c.id);
      results.push({ id: c.id, ok: true, ...r });
    } catch (err) {
      results.push({ id: c.id, ok: false, error: (err as Error).message });
    }
  }
  return NextResponse.json({ ran_at: now, processed: results.length, results });
}
