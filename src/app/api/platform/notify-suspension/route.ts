/**
 * POST /api/platform/notify-suspension
 *
 * Internal endpoint — called by the expire-trials cron when a tenant is
 * suspended for non-payment. Sends a suspension email with renewal instructions.
 *
 * Requires x-platform-secret header matching PLATFORM_ADMIN_SECRET.
 * Uses Resend if RESEND_API_KEY is configured, otherwise falls back to
 * Nodemailer (SMTP_HOST / SMTP_USER / SMTP_PASS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface NotifySuspensionBody {
  tenant_id: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // Hybrid: credentials resolved from DB first, then Vercel env vars.
  const creds = await getResendCredentials();

  if (creds.ready) {
    const fromAddress = creds.from ?? 'Fabrick Platform <noreply@fabrick.cl>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend ${res.status}: ${body}`);
    }
    return;
  }

  // Nodemailer fallback (SMTP) when Resend is not configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);

  if (!smtpHost || !smtpUser) {
    console.warn('[notify-suspension] No email provider configured (Resend not in DB/env, no SMTP) — skipping suspension email.');
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? smtpUser,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

function buildSuspensionEmail(params: {
  businessName: string;
  ownerName: string | null;
  slug: string;
  ownerEmail: string;
  trialEndsAt: string | null;
  planId: string;
}): { html: string; text: string } {
  const renewUrl = `https://fabrick.cl/registro?plan=${encodeURIComponent(params.planId)}&slug=${encodeURIComponent(params.slug)}`;
  const adminUrl = `https://${params.slug}.fabrick.cl/admin`;
  const greeting = params.ownerName ? `Hola ${params.ownerName}` : 'Hola';
  const trialDate = params.trialEndsAt
    ? new Date(params.trialEndsAt).toLocaleDateString('es-CL', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Cuenta suspendida — Fabrick</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #222;">
    <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:8px;">FABRICK</div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#666;margin-bottom:32px;">Platform</div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:40px;height:40px;border-radius:10px;background:#2d1500;border:1px solid #5c2e00;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⚠️</div>
      <h1 style="font-size:18px;font-weight:800;color:#fff;margin:0;">Cuenta suspendida</h1>
    </div>

    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 8px;">
      ${greeting}, la cuenta de <strong style="color:#fff">${params.businessName}</strong> ha sido suspendida
      porque el período de prueba${trialDate ? ` (vencido el ${trialDate})` : ''} finalizó sin un pago activo.
    </p>
    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#f59e0b">Tus datos se conservan por 30 días.</strong>
      Reactiva tu cuenta antes de que se eliminen permanentemente.
    </p>

    <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:14px;">Pasos para reactivar</div>
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#f59e0b;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
        <p style="margin:0;font-size:13px;color:#bbb;line-height:1.5;">Haz clic en el botón de abajo y elige tu plan.</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#f59e0b;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
        <p style="margin:0;font-size:13px;color:#bbb;line-height:1.5;">Completa el pago en MercadoPago.</p>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#f59e0b;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
        <p style="margin:0;font-size:13px;color:#bbb;line-height:1.5;">Tu acceso se reactiva automáticamente en minutos.</p>
      </div>
    </div>

    <a href="${renewUrl}" style="display:block;text-align:center;background:#f59e0b;color:#000;font-weight:700;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:12px;">
      Renovar suscripción →
    </a>
    <a href="${adminUrl}" style="display:block;text-align:center;background:transparent;color:#555;font-size:12px;padding:10px;border-radius:10px;text-decoration:none;border:1px solid #222;margin-bottom:24px;">
      Ya pagué — entrar al panel
    </a>

    <p style="color:#444;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      ¿Necesitas ayuda? Escríbenos a
      <a href="mailto:soporte@fabrick.cl" style="color:#666;">soporte@fabrick.cl</a>
    </p>
  </div>
</body>
</html>`;

  const text = `
${greeting}, la cuenta de ${params.businessName} ha sido suspendida.

Tu período de prueba${trialDate ? ` (vencido el ${trialDate})` : ''} finalizó sin un pago activo.
Tus datos se conservan por 30 días.

CÓMO REACTIVAR:
1. Ir a: ${renewUrl}
2. Elegir tu plan y completar el pago en MercadoPago.
3. Tu acceso se reactiva automáticamente en minutos.

¿Problemas? Escríbenos a soporte@fabrick.cl
`.trim();

  return { html, text };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-platform-secret');
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as NotifySuspensionBody;
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id requerido.' }, { status: 400 });
    }

    const { data: tenantRows } = await insforge.database
      .from('tenants')
      .select('slug, name, owner_email, owner_name, trial_ends_at, plan_id')
      .eq('id', tenant_id)
      .limit(1);

    if (!tenantRows || tenantRows.length === 0) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });
    }

    const tenant = tenantRows[0] as {
      slug: string; name: string; plan_id: string;
      owner_email: string; owner_name: string | null; trial_ends_at: string | null;
    };

    const { html, text } = buildSuspensionEmail({
      businessName: tenant.name,
      ownerName: tenant.owner_name,
      slug: tenant.slug,
      ownerEmail: tenant.owner_email,
      trialEndsAt: tenant.trial_ends_at,
      planId: tenant.plan_id,
    });

    await sendEmail({
      to: tenant.owner_email,
      subject: `Tu cuenta ${tenant.name} ha sido suspendida — Fabrick`,
      html,
      text,
    });

    await insforge.database.from('admin_error_logs').insert([{
      endpoint: '/api/platform/notify-suspension',
      method: 'POST',
      payload: { tenant_id, slug: tenant.slug },
      error_message: null,
      status_code: 200,
    }]).then(() => void 0, () => void 0);

    return NextResponse.json({ ok: true, sent_to: tenant.owner_email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error enviando notificación.';
    console.error('[notify-suspension]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
