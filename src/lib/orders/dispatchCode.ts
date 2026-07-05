export function normalizeDispatchCode(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

export function createDispatchCode(orderId: string, date = new Date()) {
  const clean = String(orderId || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  const suffix = (clean.slice(-6) || Math.random().toString(36).slice(2, 8)).padStart(6, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `FBK-${year}-${suffix}`;
}

export function resolveDispatchCode(order: Record<string, unknown>, orderId: string) {
  return normalizeDispatchCode(order.dispatch_code || order.codigo_despacho) || createDispatchCode(orderId);
}
