import 'server-only';
import { marked } from 'marked';
import { insforgeAdmin } from '@/lib/insforge';
import {
  buildUnsubscribeLink,
  listConfirmedSubscribers,
  type NewsletterCampaignRow,
} from '@/lib/newsletter';
import { getResendCredentials } from '@/lib/resendCredentials';
import { sendPromoEmail } from '@/lib/emailDriver';

/**
 * Ejecuta una promesa (o un query-builder thenable de InsForge) y
 * suprime cualquier error. Útil para escrituras best-effort donde un
 * fallo no debe abortar el flujo principal (logs, métricas).
 */
const swallow = async (p: unknown): Promise<void> => {
  try { await (p as Promise<unknown>); } catch { /* ignore */ }
};

interface SendResult {
  campaignId: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

function pickLogoUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/+$/, '')}/logo.png`;
  return undefined;
}

function configureMarked(): void {
  marked.setOptions({ gfm: true, breaks: true });
}

async function fetchCampaign(id: string): Promise<NewsletterCampaignRow | null> {
  const { data, error } = await insforgeAdmin.database
    .from('newsletter_campaigns')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as NewsletterCampaignRow;
}

async function alreadySent(campaignId: string): Promise<Set<string>> {
  try {
    const { data } = await insforgeAdmin.database
      .from('newsletter_sends')
      .select('subscriber_email')
      .eq('campaign_id', campaignId)
      .limit(10_000);
    return new Set((data ?? []).map((r: { subscriber_email?: string }) => r.subscriber_email ?? ''));
  } catch {
    return new Set();
  }
}

/**
 * Envía una campaña a todos los suscriptores confirmados que aún no la
 * recibieron. Idempotente: si se llama dos veces, sólo envía a los
 * pendientes.
 */
export async function sendCampaign(campaignId: string): Promise<SendResult> {
  configureMarked();
  const campaign = await fetchCampaign(campaignId);
  if (!campaign) throw new Error(`Campaña ${campaignId} no encontrada`);
  if (campaign.status === 'sent') {
    return { campaignId, attempted: 0, sent: 0, failed: 0, skipped: 0, errors: ['ya enviada'] };
  }

  const creds = await getResendCredentials();
  if (!creds.ready) {
    await insforgeAdmin.database
      .from('newsletter_campaigns')
      .update({
        status: 'failed',
        last_error: 'Resend no está configurado. Agrega la API Key en /admin/integraciones.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    throw new Error('Resend no está configurado. Agrega la API Key en /admin/integraciones.');
  }

  await insforgeAdmin.database
    .from('newsletter_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaignId);

  const subscribers = await listConfirmedSubscribers(5000);
  const skipSet = await alreadySent(campaignId);
  const targets = subscribers.filter((s) => !skipSet.has(s.email));

  const from = creds.from ?? 'Soluciones Fabrick <onboarding@resend.dev>';
  const logoUrl = pickLogoUrl();

  const bodyHtml = marked.parse(campaign.body_md, { async: false }) as string;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend recomienda <=10 req/s — 110ms entre envíos lo respeta.
  for (const sub of targets) {
    const unsubscribeUrl = buildUnsubscribeLink(sub.email);
    try {
      const result = await sendPromoEmail({
        to: sub.email,
        subject: campaign.subject,
        previewText: campaign.preview_text ?? null,
        bodyHtml,
        unsubscribeUrl,
        logoUrl,
        from,
      });
      if (!result.ok) {
        failed += 1;
        errors.push(`${sub.email}: ${result.error ?? 'error'}`);
        await swallow(
          insforgeAdmin.database
            .from('newsletter_sends')
            .insert([{ campaign_id: campaignId, subscriber_email: sub.email, status: 'failed', error: result.error ?? '' }]),
        );
      } else {
        sent += 1;
        await swallow(
          insforgeAdmin.database
            .from('newsletter_sends')
            .insert([
              {
                campaign_id: campaignId,
                subscriber_email: sub.email,
                status: result.simulated ? 'simulated' : 'sent',
                resend_id: result.id ?? null,
              },
            ]),
        );
        await swallow(
          insforgeAdmin.database
            .from('newsletter_subscribers')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('email', sub.email),
        );
      }
    } catch (err) {
      failed += 1;
      errors.push(`${sub.email}: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 110));
  }

  const finalStatus = failed === 0 ? 'sent' : sent > 0 ? 'sent' : 'failed';
  await insforgeAdmin.database
    .from('newsletter_campaigns')
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      sent_count: (campaign.sent_count ?? 0) + sent,
      failed_count: (campaign.failed_count ?? 0) + failed,
      total_recipients: subscribers.length,
      last_error: errors[0]?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return {
    campaignId,
    attempted: targets.length,
    sent,
    failed,
    skipped: subscribers.length - targets.length,
    errors: errors.slice(0, 10),
  };
}
