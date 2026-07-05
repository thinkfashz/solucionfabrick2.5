import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { dispatchHookAsync } from '@/lib/extensionsBus';
import { createDropiFulfillmentAsync } from '@/lib/dropi';
import { getMercadoPagoPayment, mapMercadoPagoStatus, type MercadoPagoPaymentResponse } from '@/lib/mercadopago';
import { confirmPaidOrderAndSendReceiptAsync } from '@/lib/orders/paidConfirmation';
import { syncOrderToSalesPipelineAsync } from '@/lib/orders/salesPipeline';

type OrderRow = Record<string, unknown>;

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

export async function loadOrderById(orderId: string) {
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', orderId).limit(1);
  if (error) throw new Error(error.message || 'No se pudo leer la orden.');
  return Array.isArray(data) ? data[0] as OrderRow | undefined : undefined;
}

async function createRecoveredOrderFromPayment(payment: MercadoPagoPaymentResponse, orderId: string) {
  const now = new Date().toISOString();
  const amount = Math.round(num(payment.transaction_amount, 0));
  const metadata = payment.metadata || {};
  const status = mapMercadoPagoStatus(payment.status);
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
    payment_id: String(payment.id),
    payment_status: payment.status || 'unknown',
    created_at: now,
    updated_at: now,
  };

  const { error } = await insforgeAdmin.database.from('orders').insert([row]);
  if (error) throw new Error(`No se pudo recuperar la orden pagada: ${error.message}`);
  return row;
}

async function updateOrderFromPayment(orderId: string, payment: MercadoPagoPaymentResponse) {
  const orderStatus = mapMercadoPagoStatus(payment.status);
  const { error } = await insforgeAdmin.database.from('orders').update({
    status: orderStatus,
    payment_id: String(payment.id),
    payment_status: payment.status || 'unknown',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  if (error) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
  const order = await loadOrderById(orderId);
  return { order, orderStatus };
}

export async function reconcileMercadoPagoPaymentRecord(payment: MercadoPagoPaymentResponse, expectedOrderId?: string | null, source = 'webhook') {
  const orderId = str(payment.external_reference) || str(expectedOrderId);
  if (!orderId) throw new Error('El pago no contiene external_reference ni orden esperada.');
  if (expectedOrderId && payment.external_reference && String(payment.external_reference) !== expectedOrderId) {
    throw new Error('El pago no corresponde al pedido que se está intentando confirmar.');
  }

  const existing = await loadOrderById(orderId).catch(() => undefined);
  const wasAlreadyPaid = String(existing?.status || '').toLowerCase() === 'pagada';
  let order = existing;

  if (!order) {
    order = await createRecoveredOrderFromPayment(payment, orderId);
  } else {
    const updated = await updateOrderFromPayment(orderId, payment);
    order = updated.order || order;
  }

  const orderStatus = mapMercadoPagoStatus(payment.status);
  if (orderStatus === 'pagada') {
    syncOrderToSalesPipelineAsync({ ...(order || {}), id: orderId, status: orderStatus, payment_id: String(payment.id), payment_status: payment.status }, {
      stage: 'Compra pagada',
      probability: 92,
      attended: true,
      nextAction: 'Preparar despacho y enviar seguimiento al cliente',
    });

    if (!wasAlreadyPaid) {
      confirmPaidOrderAndSendReceiptAsync(orderId);
      createDropiFulfillmentAsync(orderId);
      dispatchHookAsync('order.paid', { orderId, paymentId: String(payment.id), paymentStatus: payment.status || 'unknown', provider: 'mercadopago', source });
    }
  }

  return {
    ok: true,
    orderId,
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
