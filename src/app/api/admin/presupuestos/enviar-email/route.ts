import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getResendCredentials } from '@/lib/resendCredentials';
import { buildPresupuestoEmailHtml, buildPresupuestoEmailText } from '@/lib/presupuestoEmailHtml';
import type { PresupuestoPro } from '@/lib/presupuestosBuilder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendBudgetEmailPayload = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  message?: string;
  publicLink?: string;
  presupuesto?: PresupuestoPro;
};

function cleanEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim() : '';
  return EMAIL_RE.test(email) ? email : '';
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  let payload: SendBudgetEmailPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const presupuesto = payload.presupuesto;
  if (!presupuesto?.id || !presupuesto?.slug || !presupuesto?.cliente) {
    return NextResponse.json({ error: 'Faltan datos del presupuesto: id, slug y cliente.' }, { status: 400 });
  }

  const to = cleanEmail(payload.to || presupuesto.email_cliente);
  const cc = cleanEmail(payload.cc);
  const bcc = cleanEmail(payload.bcc);
  if (!to) return NextResponse.json({ error: 'Correo destino inválido.' }, { status: 400 });

  const creds = await getResendCredentials({ preferDb: true });
  if (!creds.ready || !creds.apiKey) {
    return NextResponse.json({ error: 'Resend no está configurado. Agrega api_key y from en integraciones o variables de entorno.', missing: creds.missing, source: creds.source }, { status: 500 });
  }

  const publicLink = payload.publicLink || (presupuesto as PresupuestoPro & { public_link?: string }).public_link || '';
  const subject = payload.subject?.trim() || `Presupuesto ${presupuesto.titulo} — Soluciones Fabrick`;
  const html = buildPresupuestoEmailHtml({ presupuesto, publicLink, message: payload.message || '' });
  const text = buildPresupuestoEmailText({ presupuesto, publicLink, message: payload.message || '' });
  const resend = new Resend(creds.apiKey);

  const { data, error } = await resend.emails.send({
    from: creds.from || DEFAULT_FROM,
    to: [to],
    ...(cc ? { cc: [cc] } : {}),
    ...(bcc ? { bcc: [bcc] } : {}),
    subject,
    html,
    text,
    tags: [
      { name: 'module', value: 'presupuestos' },
      { name: 'budget_id', value: presupuesto.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) },
      { name: 'slug', value: presupuesto.slug.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) },
    ],
  });

  if (error) return NextResponse.json({ error: error.message || 'No se pudo enviar el correo con Resend.' }, { status: 502 });

  return NextResponse.json({ ok: true, sent: true, id: data?.id || null, to, cc: cc || null, bcc: bcc || null, provider: 'resend', from: creds.from || DEFAULT_FROM });
}
