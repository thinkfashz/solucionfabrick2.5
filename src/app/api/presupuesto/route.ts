import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';
import { campaignBusyHeaders, publicFormsEnabled } from '@/lib/campaignMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface FormFields {
  nombre: string;
  email: string;
  telefono?: string;
  tipo_proyecto?: string;
  descripcion?: string;
  'cf-turnstile-response'?: string;
}

const MAX_BODY_BYTES = 12 * 1024;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function readRequestText(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return text;
}

async function parseBody(request: Request): Promise<FormFields | null> {
  const contentType = request.headers.get('content-type') ?? '';
  const text = await readRequestText(request);
  if (text === null) return null;

  if (contentType.includes('application/json')) {
    const raw = JSON.parse(text) as Record<string, unknown>;
    return {
      nombre: cleanText(raw.nombre, 120),
      email: cleanText(raw.email, 180),
      telefono: cleanText(raw.telefono, 60) || undefined,
      tipo_proyecto: cleanText(raw.tipo_proyecto, 120) || undefined,
      descripcion: cleanText(raw.descripcion, 2_000) || undefined,
      'cf-turnstile-response': cleanText(raw['cf-turnstile-response'], 2_048) || undefined,
    };
  }

  // Handle application/x-www-form-urlencoded (native HTML form POST)
  const params = new URLSearchParams(text);
  return {
    nombre: cleanText(params.get('nombre'), 120),
    email: cleanText(params.get('email'), 180),
    telefono: cleanText(params.get('telefono'), 60) || undefined,
    tipo_proyecto: cleanText(params.get('tipo_proyecto'), 120) || undefined,
    descripcion: cleanText(params.get('descripcion'), 2_000) || undefined,
    'cf-turnstile-response': cleanText(params.get('cf-turnstile-response'), 2_048) || undefined,
  };
}

async function sendEmail(fields: FormFields): Promise<void> {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[presupuesto] SMTP_USER/SMTP_PASS not set – skipping email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  });

  const html = `
    <h2>Nueva solicitud de presupuesto - Fabrick</h2>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr><td><b>Nombre:</b></td><td>${escapeHtml(fields.nombre)}</td></tr>
      <tr><td><b>Email:</b></td><td>${escapeHtml(fields.email)}</td></tr>
      <tr><td><b>Teléfono:</b></td><td>${escapeHtml(fields.telefono ?? '—')}</td></tr>
      <tr><td><b>Tipo de proyecto:</b></td><td>${escapeHtml(fields.tipo_proyecto ?? '—')}</td></tr>
      <tr><td><b>Descripción:</b></td><td>${escapeHtml(fields.descripcion ?? '—')}</td></tr>
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
    if (!publicFormsEnabled()) {
      if (isHtmlForm) {
        return NextResponse.redirect(new URL('/contacto?error=campaign', request.url), 303);
      }
      return NextResponse.json(
        { error: 'Formulario pausado temporalmente por modo campaña. Escríbenos por WhatsApp.' },
        { status: 503, headers: campaignBusyHeaders() },
      );
    }

    const ip = getClientIp(request);
    const rl = await checkPersistentRateLimit({
      namespace: 'public:presupuesto',
      identity: ip,
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rl.ok) {
      if (isHtmlForm) {
        return NextResponse.redirect(new URL('/contacto?error=rate-limit', request.url), 303);
      }
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.', retry_after: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const fields = await parseBody(request);
    if (!fields) {
      if (isHtmlForm) {
        return NextResponse.redirect(new URL('/contacto?error=payload', request.url), 303);
      }
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    }

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
