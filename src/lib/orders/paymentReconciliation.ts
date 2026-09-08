import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { dispatchHookAsync } from '@/lib/extensionsBus';
import { fetchMercadoPagoAccount, getMercadoPagoPayment, mapMercadoPagoStatus, type MercadoPagoPaymentResponse } from '@/lib/mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { confirmPaidOrderAndSendReceiptAsync } from '@/lib/orders/paidConfirmation';
import { syncOrderToSalesPipelineAsync } from '@/lib/orders/salesPipeline';
import { resolveDispatchCode } from '@/lib/orders/dispatchCode';
import { commitOrderReservation, releaseOrderReservation } from '@/lib/commerceReservations';
import { isTerminalPaymentFailure, validateMercadoPagoPaymentForOrder } from '@/lib/paymentValidation';

type OrderRow = Record<string, unknown>;

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isPaidLike(order?: OrderRow) {
  const status = String(order?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  return ['pagada', 'confirmado', 'confirmada', 'en_preparacion', 'preparacion', 'preparación', 'enviado', 'entregado'].includes(status) || paymentStatus === 'approved';
}

function hasMissingColumn(error?: { message?: string } | null) {
  return /column .* does not exist|schema cache|Could not find|PGRST204/i.test(error?.message || '');
}

export async function loadOrderById(orderId: string) {
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', orderId).limit(1);
  if (error) throw new Error(error.message || 'No se pudo leer la orden.');
  return Array.isArray(data) ? data[0] as OrderRow | undefined : undefined;
}

async function updateOrder(orderId: string, payload: Record<string, unknown>) {
  const { error } = await insforgeAdmin.database.from('orders').update(payload).eq('id', orderId);
  if (!error) return;
  if (!hasMissingColumn(error)) throw new Error(`No se pudo actualizar la orden: ${error.message}`);

  // Compatibility only for deployments where the new P0 migration has not yet
  // refreshed the REST schema cache. Financial validation still remains fail-closed.
  const safeFallback: Record<string, unknown> = {};
  for (const key of ['status', 'payment_id', 'payment_status', 'dispatch_code', 'updated_at']) {
    if (key in payload) safeFallback[key] = payload[key];
  }
  const retry = await insforgeAdmin.database.from('orders').update(safeFallback).eq('id', orderId);
  if (retry.error) throw new Error(`No se pudo actualizar la orden: ${retry.error.message}`);
}

async function paymentMerchantId() {
  try {
    const credentials = await getMercadoPagoCredentials();
    if (!credentials.accessToken) return null;
    const account = await fetchMercadoPagoAccount(credentials.accessToken);
    return account?.id ?? null;
  } catch {
    return null;
  }
}

function paymentAuditPayload(payment: MercadoPagoPaymentResponse, validation: ReturnType<typeof validateMercadoPagoPaymentForOrder>) {
  return {
    payment_id: String(payment.id),
    payment_status: payment.status || 'unknown',
    expected_payment_amount: validation.expectedAmount,
    received_payment_amount: validation.receivedAmount,
    expected_payment_currency: validation.expectedCurrency,
    received_payment_currency: validation.receivedCurrency || null,
    payment_validation_result: validation,
    payment_review_reason: validation.valid ? null : validation.errors.join(','),
    updated_at: new Date().toISOString(),
  };
}

export async function reconcileMercadoPagoPaymentRecord(payment: MercadoPagoPaymentResponse, expectedOrderId?: string | null, source = 'webhook') {
  const orderId = str(payment.external_reference) || str(expectedOrderId);
  if (!orderId) throw new Error('El pago no contiene external_reference ni orden esperada.');
  if (expectedOrderId && payment.external_reference && String(payment.external_reference) !== expectedOrderId) {
    throw new Error('El pago no corresponde al pedido que se está intentando confirmar.');
  }

  const existing = await loadOrderById(orderId);
  if (!existing) {
    // Revenue P0: never manufacture an order from a payment event. A payment
    // without a persisted order must go to manual investigation.
    throw new Error('ORDER_NOT_FOUND_FOR_PAYMENT');
  }

  const wasAlreadyPaid = isPaidLike(existing);
  const merchantId = await paymentMerchantId();
  const validation = validateMercadoPagoPaymentForOrder({
    id: orderId,
    total: existing.total as number | string | null | undefined,
    currency: existing.currency as string | null | undefined,
  }, payment, merchantId);

  const referenceAmountCurrencyOrMerchantMismatch =
    !validation.checks.externalReference ||
    !validation.checks.amount ||
    !validation.checks.currency ||
    validation.checks.merchant === false;

  const audit = paymentAuditPayload(payment, validation);
  const paymentStatus = String(payment.status || '').toLowerCase();

  if (referenceAmountCurrencyOrMerchantMismatch) {
    await updateOrder(orderId, {
      ...audit,
      status: 'payment_review_required',
      payment_review_reason: validation.errors.join(','),
    });
    return {
      ok: false,
      orderId,
      dispatchCode: str(existing.dispatch_code || existing.codigo_despacho),
      paymentId: String(payment.id),
      paymentStatus: payment.status || 'unknown',
      orderStatus: 'payment_review_required',
      recovered: false,
      alreadyPaid: wasAlreadyPaid,
      validation,
      stockCommitted: false,
      reviewRequired: true,
    };
  }

  if (isTerminalPaymentFailure(paymentStatus)) {
    const mapped = mapMercadoPagoStatus(payment.status);
    await releaseOrderReservation(orderId, `payment_${paymentStatus || 'failed'}`).catch((error) => {
      console.warn('[payments] reservation release warning', orderId, error);
    });
    await updateOrder(orderId, {
      ...audit,
      status: mapped,
      payment_review_reason: null,
    });
    return {
      ok: true,
      orderId,
      dispatchCode: str(existing.dispatch_code || existing.codigo_despacho),
      paymentId: String(payment.id),
      paymentStatus: payment.status || 'unknown',
      orderStatus: mapped,
      recovered: false,
      alreadyPaid: wasAlreadyPaid,
      validation,
      stockCommitted: false,
      reviewRequired: false,
    };
  }

  if (paymentStatus !== 'approved') {
    const mapped = mapMercadoPagoStatus(payment.status);
    await updateOrder(orderId, {
      ...audit,
      status: mapped === 'pendiente' ? 'pendiente_pago' : mapped,
      payment_review_reason: null,
    });
    return {
      ok: true,
      orderId,
      dispatchCode: str(existing.dispatch_code || existing.codigo_despacho),
      paymentId: String(payment.id),
      paymentStatus: payment.status || 'unknown',
      orderStatus: mapped === 'pendiente' ? 'pendiente_pago' : mapped,
      recovered: false,
      alreadyPaid: wasAlreadyPaid,
      validation,
      stockCommitted: false,
      reviewRequired: false,
    };
  }

  let commitResult;
  try {
    commitResult = await commitOrderReservation(orderId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'reservation_commit_failed';
    await updateOrder(orderId, {
      ...audit,
      status: 'payment_review_required',
      payment_review_reason: `stock_reservation_commit_failed:${reason}`.slice(0, 500),
    });
    return {
      ok: false,
      orderId,
      dispatchCode: str(existing.dispatch_code || existing.codigo_despacho),
      paymentId: String(payment.id),
      paymentStatus: payment.status || 'unknown',
      orderStatus: 'payment_review_required',
      recovered: false,
      alreadyPaid: wasAlreadyPaid,
      validation,
      stockCommitted: false,
      reviewRequired: true,
      warning: reason,
    };
  }

  const dispatchCode = resolveDispatchCode(existing, orderId);
  await updateOrder(orderId, {
    ...audit,
    status: 'en_preparacion',
    payment_review_reason: null,
    dispatch_code: dispatchCode || null,
  });

  const shouldNotify = !wasAlreadyPaid && !commitResult.duplicate;
  if (shouldNotify) {
    const paidOrder = { ...existing, id: orderId, status: 'en_preparacion', dispatch_code: dispatchCode, payment_id: String(payment.id), payment_status: payment.status };
    syncOrderToSalesPipelineAsync(paidOrder, {
      stage: 'Compra pagada',
      probability: 92,
      attended: true,
      nextAction: 'Preparar despacho y enviar seguimiento al cliente',
    });
    confirmPaidOrderAndSendReceiptAsync(orderId);
    dispatchHookAsync('order.paid', { orderId, dispatchCode, paymentId: String(payment.id), paymentStatus: payment.status || 'unknown', provider: 'mercadopago', source });
  }

  return {
    ok: true,
    orderId,
    dispatchCode,
    paymentId: String(payment.id),
    paymentStatus: payment.status || 'unknown',
    orderStatus: 'en_preparacion',
    recovered: false,
    alreadyPaid: wasAlreadyPaid,
    validation,
    stockCommitted: true,
    stockCommitDuplicate: commitResult.duplicate,
    reviewRequired: false,
  };
}

export async function reconcileMercadoPagoPayment(paymentId: string, expectedOrderId?: string | null, source = 'manual') {
  const payment = await getMercadoPagoPayment(paymentId);
  return reconcileMercadoPagoPaymentRecord(payment, expectedOrderId, source);
}
