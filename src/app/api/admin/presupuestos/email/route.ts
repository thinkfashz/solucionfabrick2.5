export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { PresupuestoPro } from '@/lib/presupuestosBuilder';
import { getResendCredentials } from '@/lib/resendCredentials';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function rawsql(query: string) {
  const res = await fetch(
    `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
}

function sql(v: unknown) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function ensureTables() {
  await rawsql(`
    CREATE TABLE IF NOT EXISTS presupuesto_correos (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      presupuesto_id TEXT NOT NULL,
      presupuesto_slug TEXT,
      cliente TEXT,
      email_destinatario TEXT NOT NULL,
      asunto TEXT,
      resend_id TEXT,
      estado TEXT DEFAULT 'enviado',
      tipo TEXT DEFAULT 'presupuesto',
      reply_to_id TEXT,
      abierto_at TIMESTAMPTZ,
      entregado_at TIMESTAMPTZ,
      error TEXT,
      mensaje_adicional TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'presupuesto';
    ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS reply_to_id TEXT;
    CREATE TABLE IF NOT EXISTS presupuesto_correos_respuestas (
      id SERIAL PRIMARY KEY,
      presupuesto_id TEXT NOT NULL,
      correo_id TEXT,
      tipo TEXT DEFAULT 'respuesta',
      descripcion TEXT NOT NULL,
      nota_interna TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

/* ─── Email HTML builder (email-client-safe) ────────────────────────────── */
function money(v: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
}
function esc(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmailHtml(p: PresupuestoPro, mensajeAdicional?: string, publicUrl?: string): string {
  const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const validez = p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-CL') : p.validez;

  const itemRows = (p.items || [])
    .sort((a, b) => a.orden - b.orden)
    .filter(it => it.nombre)
    .map((item, i) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e0d0;background:${i % 2 ? '#f9f7f2' : '#fff'};">
          <strong style="color:#1a1a1a;">${esc(item.nombre)}</strong>
          ${item.descripcion ? `<br><span style="color:#666;font-size:12px;">${esc(item.descripcion)}</span>` : ''}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e0d0;background:${i % 2 ? '#f9f7f2' : '#fff'};text-align:center;color:#555;white-space:nowrap;">${item.cantidad} ${esc(item.unidad)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e0d0;background:${i % 2 ? '#f9f7f2' : '#fff'};text-align:right;color:#555;white-space:nowrap;">${money(item.precio_unitario)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e0d0;background:${i % 2 ? '#f9f7f2' : '#fff'};text-align:right;font-weight:700;white-space:nowrap;">${money(item.total)}</td>
      </tr>`).join('');

  const incluyeList = (p.incluye || []).map(i => `<div style="padding:4px 0;border-bottom:1px solid #f0ead8;"><span style="color:#b8860b;margin-right:8px;">✓</span>${esc(i)}</div>`).join('');
  const noIncluyeList = (p.no_incluye || []).map(i => `<div style="padding:4px 0;border-bottom:1px solid #fae0e0;"><span style="color:#c0392b;margin-right:8px;">✕</span>${esc(i)}</div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Presupuesto — ${esc(p.proveedor || 'Soluciones Fabrick')}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
<div style="max-width:680px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- Header -->
  <div style="background:#1a1a1a;padding:32px 32px 28px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#b8860b;margin-bottom:8px;">Presupuesto Comercial</div>
        <div style="font-size:28px;font-weight:900;color:#fff;line-height:1.1;">${esc(p.titulo || 'Presupuesto')}</div>
        <div style="margin-top:8px;font-size:14px;color:#aaa;">Para: <strong style="color:#fff;">${esc(p.cliente || '')}</strong>${p.empresa_cliente ? ` · ${esc(p.empresa_cliente)}` : ''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">Total</div>
        <div style="font-size:32px;font-weight:900;color:#f0c040;line-height:1;">${money(p.total_con_iva || 0)}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">IVA incluido</div>
      </div>
    </div>
    ${fecha ? `<div style="margin-top:16px;font-size:12px;color:#777;">${fecha}${validez ? ` · Válido hasta: ${esc(String(validez))}` : ''}</div>` : ''}
  </div>

  ${mensajeAdicional ? `
  <!-- Mensaje adicional -->
  <div style="padding:20px 32px;background:#fffbf0;border-bottom:2px solid #f0c040;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#b8860b;margin-bottom:8px;">Mensaje</div>
    <div style="font-size:14px;line-height:1.6;color:#333;">${esc(mensajeAdicional).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <!-- Descripción -->
  ${p.descripcion ? `
  <div style="padding:20px 32px;border-bottom:1px solid #f0ead8;">
    <div style="font-size:13px;line-height:1.6;color:#444;">${esc(p.descripcion).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <!-- Ítems -->
  ${itemRows ? `
  <div style="padding:24px 32px 0;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#b8860b;margin-bottom:14px;">Detalle de trabajos</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f5f3ef;">
          <th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;border-bottom:2px solid #e8e0d0;">Descripción</th>
          <th style="padding:8px 14px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;border-bottom:2px solid #e8e0d0;">Cant.</th>
          <th style="padding:8px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;border-bottom:2px solid #e8e0d0;">P. Unit.</th>
          <th style="padding:8px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;border-bottom:2px solid #e8e0d0;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Totales -->
  <div style="padding:20px 32px;background:#f9f7f2;border-top:2px solid #e8e0d0;margin-top:${itemRows ? '0' : '0'};">
    <table style="width:100%;max-width:280px;margin-left:auto;font-size:14px;">
      <tr><td style="padding:4px 0;color:#666;">Neto:</td><td style="padding:4px 0;text-align:right;font-weight:700;">${money(p.valor_neto || 0)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">IVA (${p.iva_porcentaje || 19}%):</td><td style="padding:4px 0;text-align:right;font-weight:700;">${money(p.total_iva || 0)}</td></tr>
      <tr style="border-top:2px solid #e8e0d0;">
        <td style="padding:8px 0;font-weight:900;font-size:16px;">TOTAL:</td>
        <td style="padding:8px 0;text-align:right;font-weight:900;font-size:18px;color:#b8860b;">${money(p.total_con_iva || 0)}</td>
      </tr>
    </table>
  </div>

  <!-- Incluye / No incluye -->
  ${(p.incluye?.length || p.no_incluye?.length) ? `
  <div style="padding:20px 32px;display:flex;gap:20px;flex-wrap:wrap;">
    ${incluyeList ? `<div style="flex:1;min-width:200px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#b8860b;margin-bottom:10px;">Incluye</div>${incluyeList}</div>` : ''}
    ${noIncluyeList ? `<div style="flex:1;min-width:200px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#c0392b;margin-bottom:10px;">No incluye</div>${noIncluyeList}</div>` : ''}
  </div>` : ''}

  <!-- Observación técnica -->
  ${p.observacion_tecnica ? `
  <div style="padding:16px 32px;background:#fffbf0;border-top:1px solid #f0ead8;border-bottom:1px solid #f0ead8;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#b8860b;margin-bottom:8px;">Observaciones técnicas</div>
    <div style="font-size:13px;line-height:1.6;color:#444;">${esc(p.observacion_tecnica).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <!-- CTA link -->
  ${publicUrl ? `
  <div style="padding:24px 32px;text-align:center;">
    <a href="${publicUrl}" style="display:inline-block;background:#1a1a1a;color:#f0c040;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;padding:14px 32px;border-radius:50px;text-decoration:none;">Ver presupuesto online →</a>
    <div style="margin-top:10px;font-size:11px;color:#aaa;">O copia este link: ${publicUrl}</div>
  </div>` : ''}

  <!-- Footer -->
  <div style="padding:20px 32px;background:#f5f3ef;border-top:1px solid #e8e0d0;font-size:11px;color:#999;text-align:center;">
    <div style="font-weight:700;color:#555;margin-bottom:4px;">${esc(p.proveedor || 'Soluciones Fabrick')}</div>
    <div>Este presupuesto fue generado digitalmente y tiene validez oficial.</div>
    ${p.ciudad ? `<div style="margin-top:4px;">${esc(p.ciudad)}</div>` : ''}
  </div>

</div>
</body>
</html>`;
}

/* ─── GET: historial de correos de un presupuesto ───────────────────────── */
export async function GET(req: NextRequest) {
  await ensureTables();
  const presupuestoId = req.nextUrl.searchParams.get('presupuestoId') ?? '';

  const correosData = await rawsql(
    `SELECT * FROM presupuesto_correos${presupuestoId ? ` WHERE presupuesto_id = ${sql(presupuestoId)}` : ''} ORDER BY created_at DESC LIMIT 50;`,
  );
  const respuestasData = await rawsql(
    `SELECT * FROM presupuesto_correos_respuestas${presupuestoId ? ` WHERE presupuesto_id = ${sql(presupuestoId)}` : ''} ORDER BY created_at DESC LIMIT 50;`,
  );

  return NextResponse.json({
    correos: correosData?.data?.rows ?? [],
    respuestas: respuestasData?.data?.rows ?? [],
  });
}

/* ─── POST: enviar presupuesto por email ────────────────────────────────── */
export async function POST(req: NextRequest) {
  await ensureTables();

  const body = await req.json() as {
    presupuesto: PresupuestoPro;
    emailDestinatario?: string;
    asunto?: string;
    mensajeAdicional?: string;
    publicUrl?: string;
  };

  const { presupuesto, mensajeAdicional, publicUrl } = body;
  const email = (body.emailDestinatario || presupuesto.email_cliente || '').trim();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email del destinatario inválido o no configurado.' }, { status: 400 });
  }

  const asunto = body.asunto?.trim() || `Presupuesto: ${presupuesto.titulo || 'Propuesta comercial'} — ${presupuesto.proveedor || 'Soluciones Fabrick'}`;

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ error: 'Resend no configurado. Ve a Centro de Integraciones → Resend y agrega tu API key.' }, { status: 503 });
  }

  const html = buildEmailHtml(presupuesto, mensajeAdicional, publicUrl);
  const fromAddress = creds.from || 'Soluciones Fabrick <onboarding@resend.dev>';

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddress,
      to: [email],
      reply_to: fromAddress,
      subject: asunto,
      html,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const resendBody = await resendRes.json() as { id?: string; name?: string; message?: string };

  if (!resendRes.ok) {
    const errorMsg = resendBody.message ?? resendBody.name ?? `Error ${resendRes.status}`;
    // Store failed attempt
    await rawsql(`
      INSERT INTO presupuesto_correos (presupuesto_id, presupuesto_slug, cliente, email_destinatario, asunto, estado, error, mensaje_adicional)
      VALUES (${sql(presupuesto.id)}, ${sql(presupuesto.slug)}, ${sql(presupuesto.cliente)}, ${sql(email)}, ${sql(asunto)}, 'fallido', ${sql(errorMsg)}, ${sql(mensajeAdicional)});
    `);
    return NextResponse.json({ error: `Resend rechazó el envío: ${errorMsg}` }, { status: 400 });
  }

  const resendId = resendBody.id ?? null;

  await rawsql(`
    INSERT INTO presupuesto_correos (presupuesto_id, presupuesto_slug, cliente, email_destinatario, asunto, resend_id, estado, mensaje_adicional)
    VALUES (${sql(presupuesto.id)}, ${sql(presupuesto.slug)}, ${sql(presupuesto.cliente)}, ${sql(email)}, ${sql(asunto)}, ${sql(resendId)}, 'enviado', ${sql(mensajeAdicional)});
  `);

  return NextResponse.json({ ok: true, resendId, email, asunto });
}

/* ─── PATCH: enviar respuesta del admin al cliente ─────────────────────── */
export async function PATCH(req: NextRequest) {
  await ensureTables();

  const body = await req.json() as {
    presupuestoId: string;
    emailDestinatario: string;
    asuntoOriginal?: string;
    mensaje: string;
    replyToId?: string;
    cliente?: string;
    presupuestoSlug?: string;
  };

  const { presupuestoId, mensaje, replyToId, cliente, presupuestoSlug } = body;
  const email = (body.emailDestinatario || '').trim();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email del destinatario inválido.' }, { status: 400 });
  }
  if (!mensaje?.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  }

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ error: 'Resend no configurado. Ve a Centro de Integraciones → Resend.' }, { status: 503 });
  }

  const fromAddress = creds.from || 'Soluciones Fabrick <onboarding@resend.dev>';
  const asunto = body.asuntoOriginal
    ? (body.asuntoOriginal.startsWith('Re:') ? body.asuntoOriginal : `Re: ${body.asuntoOriginal}`)
    : 'Re: Presupuesto — Soluciones Fabrick';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:580px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
  <div style="background:#1a1a1a;padding:24px 28px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#b8860b;margin-bottom:6px;">Soluciones Fabrick</div>
    <div style="font-size:20px;font-weight:900;color:#fff;">Respuesta a tu consulta</div>
  </div>
  <div style="padding:28px;">
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0;">${mensaje.replace(/\n/g, '<br>')}</p>
  </div>
  <div style="padding:16px 28px 24px;background:#f9f7f2;border-top:1px solid #e8e0d0;font-size:11px;color:#999;text-align:center;">
    Soluciones Fabrick · Respuesta a presupuesto
  </div>
</div>
</body>
</html>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress, to: [email], reply_to: fromAddress, subject: asunto, html }),
    signal: AbortSignal.timeout(20_000),
  });

  const resendBody = await resendRes.json() as { id?: string; name?: string; message?: string };

  if (!resendRes.ok) {
    const errorMsg = resendBody.message ?? resendBody.name ?? `Error ${resendRes.status}`;
    return NextResponse.json({ error: `Resend rechazó el envío: ${errorMsg}` }, { status: 400 });
  }

  const resendId = resendBody.id ?? null;

  await rawsql(`
    INSERT INTO presupuesto_correos (presupuesto_id, presupuesto_slug, cliente, email_destinatario, asunto, resend_id, estado, tipo, reply_to_id, mensaje_adicional)
    VALUES (${sql(presupuestoId)}, ${sql(presupuestoSlug)}, ${sql(cliente)}, ${sql(email)}, ${sql(asunto)}, ${sql(resendId)}, 'enviado', 'reply', ${sql(replyToId)}, ${sql(mensaje)});
  `);

  return NextResponse.json({ ok: true, resendId, email, asunto });
}

/* ─── PUT: registrar respuesta manual del cliente ───────────────────────── */
export async function PUT(req: NextRequest) {
  await ensureTables();

  const body = await req.json() as {
    presupuestoId: string;
    correoId?: string;
    tipo?: string;
    descripcion: string;
    notaInterna?: string;
  };

  if (!body.presupuestoId || !body.descripcion?.trim()) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  await rawsql(`
    INSERT INTO presupuesto_correos_respuestas (presupuesto_id, correo_id, tipo, descripcion, nota_interna)
    VALUES (${sql(body.presupuestoId)}, ${sql(body.correoId)}, ${sql(body.tipo || 'respuesta')}, ${sql(body.descripcion)}, ${sql(body.notaInterna)});
  `);

  return NextResponse.json({ ok: true });
}
