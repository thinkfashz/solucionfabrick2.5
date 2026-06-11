import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/emailDriver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

function clean(value: unknown, max = 400) {
  return String(value || '').trim().slice(0, max);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { to?: string; subject?: string; message?: string; url?: string; title?: string } | null;
  const to = clean(body?.to, 160);
  const title = clean(body?.title, 160) || 'Propuesta Soluciones Fabrick';
  const url = clean(body?.url, 800);
  const message = clean(body?.message, 1200) || 'Te comparto una presentación premium preparada por Soluciones Fabrick.';
  const subject = clean(body?.subject, 180) || `Propuesta: ${title}`;

  if (!isEmail(to)) return NextResponse.json({ error: 'Correo destino inválido.' }, { status: 400 });
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'URL pública inválida o faltante. Publica primero la propuesta.' }, { status: 400 });

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${subject}</title></head><body style="margin:0;background:#080604;color:#f8fafc;font-family:Inter,Arial,sans-serif;padding:28px;"><div style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,#111,#090706);border:1px solid rgba(245,158,11,.28);border-radius:28px;padding:30px;box-shadow:0 30px 100px rgba(0,0,0,.35)"><p style="margin:0 0 10px;color:#facc15;font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:900;">Soluciones Fabrick</p><h1 style="margin:0 0 14px;font-size:34px;line-height:1.02;letter-spacing:-.04em;color:#fff;">${title}</h1><p style="color:#d6d3d1;font-size:16px;line-height:1.7;margin:0 0 24px;">${message}</p><a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#facc15,#f59e0b);color:#160b02;font-weight:900;text-decoration:none;border-radius:999px;padding:15px 22px;">Ver presentación</a><p style="margin:26px 0 0;color:#78716c;font-size:12px;">Enviado desde la plataforma con Resend API.</p></div></body></html>`;

  const result = await sendEmail({ to, subject, html, text: `${message}\n\n${url}` });
  if (!result.ok) return NextResponse.json({ error: result.error || 'No se pudo enviar el correo.' }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id, simulated: result.simulated ?? false });
}
