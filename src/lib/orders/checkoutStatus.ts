export type CheckoutCustomerState = 'approved' | 'failed' | 'refunded' | 'abandoned' | 'pending' | 'review';

const APPROVED = new Set(['pagada', 'en_preparacion', 'preparacion', 'preparación', 'enviado', 'entregado', 'confirmada', 'confirmado']);
const FAILED = new Set(['fallida', 'cancelada', 'cancelled']);
const REFUNDED = new Set(['reembolsada', 'refunded']);
const REVIEW = new Set(['payment_review_required', 'revision_pago', 'revisión_pago']);
export const RESERVATION_TTL_FALLBACK_MS = 15 * 60 * 1000;

function timestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

export function deriveCheckoutCustomerState(input: {
  status?: unknown;
  paymentStatus?: unknown;
  createdAt?: unknown;
  reservationExpiresAt?: unknown;
  now?: number;
}) {
  const status = String(input.status || 'pendiente_pago').toLowerCase();
  const paymentStatus = String(input.paymentStatus || 'pending').toLowerCase();
  const reviewRequired = REVIEW.has(status);

  // Mercado Pago can be approved while the local order is deliberately held in
  // review because amount/currency/merchant validation or stock commit failed.
  // Only a post-reconciliation fulfillment state is customer-approved.
  const approved = !reviewRequired && APPROVED.has(status);
  const failed = !reviewRequired && (paymentStatus === 'rejected' || paymentStatus === 'cancelled' || FAILED.has(status));
  const refunded = !reviewRequired && (paymentStatus === 'refunded' || REFUNDED.has(status));
  const terminal = approved || failed || refunded || reviewRequired;

  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now();
  const createdAtParsed = timestamp(input.createdAt);
  const createdAt = Number.isFinite(createdAtParsed) ? createdAtParsed : now;
  const explicitExpiry = timestamp(input.reservationExpiresAt);
  const expiresAt = Number.isFinite(explicitExpiry) ? explicitExpiry : createdAt + RESERVATION_TTL_FALLBACK_MS;
  const stale = !terminal && now > expiresAt;
  const state: CheckoutCustomerState = reviewRequired ? 'review' : approved ? 'approved' : refunded ? 'refunded' : failed ? 'failed' : stale ? 'abandoned' : 'pending';

  return { status, paymentStatus, state, approved, failed, refunded, reviewRequired, terminal, stale, expiresAt };
}
