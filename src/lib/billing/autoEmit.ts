import 'server-only';
import { randomBytes } from 'crypto';
import { getBillingDriverResolved, computeDteTotals, type DteLineItem, type DteType, type EmitDteRequest } from './provider';
import { resolveBillingCredentials } from './credentials';
import { insforgeAdmin } from '@/lib/insforge';
import { ensureInvoicesTable } from '@/lib/billing/sql';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

type OrderItem = { productoId: string | number; cantidad: number; precioUnitario: number; nombre?: string };
type BillingDetails = { documentType?: 'boleta' | 'factura'; rut?: string; razonSocial?: string; giro?: string; direccion?: string; comuna?: string };
interface OrderRow {
  id: string; customer_name: string | null; customer_email: string | null; items: OrderItem[] | null;
  subtotal: number; tax: number; shipping_fee: number; total: number; shipment_details?: { billing?: BillingDetails } | null;
}
export interface AutoEmitResult {
  ok: boolean; already_existed?: boolean; upgraded_from_mock?: boolean; simulated?: boolean; invoice_id?: string; folio?: string; provider?: string; dte_type?: DteType; error?: string;
}

function findNetForGross(gross: number) {
  const start = Math.round(gross / 1.19);
  for (let delta = -3; delta <= 3; delta++) {
    const candidate = Math.max(0, start + delta);
    if (candidate + Math.round(candidate * 0.19) === gross) return candidate;
  }
  return start;
}
function billingDetails(order: OrderRow): BillingDetails {
  const raw = order.shipment_details;
  return raw && typeof raw === 'object' && raw.billing && typeof raw.billing === 'object' ? raw.billing : {};
}
function buildBoletaItems(order: OrderRow): DteLineItem[] {
  const lines: DteLineItem[] = (order.items ?? []).map((item) => ({
    description: item.nombre ?? `Artículo ${item.productoId}`,
    quantity: Math.max(1, Number(item.cantidad || 1)),
    unit_price: Math.round(Number(item.precioUnitario || 0)),
    sku: String(item.productoId),
  }));
  if ((order.shipping_fee ?? 0) > 0) lines.push({ description: 'Despacho a domicilio', quantity: 1, unit_price: Math.round(order.shipping_fee) });
  if (!lines.length) lines.push({ description: 'Compra en tienda', quantity: 1, unit_price: Math.round(order.total) });
  return lines;
}
function buildFacturaItems(order: OrderRow): DteLineItem[] {
  const grossLines = (order.items ?? []).map((item) => ({
    description: `${item.nombre ?? `Artículo ${item.productoId}`} × ${Math.max(1, Number(item.cantidad || 1))}`,
    gross: Math.round(Number(item.precioUnitario || 0) * Math.max(1, Number(item.cantidad || 1))), sku: String(item.productoId),
  }));
  if ((order.shipping_fee ?? 0) > 0) grossLines.push({ description: 'Despacho a domicilio', gross: Math.round(order.shipping_fee), sku: 'shipping' });
  if (!grossLines.length) grossLines.push({ description: 'Compra en tienda', gross: Math.round(order.total), sku: 'order' });
  const targetNet = findNetForGross(Math.round(order.total));
  const nets = grossLines.map((line) => Math.round(line.gross / 1.19));
  nets[nets.length - 1] = Math.max(0, nets[nets.length - 1] + targetNet - nets.reduce((sum, value) => sum + value, 0));
  return grossLines.map((line, index) => ({ description: line.description, quantity: 1, unit_price: nets[index], sku: line.sku }));
}

