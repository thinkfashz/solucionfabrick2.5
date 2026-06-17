import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  return (
    process.env.ORDER_TRACKING_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.PAYMENTS_WEBHOOK_SECRET ||
    'soluciones-fabrick-local-tracking-secret'
  );
}

function base64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(orderId: string) {
  return createHmac('sha256', secret()).update(orderId).digest('base64url').slice(0, 32);
}

export function createOrderTrackingToken(orderId: string) {
  const clean = String(orderId || '').trim();
  if (!clean) throw new Error('order_id_required');
  return `${base64Url(clean)}.${sign(clean)}`;
}

export function parseOrderTrackingToken(token: string) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  try {
    const orderId = fromBase64Url(encoded);
    const expected = sign(orderId);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { orderId };
  } catch {
    return null;
  }
}
