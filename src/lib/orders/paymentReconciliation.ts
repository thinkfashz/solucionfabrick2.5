import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { dispatchHookAsync } from '@/lib/extensionsBus';
import { createDropiFulfillmentAsync } from '@/lib/dropi';
import { getMercadoPagoPayment, mapMercadoPagoStatus, type MercadoPagoPaymentResponse } from '@/lib/mercadopago';
import { confirmPaidOrderAndSendReceiptAsync } from '@/lib/orders/paidConfirmation';
import { syncOrderToSalesPipelineAsync } from '@/lib/orders/salesPipeline';
import { resolveDispatchCode } from '@/lib/orders/dispatchCode';

type OrderRow = Record<string, unknown>;

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasMissingColumn(error?: { message?: string } | null) {
  return /column .* does not exist|schema cache|Could not find|PGRST204/i.test(error?.message || '');
}

function paymentPayerName(payment: MercadoPagoPaymentResponse) {
  const payer = payment.payer;
  const full = [payer?.first_name, payer?.last_name].filter(Boolean).join(' ').trim();
  return full || payer?.email || 'Cliente Mercado Pago';
}

function paymentPayerPhone(payment: MercadoPagoPaymentResponse) {
  const phone = payment.payer?.phone;
  return str(phone?.number || phone?.area_code ? `${phone?.area_code || ''}${phone?.number || ''}` : '');
}

function workflowStatusFromPayment(paymentStatus?: string) {
  const mapped = mapMercadoPagoStatus(paymentStatus);
  if (mapped === 'pagada') return 'en_preparacion';
  if (mapped === 'fallida' || mapped === 'reembolsada' || mapped === 'contracargo') return 'cancelado';
  return 'pendiente';
}

