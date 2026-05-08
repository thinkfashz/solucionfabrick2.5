import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';

/**
 * POST /api/leads  — Store contact/quote requests from the public contact form.
 *
 * Expected body:
 *   {
 *     nombre: string,
 *     email: string,
 *     telefono?: string,
 *     tipo_proyecto?: string,
 *     mensaje?: string,
 *   }
 *
 * Writes to the `leads` table in InsForge **and** notifies the admin via
 * Resend (best-effort; failures are logged but never break the public form).
 *
 * Required env / config:
 *  - `RESEND_API_KEY` (or Resend integration in /admin/integraciones)
 *  - `LEADS_NOTIFY_EMAIL` (or `ADMIN_ALERT_EMAIL` as fallback) — destinatario
 *  - `RESEND_FROM` — opcional; default sandbox `onboarding@resend.dev`
 */

interface LeadBody {
  nombre?: string;
  email?: string;
  telefono?: string;
  tipo_proyecto?: string;
  mensaje?: string;
}

const MAX = {
  nombre: 255,
  email: 255,
  telefono: 20,
  tipo_proyecto: 100,
  mensaje: 2000,
};

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

function sanitize(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface NotifyPayload {
  nombre: string;
  email: string;
  telefono?: string;
  tipo_proyecto?: string;
  mensaje?: string;
}

/**
 * Envía el correo de notificación al admin. Best-effort: cualquier error se
 * registra en consola pero no rompe el flujo del formulario público.
 */
async function notifyAdminByEmail(lead: NotifyPayload): Promise<void> {
  const to = (
    process.env.LEADS_NOTIFY_EMAIL ||
    process.env.ADMIN_ALERT_EMAIL ||
    ''
  ).trim();
  if (!to) {
    console.warn('[leads] LEADS_NOTIFY_EMAIL/ADMIN_ALERT_EMAIL no configurado — el lead se guardó, pero el admin no recibirá email.');
    return;
  }

  const creds = await getResendCredentials();
  if (!creds) {
    console.warn('[leads] Resend no configurado — no se envía email.');
    return;
  }

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:32px;border-radius:16px;max-width:560px;margin:0 auto">
      <p style="color:#facc15;font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin:0 0 8px">Nuevo lead · Soluciones Fabrick</p>
      <h2 style="font-size:22px;margin:0 0 18px;color:#fff">Solicitud de contacto recibida</h2>
      <table cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="color:#a1a1aa;width:140px"><b>Nombre</b></td><td>${escapeHtml(lead.nombre)}</td></tr>
        <tr><td style="color:#a1a1aa"><b>Email</b></td><td><a href="mailto:${escapeHtml(lead.email)}" style="color:#facc15">${escapeHtml(lead.email)}</a></td></tr>
        <tr><td style="color:#a1a1aa"><b>Teléfono</b></td><td>${escapeHtml(lead.telefono ?? '—')}</td></tr>
        <tr><td style="color:#a1a1aa"><b>Tipo</b></td><td>${escapeHtml(lead.tipo_proyecto ?? '—')}</td></tr>
        <tr><td style="color:#a1a1aa;vertical-align:top"><b>Mensaje</b></td><td style="white-space:pre-wrap">${escapeHtml(lead.mensaje ?? '—')}</td></tr>
      </table>
      <p style="color:#71717a;font-size:11px;margin-top:24px">Responde directamente a este correo o llama al cliente cuanto antes — la promesa pública es 24 h.</p>
    </div>
  `;

  const subject = `Nuevo lead Fabrick · ${lead.nombre}${lead.tipo_proyecto ? ' · ' + lead.tipo_proyecto : ''}`;

  try {
    const resend = new Resend(creds.apiKey);
    const { error } = await resend.emails.send({
      from: creds.from ?? DEFAULT_FROM,
      to,
      replyTo: lead.email,
      subject,
      html,
    });
    if (error) console.error('[leads] Resend error:', error);
  } catch (err) {
    console.error('[leads] Resend exception:', err);
  }
}

export async function POST(request: Request) {
  let body: LeadBody = {};
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = (await request.json()) as LeadBody;
    } else if (contentType.includes('form')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as unknown as LeadBody;
    }
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 });
  }

  const nombre = sanitize(body.nombre, MAX.nombre);
  const email = sanitize(body.email, MAX.email);
  const telefono = sanitize(body.telefono, MAX.telefono);
  const tipo_proyecto = sanitize(body.tipo_proyecto, MAX.tipo_proyecto);
  const mensaje = sanitize(body.mensaje, MAX.mensaje);

  if (!nombre || !email) {
    return NextResponse.json(
      { error: 'Nombre y correo son obligatorios.' },
      { status: 400 },
    );
  }

  // Very light e-mail shape check (no regex runaway).
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'El correo no parece válido.' }, { status: 400 });
  }

  const payload = {
    nombre,
    email,
    telefono,
    tipo_proyecto,
    mensaje,
    estado: 'nuevo',
  };

  let dbStored = true;
  try {
    const { error } = await insforge.database.from('leads').insert([payload]);
    if (error) {
      // La tabla `leads` puede aún no existir — degradamos sin romper el form.
      // Logueamos el error real para diagnosticar conexiones/permisos vs.
      // simplemente "tabla inexistente".
      console.error('[leads] Database insert failed:', error);
      dbStored = false;
    }
  } catch (err) {
    console.error('[leads] Database insert exception:', err);
    dbStored = false;
  }

  // Notificación por correo — corre en paralelo con la respuesta para que la
  // UX siga siendo rápida, pero esperamos para que en serverless no se corte
  // el container antes de enviar.
  await notifyAdminByEmail({ nombre, email, telefono, tipo_proyecto, mensaje });

  return NextResponse.json(
    {
      ok: true,
      queued: !dbStored,
      mensaje: 'Recibimos tu solicitud. Te contactamos en menos de 24 horas.',
    },
    { status: dbStored ? 201 : 202 },
  );
}
