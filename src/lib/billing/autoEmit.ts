/**
 * autoEmit — Emite automáticamente una Boleta Electrónica (DTE 39) cuando un
 * pedido es marcado como pagado. Se invoca fire-and-forget desde el webhook de
 * MercadoPago y desde el endpoint de pago directo con tarjeta.
 *
 * Si el proveedor de facturación no está configurado se usa el driver mock,
 * que genera un registro en `invoices` con status `accepted_mock` sin tocar
 * el SII. Esto asegura que siempre queda un registro en la tabla, ya sea real
 * o simulado.
 *
 * Idempotencia: si la orden ya tiene una boleta (DTE 39) en la tabla `invoices`
 * se retorna la existente sin emitir una segunda.
 */

import { randomBytes } from 'crypto';
import { getBillingDriver } from './provider';
import type { EmitDteRequest, DteLineItem } from './provider';
import { insforge } from '@/lib/insforge';

interface OrderRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  items: Array<{
    productoId: string | number;
    cantidad: number;
    precioUnitario: number;
    nombre?: string;
  }> | null;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
}

export interface AutoEmitResult {
  ok: boolean;
  already_existed?: boolean;
  invoice_id?: string;
  folio?: string;
  provider?: string;
  error?: string;
}

export async function emitBoletaForOrder(orderId: string): Promise<AutoEmitResult> {
  // ── 1. Idempotency check ─────────────────────────────────────────────────
  const { data: existing } = await insforge.database
    .from('invoices')
    .select('id, folio, provider')
    .eq('order_id', orderId)
    .eq('dte_type', 39)
    .limit(1);

  if ((existing ?? []).length > 0) {
    const ex = (existing as Array<{ id: string; folio: string | null; provider: string }>)[0];
    return { ok: true, already_existed: true, invoice_id: ex.id, folio: ex.folio ?? undefined, provider: ex.provider };
  }

  // ── 2. Fetch order from DB ───────────────────────────────────────────────
  const { data: orderData } = await insforge.database
    .from('orders')
    .select('id, customer_name, customer_email, items, subtotal, tax, shipping_fee, total')
    .eq('id', orderId)
    .single();

  if (!orderData) return { ok: false, error: `Pedido ${orderId} no encontrado` };
  const order = orderData as OrderRow;

  // ── 3. Build DTE items ───────────────────────────────────────────────────
  // In the checkout system, precioUnitario is the NET price (before IVA).
  // For DTE 39 (Boleta), our computeDteTotals treats unit_price as GROSS
  // (includes IVA). So we multiply by 1.19 to convert net → gross.
  const dteItems: DteLineItem[] = [];

  for (const item of order.items ?? []) {
    dteItems.push({
      description: item.nombre ?? `Artículo ${item.productoId}`,
      quantity: item.cantidad,
      unit_price: Math.round(item.precioUnitario * 1.19), // net → gross for DTE 39
      sku: String(item.productoId),
    });
  }

  // Shipping is exempt from IVA (servicio de transporte)
  if ((order.shipping_fee ?? 0) > 0) {
    dteItems.push({
      description: 'Despacho a domicilio',
      quantity: 1,
      unit_price: order.shipping_fee,
      exempt: true,
    });
  }

  if (dteItems.length === 0) {
    // Fallback: single synthetic item with the gross total
    dteItems.push({
      description: 'Compra en tienda',
      quantity: 1,
      unit_price: order.total,
    });
  }

  const req: EmitDteRequest = {
    dte_type: 39,
    order_id: orderId,
    email_receptor: order.customer_email ?? undefined,
    razon_social_receptor: order.customer_name ?? 'Consumidor Final',
    items: dteItems,
  };

  // ── 4. Emit via configured driver ────────────────────────────────────────
  const driver = getBillingDriver();
  let result;
  try {
    result = await driver.emitDte(req);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al emitir DTE' };
  }

  if (!result.ok) return { ok: false, error: result.error ?? 'Proveedor rechazó el DTE' };

  // ── 5. Persist invoice ───────────────────────────────────────────────────
  const pdfToken = randomBytes(24).toString('base64url');
  const { data: invoice, error: dbErr } = await insforge.database
    .from('invoices')
    .insert({
      order_id: orderId,
      dte_type: 39,
      folio: result.folio ?? null,
      rut_emisor: process.env.BILLING_RUT_EMISOR ?? null,
      rut_receptor: null,
      razon_social_receptor: order.customer_name ?? 'Consumidor Final',
      neto: result.neto,
      iva: result.iva,
      exento: result.exento,
      total: result.total,
      pdf_url: result.pdf_url ?? null,
      xml_url: result.xml_url ?? null,
      pdf_token: pdfToken,
      sii_track_id: result.sii_track_id ?? null,
      sii_status: result.sii_status ?? 'pending',
      provider: driver.code,
      provider_payload: result.raw ?? {},
    })
    .select('id')
    .single();

  if (dbErr) {
    // 23505 = unique_violation: a concurrent call already inserted this invoice.
    // The extra DTE we just emitted is orphaned at the provider, but we return
    // the first winner's record so the caller gets a consistent response.
    if ((dbErr as { code?: string }).code === '23505') {
      const { data: raceWinner } = await insforge.database
        .from('invoices')
        .select('id, folio, provider')
        .eq('order_id', orderId)
        .eq('dte_type', 39)
        .limit(1);
      const ex = (raceWinner as Array<{ id: string; folio: string | null; provider: string }>)[0];
      return { ok: true, already_existed: true, invoice_id: ex?.id, folio: ex?.folio ?? undefined, provider: ex?.provider };
    }
    // DTE was emitted but DB save failed for another reason — log it
    return { ok: true, folio: result.folio, provider: driver.code, error: `DTE emitido (folio ${result.folio}) pero no persistido: ${dbErr.message}` };
  }

  const inv = invoice as { id: string } | null;
  return { ok: true, invoice_id: inv?.id, folio: result.folio, provider: driver.code };
}
