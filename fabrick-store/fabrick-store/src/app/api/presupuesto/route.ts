import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface FormFields {
  nombre: string;
  email: string;
  telefono?: string;
  tipo_proyecto?: string;
  descripcion?: string;
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
  };
}

async function sendEmail(fields: FormFields): Promise<void> {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[presupuesto] SMTP_USER/SMTP_PASS not set – skipping email. Form data:', fields);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const html = `
    <h2>Nueva solicitud de presupuesto - Fabrick</h2>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr><td><b>Nombre:</b></td><td>${fields.nombre}</td></tr>
      <tr><td><b>Email:</b></td><td>${fields.email}</td></tr>
      <tr><td><b>Teléfono:</b></td><td>${fields.telefono ?? '—'}</td></tr>
      <tr><td><b>Tipo de proyecto:</b></td><td>${fields.tipo_proyecto ?? '—'}</td></tr>
      <tr><td><b>Descripción:</b></td><td>${fields.descripcion ?? '—'}</td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: `"Fabrick Contacto" <${SMTP_USER}>`,
    to: 'f.eduardomicolta@gmail.com',
    subject: `Nueva solicitud de presupuesto de ${fields.nombre}`,
    html,
  });
}

export async function POST(request: Request) {
  const isHtmlForm = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');

  try {
    const fields = await parseBody(request);

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
