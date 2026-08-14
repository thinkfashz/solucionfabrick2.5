export type IntelligencePermission =
  | 'analytics.read'
  | 'performance.read'
  | 'products.read'
  | 'products.create'
  | 'products.update'
  | 'products.publish'
  | 'stock.read'
  | 'stock.update'
  | 'prices.read'
  | 'prices.propose'
  | 'seo.update'
  | 'blog.create'
  | 'blog.update';

export type IntelligenceActionType =
  | 'product.create'
  | 'product.update'
  | 'product.publish'
  | 'stock.update'
  | 'price.propose'
  | 'seo.update'
  | 'blog.create'
  | 'blog.update';

export type AdminRole = 'superadmin' | 'admin' | 'viewer';

export type IntelligenceActionRequest = {
  type: IntelligenceActionType;
  resourceId?: string | null;
  payload: Record<string, unknown>;
};

export type IntelligencePolicyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  permission: IntelligencePermission;
  reasons: string[];
  normalizedPayload: Record<string, unknown>;
};

const ROLE_PERMISSIONS: Record<AdminRole, Set<IntelligencePermission>> = {
  viewer: new Set(['analytics.read', 'performance.read', 'products.read', 'stock.read', 'prices.read']),
  admin: new Set([
    'analytics.read', 'performance.read', 'products.read', 'products.create', 'products.update',
    'stock.read', 'stock.update', 'prices.read', 'prices.propose', 'seo.update', 'blog.create', 'blog.update',
  ]),
  superadmin: new Set([
    'analytics.read', 'performance.read', 'products.read', 'products.create', 'products.update', 'products.publish',
    'stock.read', 'stock.update', 'prices.read', 'prices.propose', 'seo.update', 'blog.create', 'blog.update',
  ]),
};

const ACTION_PERMISSION: Record<IntelligenceActionType, IntelligencePermission> = {
  'product.create': 'products.create',
  'product.update': 'products.update',
  'product.publish': 'products.publish',
  'stock.update': 'stock.update',
  'price.propose': 'prices.propose',
  'seo.update': 'seo.update',
  'blog.create': 'blog.create',
  'blog.update': 'blog.update',
};

const ALWAYS_APPROVAL = new Set<IntelligenceActionType>([
  'product.create',
  'product.publish',
  'stock.update',
  'seo.update',
  'blog.create',
  'blog.update',
]);

const SECRET_KEY_PATTERN = /(secret|token|password|passwd|api[_-]?key|authorization|cookie|session|card|cvv|payment[_-]?credential)/i;

function deepHasForbiddenKey(value: unknown, path = ''): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = deepHasForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    if (SECRET_KEY_PATTERN.test(key)) return childPath;
    const hit = deepHasForbiddenKey(child, childPath);
    if (hit) return hit;
  }
  return null;
}

function cleanString(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : value;
}

function normalizePayload(type: IntelligenceActionType, payload: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...payload };
  for (const key of ['name', 'title', 'description', 'slug', 'metaTitle', 'metaDescription', 'supplier', 'supplierUrl']) {
    if (key in normalized) normalized[key] = cleanString(normalized[key]);
  }

  if (type === 'stock.update' && 'stock' in normalized) {
    normalized.stock = Math.max(0, Math.floor(Number(normalized.stock) || 0));
  }
  if ((type === 'product.create' || type === 'product.update' || type === 'price.propose') && 'price' in normalized) {
    normalized.price = Math.max(0, Math.round(Number(normalized.price) || 0));
  }
  if ('supplierPrice' in normalized) {
    normalized.supplierPrice = Math.max(0, Math.round(Number(normalized.supplierPrice) || 0));
  }
  return normalized;
}

export function evaluateIntelligenceAction(
  role: AdminRole,
  action: IntelligenceActionRequest,
  options?: { currentPrice?: number | null; supplierPrice?: number | null; minMarginPercent?: number; priceChangeApprovalPercent?: number },
): IntelligencePolicyDecision {
  const permission = ACTION_PERMISSION[action.type];
  const reasons: string[] = [];
  const normalizedPayload = normalizePayload(action.type, action.payload || {});

  if (!ROLE_PERMISSIONS[role]?.has(permission)) {
    return { allowed: false, requiresApproval: false, permission, reasons: [`El rol ${role} no tiene ${permission}.`], normalizedPayload };
  }

  const forbiddenPath = deepHasForbiddenKey(normalizedPayload);
  if (forbiddenPath) {
    return { allowed: false, requiresApproval: false, permission, reasons: [`Campo sensible bloqueado: ${forbiddenPath}.`], normalizedPayload };
  }

  let requiresApproval = ALWAYS_APPROVAL.has(action.type);

  if (action.type === 'product.create') {
    if (!String(normalizedPayload.name || '').trim()) reasons.push('El producto necesita nombre.');
    if (!String(normalizedPayload.description || '').trim()) reasons.push('El producto necesita descripción.');
    if (!String(normalizedPayload.supplier || '').trim() && !String(normalizedPayload.supplierUrl || '').trim()) reasons.push('Se requiere proveedor o URL de proveedor válida.');
    if (Number(normalizedPayload.price || 0) <= 0) reasons.push('El precio de venta debe ser mayor que 0.');
  }

  if (action.type === 'product.publish' && !action.resourceId) reasons.push('Publicar requiere resourceId.');
  if ((action.type === 'product.update' || action.type === 'stock.update' || action.type === 'seo.update' || action.type === 'blog.update') && !action.resourceId) reasons.push('La actualización requiere resourceId.');

  if (action.type === 'price.propose' || action.type === 'product.update' || action.type === 'product.create') {
    const proposed = Number(normalizedPayload.price || 0);
    const supplier = Number(normalizedPayload.supplierPrice ?? options?.supplierPrice ?? 0);
    const minMargin = options?.minMarginPercent ?? 25;
    if (proposed > 0 && supplier > 0) {
      const margin = ((proposed - supplier) / proposed) * 100;
      if (margin < minMargin) reasons.push(`Margen ${margin.toFixed(1)}% bajo el mínimo de ${minMargin}%.`);
    }
    const current = Number(options?.currentPrice || 0);
    const threshold = options?.priceChangeApprovalPercent ?? 10;
    if (current > 0 && proposed > 0) {
      const change = Math.abs(((proposed - current) / current) * 100);
      if (change >= threshold) requiresApproval = true;
    }
  }

  return {
    allowed: reasons.length === 0,
    requiresApproval,
    permission,
    reasons,
    normalizedPayload,
  };
}

export function getIntelligenceRolePermissions(role: AdminRole) {
  return [...(ROLE_PERMISSIONS[role] || new Set<IntelligencePermission>())];
}
