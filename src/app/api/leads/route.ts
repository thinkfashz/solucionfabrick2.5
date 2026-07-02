import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { insforge } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';
import { v, parse, validationError } from '@/lib/validate';

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';
const DEFAULT_NOTIFY_EMAIL = 'faubricioedms@gmail.com';
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

const leadsSchema = {
  nombre:        v.string({ required: true, min: 1, max: 255 }),
  email:         v.email({ required: true, max: 255 }),
  telefono:      v.string({ max: 20 }),
  tipo_proyecto: v.string({ max: 100 }),
  mensaje:       v.string({ max: 2000 }),
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function resolveApiKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function runRawSql(query: string) {
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': resolveApiKey() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

interface NotifyPayload {
  nombre: string;
  email: string;
  telefono?: string;
  tipo_proyecto?: string;
  mensaje?: string;
  createdAt: string;
}

function emailRow(label: string, value: string) {
  return `
    <div style="display:grid;grid-template-columns:140px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.07)">
      <div style="color:#71717a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.18em">${label}</div>
      <div style="color:#fff;font-size:15px;line-height:1.5">${value}</div>
    </div>`;
}

function leadEmailHtml(lead: NotifyPayload) {
  const nombre = escapeHtml(lead.nombre);
  const email = escapeHtml(lead.email);
  const telefonoRaw = lead.telefono || '';
  const telefono = escapeHtml(telefonoRaw || 'No informado');
  const tipo = escapeHtml(lead.tipo_proyecto || 'Consulta general');
  const mensaje = escapeHtml(lead.mensaje || 'Sin mensaje adicional');
  const fecha = escapeHtml(new Date(lead.createdAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
  const wa = telefonoRaw.replace(/[^0-9]/g, '');

  return `
  <!doctype html>
  <html lang="es">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:#050505;padding:24px;font-family:Inter,Arial,sans-serif;color:#f4f4f5">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;border-collapse:collapse">
        <tr><td style="padding:0 0 18px">
          <div style="border:1px solid rgba(250,204,21,.25);background:linear-gradient(135deg,#090909,#14110a);border-radius:28px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,.35)">
            <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;font-weight:900;color:#fff">SOLUCIONES <span style="color:#facc15">FABRICK</span></div>
            <div style="height:4px;width:72px;border-radius:99px;background:#facc15;margin:18px 0"></div>
            <p style="margin:0;color:#facc15;font-size:11px;letter-spacing:.32em;text-transform:uppercase;font-weight:900">Nuevo lead web</p>
            <h1 style="margin:10px 0 0;font-size:30px;line-height:1.05;color:#fff">${nombre} quiere orientación</h1>
            <p style="margin:14px 0 0;color:#a1a1aa;font-size:15px;line-height:1.7">Resumen listo para responder, guardar en CRM y convertir la consulta en una cotización real.</p>
          </div>
        </td></tr>
        <tr><td>
          <div style="border:1px solid rgba(255,255,255,.10);background:#0b0b0b;border-radius:24px;padding:22px">
            ${emailRow('Nombre', nombre)}
            ${emailRow('Correo', `<a href="mailto:${email}" style="color:#facc15;text-decoration:none">${email}</a>`)}
            ${emailRow('Teléfono', telefonoRaw ? `<a href="tel:${telefono}" style="color:#facc15;text-decoration:none">${telefono}</a>` : telefono)}
            ${emailRow('Necesidad', tipo)}
            ${emailRow('Fecha', fecha)}
            <div style="margin-top:18px;padding:18px;border:1px solid rgba(250,204,21,.18);background:rgba(250,204,21,.06);border-radius:18px">
              <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-weight:900;margin-bottom:10px">Mensaje del cliente</div>
              <div style="white-space:pre-wrap;color:#e4e4e7;font-size:15px;line-height:1.7">${mensaje}</div>
            </div>
            <div style="margin-top:22px">
              <a href="mailto:${email}" style="display:inline-block;background:#facc15;color:#000;text-decoration:none;font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:11px;padding:14px 18px;border-radius:999px">Responder correo</a>
              ${wa ? `<a href="https://wa.me/${wa}" style="display:inline-block;margin-left:8px;border:1px solid rgba(250,204,21,.35);color:#facc15;text-decoration:none;font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:11px;padding:14px 18px;border-radius:999px">WhatsApp</a>` : ''}
            </div>
          </div>
        </td></tr>
        <tr><td style="padding:18px 8px 0;color:#71717a;font-size:12px;line-height:1.6;text-align:center">Lead guardado desde formulario web y enviado al CRM del admin. Recomendación: responder en menos de 24h.</td></tr>
      </table>
    </body>
  </html>`;
}

async function notifyAdminByEmail(lead: NotifyPayload): Promise<void> {
  const to = (process.env.LEADS_NOTIFY_EMAIL || process.env.ADMIN_ALERT_EMAIL || DEFAULT_NOTIFY_EMAIL).trim();
  const creds = await getResendCredentials();
  if (!creds) {
    console.warn('[leads] Resend no configurado — no se envía email.');
    return;
  }

  try {
    const resend = new Resend(creds.apiKey);
    const { error } = await resend.emails.send({
      from: creds.from ?? process.env.RESEND_FROM ?? DEFAULT_FROM,
      to,
      replyTo: lead.email,
      subject: `Nuevo lead Fabrick · ${lead.nombre}${lead.tipo_proyecto ? ' · ' + lead.tipo_proyecto : ''}`,
      html: leadEmailHtml(lead),
    });
    if (error) console.error('[leads] Resend error:', error);
  } catch (err) {
    console.error('[leads] Resend exception:', err);
  }
}

async function persistCrmLead(lead: NotifyPayload): Promise<boolean> {
  try {
    const setup = await runRawSql(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        value BIGINT DEFAULT 0,
        stage TEXT DEFAULT 'Contacto inicial',
        probability INTEGER DEFAULT 20,
        notes TEXT DEFAULT '',
        next_action TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    if (!setup.ok) throw new Error('No se pudo crear crm_leads');

    const notes = [`Tipo: ${lead.tipo_proyecto || 'Consulta general'}`, `Mensaje: ${lead.mensaje || 'Sin mensaje adicional'}`, 'Origen: formulario principal web'].join('\n\n');
    const insert = await runRawSql(`
      INSERT INTO crm_leads (name, contact, email, phone, company, value, stage, probability, notes, next_action)
      VALUES (${sqlText(lead.nombre)}, ${sqlText(lead.nombre)}, ${sqlText(lead.email)}, ${sqlText(lead.telefono || '')}, ${sqlText('Formulario web')}, 0, ${sqlText('Contacto inicial')}, 20, ${sqlText(notes)}, ${sqlText('Responder en menos de 24h')})
    `);
    if (!insert.ok) throw new Error('No se pudo insertar CRM lead');
    return true;
  } catch (err) {
    console.error('[leads] CRM persist failed:', err);
    return false;
  }
}

export async function POST(request: Request) {
  let raw: Record<string, unknown> = {};
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) raw = (await request.json()) as Record<string, unknown>;
    else if (contentType.includes('form')) {
      const form = await request.formData();
      raw = Object.fromEntries(form.entries()) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 });
  }

  const result = parse(leadsSchema, raw);
  if (!result.ok) return validationError(result.errors);

  const { nombre, email, telefono, tipo_proyecto, mensaje } = result.data as {
    nombre: string;
    email: string;
    telefono?: string;
    tipo_proyecto?: string;
    mensaje?: string;
  };

  const payload = { nombre, email, telefono, tipo_proyecto, mensaje };
  let dbStored = true;
  try {
    const { error } = await insforge.database.from('leads').insert([payload]);
    if (error) {
      console.error('[leads] Database insert failed:', error);
      dbStored = false;
    }
  } catch (err) {
    console.error('[leads] Database insert exception:', err);
    dbStored = false;
  }

  const notifyPayload = { nombre, email, telefono, tipo_proyecto, mensaje, createdAt: new Date().toISOString() };
  const crmStored = await persistCrmLead(notifyPayload);
  await notifyAdminByEmail(notifyPayload);

  return NextResponse.json(
    { ok: true, queued: !dbStored, crmStored, mensaje: 'Recibimos tu solicitud. Te contactamos en menos de 24 horas.' },
    { status: dbStored || crmStored ? 201 : 202 },
  );
}
