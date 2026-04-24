import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { verifyTurnstile } from '@/lib/turnstile';

interface FormFields {
  nombre: string;
  email: string;
  telefono?: string;
  tipo_proyecto?: string;
  descripcion?: string;
  'cf-turnstile-response'?: string;
}

async function parseBody(request: Request): Promise<FormFields> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json();
  }
  // Handle application/x-www-form-urlencoded (native HTML form POST)
  const text = await request.text();
  const params = new URLSearchParams(text);
  return {
    nombre: params.get('nombre') ?? '',
    email: params.get('email') ?? '',
    telefono: params.get('telefono') ?? undefined,
    tipo_proyecto: params.get('tipo_proyecto') ?? undefined,
    descripcion: params.get('descripcion') ?? undefined,
    'cf-turnstile-response': params.get('cf-turnstile-response') ?? undefined,
  };
}

async function sendEmail(fields: FormFields): Promise<void> {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[presupuesto] SMTP_USER/SMTP_PASS not set – skipping email.');
    return;
  }

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const html = `
    <h2>Nueva solicitud de presupuesto - Fabrick</h2>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr><td><b>Nombre:</b></td><td>${escape(fields.nombre)}</td></tr>
      <tr><td><b>Email:</b></td><td>${escape(fields.email)}</td></tr>
      <tr><td><b>Teléfono:</b></td><td>${escape(fields.telefono ?? '—')}</td></tr>
      <tr><td><b>Tipo de proyecto:</b></td><td>${escape(fields.tipo_proyecto ?? '—')}</td></tr>
      <tr><td><b>Descripción:</b></td><td>${escape(fields.descripcion ?? '—')}</td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: `"Fabrick Contacto" <${SMTP_USER}>`,
    to: 'f.eduardomicolta@gmail.com',
    subject: `Nueva solicitud de presupuesto de ${escape(fields.nombre)}`,
    html,
  });
}

export async function POST(request: Request) {
  const isHtmlForm = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');

  try {
    const fields = await parseBody(request);

    // Bot protection (no-op when TURNSTILE_SECRET_KEY is not configured)
    const captchaOk = await verifyTurnstile(
      fields['cf-turnstile-response'],
      request.headers.get('x-forwarded-for') ?? undefined,
    );
    if (!captchaOk) {
      if (isHtmlForm) {
        return NextResponse.redirect(new URL('/contacto?error=captcha', request.url), 303);
      }
      return NextResponse.json({ error: 'Captcha inválido. Por favor vuelve a intentarlo.' }, { status: 400 });
    }

    if (!fields.nombre || !fields.email) {
      if (isHtmlForm) {
        return NextResponse.redirect(new URL('/contacto?error=1', request.url), 303);
      }
      return NextResponse.json({ error: 'Nombre y email son requeridos.' }, { status: 400 });
    }

    await sendEmail(fields);

    if (isHtmlForm) {
      return NextResponse.redirect(new URL('/contacto?enviado=1', request.url), 303);
    }

    return NextResponse.json(
      { mensaje: 'Solicitud recibida. Un especialista Fabrick se contactará dentro de 24 horas hábiles.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('[presupuesto] Error:', err);
    if (isHtmlForm) {
      return NextResponse.redirect(new URL('/contacto?error=1', request.url), 303);
    }
    return NextResponse.json({ error: 'Error interno al procesar la solicitud.' }, { status: 500 });
  }
}
