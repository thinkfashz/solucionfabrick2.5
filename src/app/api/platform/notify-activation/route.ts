/**
 * POST /api/platform/notify-activation
 *
 * Internal endpoint — called by the subscription webhook after a tenant
 * is provisioned. Sends a welcome email with login instructions and the
 * temporary password.
 *
 * Requires x-platform-secret header matching PLATFORM_ADMIN_SECRET.
 * Uses Resend if RESEND_API_KEY is configured, otherwise falls back to
 * Nodemailer (SMTP_HOST / SMTP_USER / SMTP_PASS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';

interface NotifyBody {
  tenant_id: string;
  temp_password?: string;
  already_existed?: boolean;
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
    console.warn('[notify-activation] No email provider configured (Resend not in DB/env, no SMTP) — skipping welcome email.');
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

function buildWelcomeEmail(params: {
  businessName: string;
  ownerName: string | null;
  slug: string;
  ownerEmail: string;
  tempPassword: string;
  planName: string;
}): { html: string; text: string } {
  const adminUrl = `https://${params.slug}.fabrick.cl/admin`;
  const storeUrl = `https://${params.slug}.fabrick.cl`;
  const greeting = params.ownerName ? `Hola ${params.ownerName}` : 'Hola';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Bienvenido a Fabrick</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #222;">
    <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:8px;">FABRICK</div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#666;margin-bottom:32px;">Platform</div>

    <h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 8px;">${greeting}, ¡tu plataforma está lista!</h1>
    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#fff">${params.businessName}</strong> acaba de ser activada en el plan
      <strong style="color:#10b981">${params.planName}</strong>.
    </p>

    <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:12px;">Tus credenciales</div>
      <div style="margin-bottom:8px;">
        <span style="color:#666;font-size:12px;">URL del panel:</span><br>
        <a href="${adminUrl}" style="color:#10b981;font-size:13px;font-weight:600;">${adminUrl}</a>
      </div>
      <div style="margin-bottom:8px;">
        <span style="color:#666;font-size:12px;">Email:</span><br>
        <span style="color:#fff;font-size:13px;font-weight:600;">${params.ownerEmail}</span>
      </div>
      <div>
        <span style="color:#666;font-size:12px;">Contraseña temporal:</span><br>
        <span style="color:#facc15;font-size:16px;font-weight:800;letter-spacing:2px;font-family:monospace;">${params.tempPassword}</span>
      </div>
    </div>

    <div style="background:#0f2b1d;border:1px solid #1a4a30;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#86efac;">
        ⚠️ <strong>Cambia tu contraseña</strong> la primera vez que entres al panel. Esta es una contraseña temporal generada automáticamente.
      </p>
    </div>

    <a href="${adminUrl}" style="display:block;text-align:center;background:#10b981;color:#000;font-weight:700;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Entrar al panel →
    </a>

    <p style="color:#555;font-size:12px;text-align:center;margin:0;">
      Tu tienda pública: <a href="${storeUrl}" style="color:#666;">${storeUrl}</a>
    </p>
  </div>
</body>
</html>`;

  const text = `
${greeting}, ¡tu plataforma está lista!

${params.businessName} ha sido activada en el plan ${params.planName}.

CREDENCIALES:
  Panel admin: ${adminUrl}
  Email: ${params.ownerEmail}
  Contraseña temporal: ${params.tempPassword}

Cambia tu contraseña al ingresar por primera vez.

Tu tienda: ${storeUrl}
`.trim();

  return { html, text };
}

export async function POST(request: NextRequest) {
  // Verify internal secret
  const secret = request.headers.get('x-platform-secret');
  const expected = process.env.PLATFORM_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as NotifyBody;
    const { tenant_id, temp_password, already_existed } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id requerido.' }, { status: 400 });
    }

    // Skip if this was a re-activation of an already-provisioned tenant
    if (already_existed) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_existed' });
    }

    if (!temp_password) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_temp_password' });
    }

    // Fetch tenant data
    const { data: tenantRows } = await insforge.database
      .from('tenants')
      .select('slug, name, owner_email, owner_name, plan_id')
      .eq('id', tenant_id)
      .limit(1);

    if (!tenantRows || tenantRows.length === 0) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });
    }

    const tenant = tenantRows[0] as {
      slug: string; name: string;
      owner_email: string; owner_name: string | null; plan_id: string;
    };

    // Fetch plan name
    const { data: planRows } = await insforge.database
      .from('platform_plans').select('name').eq('id', tenant.plan_id).limit(1);
    const planName = (planRows?.[0] as { name: string } | undefined)?.name ?? tenant.plan_id;

    const { html, text } = buildWelcomeEmail({
      businessName: tenant.name,
      ownerName: tenant.owner_name,
      slug: tenant.slug,
      ownerEmail: tenant.owner_email,
      tempPassword: temp_password,
      planName,
    });

    await sendEmail({
      to: tenant.owner_email,
      subject: `¡Tu plataforma ${tenant.name} está lista! — Fabrick`,
      html,
      text,
    });

    // Log to admin_error_logs for audit purposes
    await insforge.database.from('admin_error_logs').insert([{
      endpoint: '/api/platform/notify-activation',
      method: 'POST',
      payload: { tenant_id, slug: tenant.slug, plan: planName },
      error_message: null,
      status_code: 200,
    }]).then(() => void 0, () => void 0);

    return NextResponse.json({ ok: true, sent_to: tenant.owner_email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error enviando notificación.';
    console.error('[notify-activation]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
