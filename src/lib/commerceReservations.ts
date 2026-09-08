import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import type { LineItem } from '@/lib/checkout';

export type CheckoutReservationResult = {
  ok: boolean;
  order_id: string;
  existing: boolean;
  expires_at: string;
};

export type CommitReservationResult = {
  ok: boolean;
  order_id: string;
  committed_now: number;
  duplicate: boolean;
};

export type ReleaseReservationResult = {
  ok: boolean;
  order_id: string;
  released: number;
};

function unwrapRpc<T>(data: unknown): T {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object') throw new Error('COMMERCE_RPC_INVALID_RESPONSE');
  return value as T;
}

export function reservationLineItems(items: LineItem[]) {
  return items.map((item) => ({
    product_id: String(item.productoId),
    quantity: Math.trunc(Number(item.cantidad)),
  }));
}

export async function createOrderWithReservations(
  order: Record<string, unknown>,
  items: LineItem[],
  ttlMinutes = 15,
): Promise<CheckoutReservationResult> {
  const { data, error } = await insforgeAdmin.database.rpc('commerce_create_order_with_reservations', {
    p_order: order,
    p_items: reservationLineItems(items),
    p_ttl_minutes: ttlMinutes,
  });
  if (error) throw new Error(error.message || 'COMMERCE_RESERVATION_FAILED');
  const result = unwrapRpc<CheckoutReservationResult>(data);
  if (!result.ok || !result.order_id) throw new Error('COMMERCE_RESERVATION_INVALID_RESPONSE');
  return result;
}

export async function commitOrderReservation(orderId: string): Promise<CommitReservationResult> {
  const { data, error } = await insforgeAdmin.database.rpc('commerce_commit_order_reservation', {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message || 'COMMERCE_COMMIT_FAILED');
  const result = unwrapRpc<CommitReservationResult>(data);
  if (!result.ok) throw new Error('COMMERCE_COMMIT_INVALID_RESPONSE');
  return result;
}

export async function releaseOrderReservation(orderId: string, reason = 'payment_not_approved'): Promise<ReleaseReservationResult> {
  const { data, error } = await insforgeAdmin.database.rpc('commerce_release_order_reservation', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message || 'COMMERCE_RELEASE_FAILED');
  const result = unwrapRpc<ReleaseReservationResult>(data);
  if (!result.ok) throw new Error('COMMERCE_RELEASE_INVALID_RESPONSE');
  return result;
}

export async function expireCheckoutReservations(): Promise<number> {
  const { data, error } = await insforgeAdmin.database.rpc('commerce_expire_reservations', {});
  if (error) throw new Error(error.message || 'COMMERCE_EXPIRE_FAILED');
  const value = Array.isArray(data) ? data[0] : data;
  return Number(value || 0);
}

export function reservationHttpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('INSUFFICIENT_STOCK:')) {
    const parts = message.match(/INSUFFICIENT_STOCK:[^:]+:(\d+)/);
    return { status: 409, code: 'INSUFFICIENT_STOCK', error: parts?.[1] ? `Stock insuficiente. Disponible: ${parts[1]}.` : 'Stock insuficiente.' };
  }
  if (message.includes('PRODUCT_NOT_FOUND:')) return { status: 404, code: 'PRODUCT_NOT_FOUND', error: 'Uno de los productos ya no existe.' };
  if (message.includes('PRODUCT_INACTIVE:')) return { status: 409, code: 'PRODUCT_INACTIVE', error: 'Uno de los productos ya no está disponible.' };
  if (message.includes('ORDER_KEY_REUSED_WITH_DIFFERENT_TOTAL')) return { status: 409, code: 'ORDER_KEY_REUSED', error: 'La llave de orden ya fue utilizada con otro total.' };
  if (message.includes('ORDER_ALREADY_PAID')) return { status: 409, code: 'ORDER_ALREADY_PAID', error: 'La orden ya fue pagada.' };
  if (message.includes('INVALID_QUANTITY') || message.includes('EMPTY_CART')) return { status: 422, code: 'INVALID_CART', error: 'El carrito contiene una cantidad inválida.' };
  return { status: 500, code: 'RESERVATION_FAILED', error: 'No se pudo reservar el inventario. No se abrió Mercado Pago.' };
}
