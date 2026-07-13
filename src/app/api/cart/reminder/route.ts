import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailDriver';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';

export const runtime = 'nodejs';

type ReminderItem = { product?: { id?: string; name?: string; price?: number; image_url?: string; category_id?: string; discount_percentage?: number }; quantity?: number };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] || char);
}

export async function POST(request: Request) {
  const limit = await checkPersistentRateLimit({ namespace: 'public:cart-reminder', identity: getClientIp(request), max: 4, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: 'Ya enviamos varios recordatorios. Intenta más tarde.' }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { email?: string; name?: string; items?: ReminderItem[] };
  const email = String(body.email || '').trim().toLowerCase().slice(0, 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Correo inválido.' }, { status: 422 });
  const items = Array.isArray(body.items) ? body.items.slice(0, 20).filter((item) => item.product?.id) : [];
  if (!items.length) return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 422 });
  const resume = Buffer.from(JSON.stringify(items)).toString('base64url');
  const url = `${getAppBaseUrl()}/checkout?resume=${encodeURIComponent(resume)}`;
  const rows = items.map((item) => `<li>${escapeHtml(String(item.product?.name || 'Producto'))} × ${Math.max(1, Number(item.quantity) || 1)}</li>`).join('');
  const result = await sendEmail({
    to: email,
    subject: 'Tu carrito Fabrick sigue disponible',
    html: `<div style="font-family:Arial,sans-serif;background:#090806;color:#fff;padding:32px;border-radius:24px"><p style="color:#facc15;font-weight:800">SOLUCIONES FABRICK</p><h1>Continúa tu compra cuando quieras</h1><p>Hola ${escapeHtml(String(body.name || ''))}, guardamos tu selección durante este proceso:</p><ul>${rows}</ul><a href="${url}" style="display:inline-block;margin-top:18px;background:#facc15;color:#000;padding:14px 22px;border-radius:999px;font-weight:800;text-decoration:none">Volver a mi carrito</a><p style="margin-top:20px;color:#aaa;font-size:12px">Los precios y el stock se validan nuevamente al pagar.</p></div>`,
    text: `Continúa tu compra en Soluciones Fabrick: ${url}`,
  });
  if (!result.ok) return NextResponse.json({ error: 'No se pudo enviar el correo.' }, { status: 502 });
  return NextResponse.json({ ok: true, simulated: result.simulated || false });
}