function isPaidLike(order?: OrderRow) {
  const status = String(order?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  return ['pagada', 'confirmado', 'confirmada', 'en_preparacion', 'preparacion', 'preparación', 'enviado', 'entregado'].includes(status) || paymentStatus === 'approved';
}

export async function loadOrderById(orderId: string) {
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', orderId).limit(1);
  if (error) throw new Error(error.message || 'No se pudo leer la orden.');
  return Array.isArray(data) ? data[0] as OrderRow | undefined : undefined;
}

async function insertOrder(row: Record<string, unknown>) {
  const { error } = await insforgeAdmin.database.from('orders').insert([row]);
  if (!error) return { stripped: false };
  if (!hasMissingColumn(error)) throw new Error(`No se pudo recuperar la orden pagada: ${error.message}`);

  const fallback = { ...row };
  delete fallback.dispatch_code;
  const retry = await insforgeAdmin.database.from('orders').insert([fallback]);
  if (retry.error) throw new Error(`No se pudo recuperar la orden pagada: ${retry.error.message}`);
  return { stripped: true };
}

async function createRecoveredOrderFromPayment(payment: MercadoPagoPaymentResponse, orderId: string) {
  const now = new Date().toISOString();
  const amount = Math.round(num(payment.transaction_amount, 0));
  const metadata = payment.metadata || {};
  const status = workflowStatusFromPayment(payment.status);
  const dispatchCode = status === 'en_preparacion' ? resolveDispatchCode({}, orderId) : '';
  const row = {
    id: orderId,
    customer_name: paymentPayerName(payment),
    customer_email: str(payment.payer?.email).toLowerCase() || null,
    customer_phone: paymentPayerPhone(payment) || null,
    region: str(metadata.region),
    shipping_address: str(metadata.shipping_address) || null,
    items: [{ productoId: 'mp-recovery', nombre: 'Compra Mercado Pago recuperada', cantidad: 1, precioUnitario: amount }],
    subtotal: amount,
    tax: 0,
    shipping_fee: 0,
    total: amount,
    currency: payment.currency_id || 'CLP',
    status,
    dispatch_code: dispatchCode || null,
    payment_id: String(payment.id),
    payment_status: payment.status || 'unknown',
    created_at: now,
    updated_at: now,
  };

  await insertOrder(row);
  return row;
}

async function updateOrderFromPayment(orderId: string, payment: MercadoPagoPaymentResponse, existing?: OrderRow) {
  const workflowStatus = workflowStatusFromPayment(payment.status);
  const dispatchCode = workflowStatus === 'en_preparacion' ? resolveDispatchCode(existing || {}, orderId) : str(existing?.dispatch_code || existing?.codigo_despacho);
  const payload: Record<string, unknown> = {
    status: workflowStatus,
    payment_id: String(payment.id),
    payment_status: payment.status || 'unknown',
    updated_at: new Date().toISOString(),
  };
  if (dispatchCode) payload.dispatch_code = dispatchCode;

  const { error } = await insforgeAdmin.database.from('orders').update(payload).eq('id', orderId);
  if (error && !hasMissingColumn(error)) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
  if (error && hasMissingColumn(error)) {
    const fallback = { ...payload };
    delete fallback.dispatch_code;
    const retry = await insforgeAdmin.database.from('orders').update(fallback).eq('id', orderId);
    if (retry.error) throw new Error(`No se pudo actualizar la orden: ${retry.error.message}`);
  }

  const order = await loadOrderById(orderId);
  return { order, orderStatus: workflowStatus, dispatchCode };
}

export async function reconcileMercadoPagoPaymentRecord(payment: MercadoPagoPaymentResponse, expectedOrderId?: string | null, source = 'webhook') {
  const orderId = str(payment.external_reference) || str(expectedOrderId);
  if (!orderId) throw new Error('El pago no contiene external_reference ni orden esperada.');
  if (expectedOrderId && payment.external_reference && String(payment.external_reference) !== expectedOrderId) {
    throw new Error('El pago no corresponde al pedido que se está intentando confirmar.');
  }

  const existing = await loadOrderById(orderId).catch(() => undefined);
  const wasAlreadyPaid = isPaidLike(existing);
  let order = existing;
  let dispatchCode = str(existing?.dispatch_code || existing?.codigo_despacho);

  if (!order) {
    order = await createRecoveredOrderFromPayment(payment, orderId);
    dispatchCode = str(order.dispatch_code || order.codigo_despacho);
  } else {
    const updated = await updateOrderFromPayment(orderId, payment, existing);
    order = updated.order || order;
    dispatchCode = updated.dispatchCode || dispatchCode;
  }

  const paymentMappedStatus = mapMercadoPagoStatus(payment.status);
  const orderStatus = workflowStatusFromPayment(payment.status);
  if (paymentMappedStatus === 'pagada') {
    syncOrderToSalesPipelineAsync({ ...(order || {}), id: orderId, status: orderStatus, dispatch_code: dispatchCode, payment_id: String(payment.id), payment_status: payment.status }, {
      stage: 'Compra pagada',
      probability: 92,
      attended: true,
      nextAction: 'Preparar despacho y enviar seguimiento al cliente',
    });

    if (!wasAlreadyPaid) {
      confirmPaidOrderAndSendReceiptAsync(orderId);
      createDropiFulfillmentAsync(orderId);
      dispatchHookAsync('order.paid', { orderId, dispatchCode, paymentId: String(payment.id), paymentStatus: payment.status || 'unknown', provider: 'mercadopago', source });
    }
  }

  return {
    ok: true,
    orderId,
    dispatchCode,
    paymentId: String(payment.id),
    paymentStatus: payment.status || 'unknown',
    orderStatus,
    recovered: !existing,
    alreadyPaid: wasAlreadyPaid,
  };
}

export async function reconcileMercadoPagoPayment(paymentId: string, expectedOrderId?: string | null, source = 'manual') {
  const payment = await getMercadoPagoPayment(paymentId);
  return reconcileMercadoPagoPaymentRecord(payment, expectedOrderId, source);
}