export async function emitBoletaForOrder(orderId: string): Promise<AutoEmitResult> {
  await ensureInvoicesTable();
  const { data: orderData, error: orderError } = await insforgeAdmin.database
    .from('orders').select('id, customer_name, customer_email, items, subtotal, tax, shipping_fee, total, shipment_details').eq('id', orderId).single();
  if (orderError || !orderData) return { ok: false, error: orderError?.message || `Pedido ${orderId} no encontrado` };
  const order = orderData as OrderRow;
  const billing = billingDetails(order);
  const wantsFactura = billing.documentType === 'factura';
  const dteType: DteType = wantsFactura ? 33 : 39;
  const driver = await getBillingDriverResolved();

  const { data: existingRows } = await insforgeAdmin.database.from('invoices').select('id, folio, provider, dte_type, sii_status').eq('order_id', orderId).eq('dte_type', dteType).limit(1);
  const existing = Array.isArray(existingRows) && existingRows.length ? existingRows[0] as { id: string; folio: string | null; provider: string; dte_type: DteType; sii_status?: string | null } : null;
  const existingIsMock = existing?.provider === 'mock' || String(existing?.sii_status || '').includes('mock');
  if (existing && (!existingIsMock || driver.code === 'mock')) {
    return { ok: true, already_existed: true, simulated: existingIsMock, invoice_id: existing.id, folio: existing.folio ?? undefined, provider: existing.provider, dte_type: existing.dte_type };
  }

  if (wantsFactura && (!billing.rut || !billing.razonSocial || !billing.giro)) {
    return { ok: false, dte_type: 33, error: 'La orden pidió factura pero faltan RUT, razón social o giro del receptor.' };
  }
  const req: EmitDteRequest = {
    dte_type: dteType,
    order_id: orderId,
    rut_receptor: wantsFactura ? billing.rut : undefined,
    razon_social_receptor: wantsFactura ? billing.razonSocial : (order.customer_name ?? 'Consumidor Final'),
    giro_receptor: wantsFactura ? billing.giro : undefined,
    direccion_receptor: wantsFactura ? billing.direccion : undefined,
    comuna_receptor: wantsFactura ? billing.comuna : undefined,
    email_receptor: order.customer_email ?? undefined,
    items: wantsFactura ? buildFacturaItems(order) : buildBoletaItems(order),
  };

  const expected = computeDteTotals(req);
  const charged = Math.round(Number(order.total || 0));
  if (Math.abs(expected.total - charged) > 1) return { ok: false, dte_type: dteType, error: `Bloqueo de seguridad tributaria: DTE ${expected.total} CLP no coincide con pago ${charged} CLP.` };

  let result;
  try { result = await driver.emitDte(req); }
  catch (err) { return { ok: false, dte_type: dteType, error: err instanceof Error ? err.message : 'Error al emitir DTE' }; }
  if (!result.ok) return { ok: false, dte_type: dteType, error: result.error ?? 'Proveedor rechazó el DTE' };
  if (Math.abs(result.total - charged) > 1) return { ok: false, dte_type: dteType, error: `Proveedor devolvió total ${result.total} CLP distinto al pago ${charged} CLP.` };

  const resolvedBilling = await resolveBillingCredentials();
  const pdfToken = randomBytes(24).toString('base64url');
  const invoicePayload = {
    tenant_id: DEFAULT_TENANT_ID,
    order_id: orderId,
    dte_type: dteType,
    folio: result.folio ?? null,
    rut_emisor: resolvedBilling.rutEmisor || null,
    rut_receptor: wantsFactura ? billing.rut ?? null : null,
    razon_social_receptor: wantsFactura ? billing.razonSocial ?? null : order.customer_name ?? 'Consumidor Final',
    giro_receptor: wantsFactura ? billing.giro ?? null : null,
    direccion_receptor: wantsFactura ? billing.direccion ?? null : null,
    comuna_receptor: wantsFactura ? billing.comuna ?? null : null,
    neto: result.neto,
    iva: result.iva,
    exento: result.exento,
    total: result.total,
    pdf_url: result.pdf_url ?? null,
    xml_url: result.xml_url ?? null,
    pdf_token: pdfToken,
    sii_track_id: result.sii_track_id ?? null,
    sii_status: result.sii_status ?? (driver.code === 'mock' ? 'accepted_mock' : 'pending'),
    provider: driver.code,
    provider_payload: result.raw ?? {},
    voided: false,
  };

  if (existing && existingIsMock && driver.code !== 'mock') {
    const { error: updateError } = await insforgeAdmin.database.from('invoices').update(invoicePayload).eq('id', existing.id);
    if (updateError) return { ok: false, provider: driver.code, dte_type: dteType, error: `DTE real emitido pero no reemplazó el registro simulado: ${updateError.message}` };
    return { ok: true, upgraded_from_mock: true, simulated: false, invoice_id: existing.id, folio: result.folio, provider: driver.code, dte_type: dteType };
  }

  const { data: invoice, error: dbErr } = await insforgeAdmin.database.from('invoices').insert(invoicePayload).select('id').single();
  if (dbErr) {
    if ((dbErr as { code?: string }).code === '23505') {
      const { data: raceWinner } = await insforgeAdmin.database.from('invoices').select('id, folio, provider').eq('order_id', orderId).eq('dte_type', dteType).limit(1);
      const ex = (raceWinner as Array<{ id: string; folio: string | null; provider: string }>)[0];
      return { ok: true, already_existed: true, simulated: ex?.provider === 'mock', invoice_id: ex?.id, folio: ex?.folio ?? undefined, provider: ex?.provider, dte_type: dteType };
    }
    return { ok: false, provider: driver.code, dte_type: dteType, error: `DTE emitido pero no persistido: ${dbErr.message}` };
  }
  return { ok: true, simulated: driver.code === 'mock', invoice_id: (invoice as { id?: string } | null)?.id, folio: result.folio, provider: driver.code, dte_type: dteType };
}
