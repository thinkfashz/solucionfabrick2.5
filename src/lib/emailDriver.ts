import 'server-only';
import type { ReactElement } from 'react';
import { render } from '@react-email/render';
import { getResendCredentials } from '@/lib/resendCredentials';
import WelcomeEmail from '@/emails/WelcomeEmail';
import IntegrationHealthEmail from '@/emails/IntegrationHealthEmail';
import NewsletterEmail from '@/emails/NewsletterEmail';

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  react?: ReactElement;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Core send primitive.
 *
 * Credentials are resolved hybrid-ly: DB first, then Vercel env vars
 * (via getResendCredentials → resolveIntegrationCredentials).
 * Set EMAIL_DRIVER=disabled to suppress all sending (useful in staging).
 * When credentials are not found anywhere, the call is a no-op (simulated).
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (process.env.EMAIL_DRIVER === 'disabled') {
    console.log('[emailDriver] disabled (EMAIL_DRIVER=disabled):', payload.subject);
    return { ok: true, simulated: true };
  }

  const creds = await getResendCredentials();
  if (!creds.ready) {
    console.warn(
      '[emailDriver] Resend not configured (no api_key found in DB or env). Skipping:',
      payload.subject,
    );
    return { ok: true, simulated: true };
  }

  let html = payload.html;
  if (!html && payload.react) {
    html = await render(payload.react);
  }

  const from = payload.from ?? creds.from ?? DEFAULT_FROM;
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: payload.subject,
        html,
        text: payload.text,
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string | null;
  shopUrl: string;
  unsubscribeUrl: string;
  logoUrl?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: '¡Bienvenido a Soluciones Fabrick!',
    react: WelcomeEmail({
      customerName: params.name ?? undefined,
      shopUrl: params.shopUrl,
      unsubscribeUrl: params.unsubscribeUrl,
      logoUrl: params.logoUrl,
    }) as ReactElement,
  });
}

export async function sendAlertEmail(params: {
  to: string;
  subject?: string;
  ranAt: string;
  failures: Array<{
    provider: string;
    error?: string;
    checks?: Array<{ name: string; ok: boolean; detail?: string }>;
    expiringSoon?: boolean;
    expiresAt?: string | null;
  }>;
  dashboardUrl?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: params.subject ?? `[Fabrick] ${params.failures.length} integración(es) con problemas`,
    react: IntegrationHealthEmail({
      ranAt: params.ranAt,
      failures: params.failures,
      dashboardUrl: params.dashboardUrl,
    }) as ReactElement,
  });
}

export async function sendPromoEmail(params: {
  to: string;
  subject: string;
  previewText?: string | null;
  bodyHtml: string;
  unsubscribeUrl: string;
  logoUrl?: string;
  from?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    from: params.from,
    react: NewsletterEmail({
      subject: params.subject,
      previewText: params.previewText ?? null,
      bodyHtml: params.bodyHtml,
      unsubscribeUrl: params.unsubscribeUrl,
      logoUrl: params.logoUrl,
    }) as ReactElement,
  });
}

export async function sendLoginAlertEmail(params: {
  to: string;
  adminEmail: string;
  role: string;
  ip: string;
  device: string;
  location: string;
  loginAt: string;
  usedBackupCode?: boolean;
}): Promise<EmailResult> {
  const dateStr = (() => {
    try {
      return new Date(params.loginAt).toLocaleString('es-CL', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Santiago',
      });
    } catch {
      return params.loginAt;
    }
  })();

  const backupWarning = params.usedBackupCode
    ? `<div style="background:#1a0a00;border:1px solid #7c2d12;border-radius:10px;padding:14px;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;color:#fdba74;">⚠ Se usó un <strong>código de respaldo</strong> para este acceso. Genera nuevos códigos si sospechas de uso no autorizado.</p>
  </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Alerta de acceso</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #222;">
    <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:4px;">FABRICK</div>
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#555;margin-bottom:28px;">Panel de Administración</div>
    <h1 style="font-size:17px;font-weight:800;color:#fff;margin:0 0 6px;">Nuevo acceso detectado</h1>
    <p style="color:#a1a1aa;font-size:13px;margin:0 0 24px;">Tu cuenta <strong style="color:#fff">${params.adminEmail}</strong> (${params.role}) acaba de iniciar sesión.</p>
    <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:18px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="color:#71717a;padding:5px 0;width:110px;">Fecha y hora</td><td style="color:#fff;padding:5px 0;">${dateStr}</td></tr>
        <tr><td style="color:#71717a;padding:5px 0;">IP</td><td style="color:#fff;padding:5px 0;font-family:monospace;">${params.ip}</td></tr>
        <tr><td style="color:#71717a;padding:5px 0;">Dispositivo</td><td style="color:#fff;padding:5px 0;">${params.device}</td></tr>
        <tr><td style="color:#71717a;padding:5px 0;">Ubicación</td><td style="color:#fff;padding:5px 0;">${params.location}</td></tr>
      </table>
    </div>
    ${backupWarning}
    <div style="background:#0f1a0f;border:1px solid #1a3a1a;border-radius:10px;padding:14px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#86efac;">Si fuiste tú, puedes ignorar este mensaje. Si <strong>no reconoces este acceso</strong>, cambia tu contraseña de inmediato.</p>
    </div>
    <p style="color:#3f3f46;font-size:11px;text-align:center;margin:0;">Soluciones Fabrick · Notificación de seguridad automática</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.to,
    subject: `[Fabrick] Nuevo acceso al panel desde ${params.location}`,
    html,
  });
}

export async function sendAdminInviteEmail(params: {
  to: string;
  role: string;
  inviteLink: string;
  codigo?: string;
  invitedBy?: string;
}): Promise<EmailResult> {
  const codigoBlock = params.codigo
    ? `<div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:8px;">Código de verificación</div><div style="font-size:28px;font-weight:900;letter-spacing:6px;color:#facc15;font-family:monospace;">${params.codigo}</div></div>`
    : '';
  const invitedLine = params.invitedBy ? ` por ${params.invitedBy}` : '';
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Invitación al Panel Admin</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #222;">
    <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:32px;">FABRICK Admin</div>
    <h1 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 12px;">Te invitaron al Panel de Administración</h1>
    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Fuiste invitado como <strong style="color:#10b981">${params.role}</strong>${invitedLine}.
    </p>
    ${codigoBlock}
    <a href="${params.inviteLink}" style="display:block;text-align:center;background:#10b981;color:#000;font-weight:700;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:16px;">Crear contraseña →</a>
    <p style="color:#555;font-size:12px;text-align:center;margin:0;">${params.inviteLink}</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.to,
    subject: 'Te invitaron al Panel de Administración — Fabrick',
    html,
  });
}
