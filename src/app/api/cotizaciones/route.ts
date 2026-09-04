import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveBudget, BudgetError } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { getTenantIdFromHeaders } from '@/lib/tenant-edge';
import { sendEmail } from '@/lib/emailDriver';
import { getResendCredentials } from '@/lib/resendCredentials';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/cotizaciones — Persiste una cotización del carrito de servicios.
 *
 * Reutiliza la tabla `quotes`, mantiene compatibilidad con los flujos existentes
 * y, cuando hay datos de cliente, envía una copia del resumen al cliente y una
 * notificación al correo operativo configurado en Integraciones.
 */

interface IncomingItem {
  id?: string;
  kind?: string;
  title?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  refPrice?: number;
  notes?: string;
  image?: string;
  meta?: Record<string, unknown>;
}

const cotizacionSchema = {
  items: v.array({ required: true, maxItems: 200 }),
  reference: v.string({ max: 64 }),
  channel: v.string({ max: 20 }),
  customer: v.object({
    shape: {
      name: v.string({ max: 200 }),
      email: v.email({ max: 255 }),
      phone: v.string({ max: 30 }),
      region: v.string({ max: 100 }),
      notes: v.string({ max: 1000 }),
    },
  }),
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clp(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function numericMeta(item: IncomingItem, key: string) {
  const raw = item.meta?.[key];
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function stringMeta(item: IncomingItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'string' ? value : '';
}

function itemRange(item: IncomingItem) {
  const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  const unitPrice = typeof item.refPrice === 'number' && item.refPrice >= 0 ? item.refPrice : 0;
  if (String(item.kind || '') !== 'service') {
    const total = unitPrice * quantity;
    return { low: total, high: total };
  }
  const selectedLow = numericMeta(item, 'selectedLow') || numericMeta(item, 'marketLow');
  const selectedHigh = numericMeta(item, 'selectedHigh') || numericMeta(item, 'marketHigh');
  const fallback = unitPrice * quantity;
  return { low: selectedLow || fallback, high: selectedHigh || selectedLow || fallback };
}

function rangeText(low: number, high: number) {
  return Math.round(low) === Math.round(high) ? clp(low) : `${clp(low)} – ${clp(high)}`;
}

function buildEmailHtml(params: {
  title: string;
  intro: string;
  reference: string;
  quoteUrl: string;
  customer?: Record<string, string>;
  items: IncomingItem[];
  totalLow: number;
  totalHigh: number;
  admin?: boolean;
}) {
  const serviceRows = params.items.filter((item) => String(item.kind || 'service') === 'service');
  const materialRows = params.items.filter((item) => String(item.kind || '') === 'material');

  const rows = (items: IncomingItem[]) => items.map((item) => {
    const range = itemRange(item);
    const mode = stringMeta(item, 'priceMode') === 'labor' ? 'Mano de obra' : String(item.kind) === 'service' ? 'Trabajo vendido' : 'Producto';
    const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #ece6dd;vertical-align:top;">
        <div style="font-weight:800;color:#111214;">${escapeHtml(item.title || 'Ítem')}</div>
        <div style="margin-top:3px;font-size:12px;color:#756d63;">${escapeHtml(mode)} · ${escapeHtml(quantity)} ${escapeHtml(item.unit || 'unidad')}</div>
        ${stringMeta(item, 'formula') ? `<div style="margin-top:3px;font-size:11px;color:#9a8f82;">${escapeHtml(stringMeta(item, 'formula'))}</div>` : ''}
      </td>
      <td style="padding:12px 0 12px 16px;border-bottom:1px solid #ece6dd;text-align:right;font-weight:800;color:#111214;white-space:nowrap;">${escapeHtml(rangeText(range.low, range.high))}</td>
    </tr>`;
  }).join('');

  const customerBlock = params.admin && params.customer ? `
    <div style="margin:18px 0;padding:16px;border-radius:14px;background:#f4eee5;color:#2a2723;font-size:13px;line-height:1.7;">
      <strong>Cliente:</strong> ${escapeHtml(params.customer.name || '—')}<br/>
      <strong>Email:</strong> ${escapeHtml(params.customer.email || '—')}<br/>
      <strong>Teléfono:</strong> ${escapeHtml(params.customer.phone || '—')}<br/>
      <strong>Ubicación:</strong> ${escapeHtml(params.customer.region || '—')}<br/>
      <strong>Notas:</strong> ${escapeHtml(params.customer.notes || '—')}
    </div>` : '';

  const section = (label: string, body: string, empty: string) => `
    <div style="margin-top:24px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#b96a16;">${label}</div>
      ${body ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${body}</table>` : `<p style="font-size:13px;color:#8a8177;">${empty}</p>`}
    </div>`;

  return `<!doctype html>
  <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#ece7df;font-family:Arial,Helvetica,sans-serif;color:#111214;">
    <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
      <div style="overflow:hidden;border-radius:22px;background:#fffaf3;box-shadow:0 18px 50px rgba(36,28,20,.10);">
        <div style="background:#111214;padding:26px;color:#fffaf3;">
          <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#f5a13d;text-transform:uppercase;">Soluciones Fabrick · ${escapeHtml(params.reference)}</div>
          <h1 style="margin:10px 0 0;font-size:27px;line-height:1.1;">${escapeHtml(params.title)}</h1>
          <p style="margin:12px 0 0;color:#bdb6ad;font-size:13px;line-height:1.7;">${escapeHtml(params.intro)}</p>
        </div>
        <div style="padding:26px;">
          ${customerBlock}
          ${section('Servicios', rows(serviceRows), 'Sin servicios seleccionados.')}
          ${section('Productos / insumos', rows(materialRows), 'Sin productos seleccionados.')}
          <div style="margin-top:26px;padding-top:18px;border-top:1px solid #ded6cc;display:flex;justify-content:space-between;gap:16px;align-items:flex-end;">
            <div><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:#81786f;">Total referencial</div><div style="margin-top:5px;font-size:25px;font-weight:900;color:#111214;">${escapeHtml(rangeText(params.totalLow, params.totalHigh))}</div></div>
          </div>
          <a href="${escapeHtml(params.quoteUrl)}" style="display:block;margin-top:22px;padding:14px 18px;border-radius:999px;background:#111214;color:#f5a13d;text-decoration:none;text-align:center;font-size:13px;font-weight:900;">Ver presupuesto guardado</a>
          <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#8a8177;">Esta referencia no es un documento tributario ni reemplaza la revisión técnica. El valor final puede variar según acceso, estado actual, terreno, terminaciones y alcance definitivo.</p>
        </div>
      </div>
    </div>
  </body></html>`;
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}));
    const result = parse(cotizacionSchema, raw);
    if (!result.ok) return validationError(result.errors);

    const body = result.data as {
      items: IncomingItem[];
      customer?: Record<string, string>;
      reference?: string;
      channel?: string;
    };
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Tu cotización está vacía.', code: 'EMPTY_CART' }, { status: 400 });
    }

    const lines = items.map((it) => {
      const kind = String(it.kind ?? 'service');
      const meta = it.meta && typeof it.meta === 'object' && !Array.isArray(it.meta) ? it.meta as Record<string, unknown> : {};
      const noteParts: string[] = [];
      if (it.notes) noteParts.push(String(it.notes));
      if (Object.keys(meta).length > 0) {
        noteParts.push(Object.entries(meta).map(([key, value]) => `${key}: ${String(value)}`).join(' · '));
      }
      return {
        materialId: String(it.id ?? ''),
        name: String(it.title ?? 'Ítem'),
        category: kind,
        unit: typeof it.unit === 'string' ? it.unit : 'un',
        unitPrice: typeof it.refPrice === 'number' && it.refPrice >= 0 ? it.refPrice : 0,
        quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
        imageUrl: typeof it.image === 'string' ? it.image : undefined,
        notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
      };
    });

    const tenantId = getTenantIdFromHeaders(request.headers);
    const user = await getInsforgeUserFromRequest(request);
    const quote = await saveBudget({
      tenantId,
      lines: lines as never,
      customer: body.customer,
      userId: user?.id ?? null,
    });

    const totals = items.reduce((acc, item) => {
      const range = itemRange(item);
      return { low: acc.low + range.low, high: acc.high + range.high };
    }, { low: 0, high: 0 });
    const reference = String(body.reference || `FBK-${String(quote.id).slice(0, 8).toUpperCase()}`);
    const quoteUrl = `${request.nextUrl.origin}/presupuesto/${quote.id}`;
    const customerEmail = String(body.customer?.email || '').trim();
    const customerName = String(body.customer?.name || '').trim();

    const resend = await getResendCredentials().catch(() => null);
    const notifyTo = resend?.notifyTo
      || process.env.ORDER_NOTIFICATION_EMAIL
      || process.env.ADMIN_NOTIFICATION_EMAIL
      || process.env.ADMIN_EMAIL
      || '';

    const customerMessage = customerEmail ? sendEmail({
      to: customerEmail,
      subject: `Tu presupuesto ${reference} | Soluciones Fabrick`,
      replyTo: notifyTo || undefined,
      html: buildEmailHtml({
        title: 'Tu presupuesto referencial está listo',
        intro: 'Guardamos las partidas que seleccionaste para que puedas revisarlas con calma y continuar la conversación con el equipo Fabrick.',
        reference,
        quoteUrl,
        items,
        totalLow: totals.low,
        totalHigh: totals.high,
      }),
    }) : Promise.resolve({ ok: false, error: 'customer_email_missing' });

    const adminMessage = notifyTo ? sendEmail({
      to: notifyTo,
      subject: `Nuevo presupuesto web · ${customerName || customerEmail || reference}`,
      replyTo: customerEmail || undefined,
      html: buildEmailHtml({
        title: 'Nuevo presupuesto confirmado desde la web',
        intro: `El cliente eligió continuar por ${body.channel === 'whatsapp' ? 'WhatsApp' : 'correo'}. Revisa el detalle y realiza el seguimiento comercial.`,
        reference,
        quoteUrl,
        customer: body.customer,
        items,
        totalLow: totals.low,
        totalHigh: totals.high,
        admin: true,
      }),
    }) : Promise.resolve({ ok: false, error: 'notify_to_missing' });

    const [customerNotification, adminNotification] = await Promise.all([customerMessage, adminMessage]);

    return NextResponse.json({
      quote,
      notifications: {
        customer: customerNotification.ok,
        admin: adminNotification.ok,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json({ error: err.message, code: err.code, hint: err.hint }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ error: message, code: 'COTIZACION_SAVE_FAILED' }, { status: 500 });
  }
}
