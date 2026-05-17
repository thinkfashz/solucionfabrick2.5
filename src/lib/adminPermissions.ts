import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import type { AdminSessionPayload } from '@/lib/adminAuth';

export type AdminRole = 'superadmin' | 'admin' | 'editor' | 'ventas' | 'soporte' | 'viewer';

export type AdminResource =
  | 'admin'
  | 'products'
  | 'team'
  | 'integrations'
  | 'sql'
  | 'passkeys'
  | 'sessions'
  | 'security'
  | 'content'
  | 'orders'
  | 'payments'
  | 'quotes'
  | 'settings';

export type AdminAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'manage'
  | 'test'
  | 'export';

export type PermissionCheck = {
  resource: AdminResource;
  action: AdminAction;
  requirePasskey?: boolean;
};

export type PermissionResult = {
  allowed: boolean;
  reason?: string;
  status?: number;
};

const ROLE_ORDER: Record<AdminRole, number> = {
  viewer: 0,
  soporte: 1,
  ventas: 2,
  editor: 3,
  admin: 4,
  superadmin: 5,
};

const MATRIX: Record<AdminRole, Partial<Record<AdminResource, AdminAction[]>>> = {
  superadmin: {
    admin: ['read', 'create', 'update', 'delete', 'execute', 'manage', 'test', 'export'],
    products: ['read', 'create', 'update', 'delete', 'manage', 'export'],
    team: ['read', 'create', 'update', 'delete', 'manage'],
    integrations: ['read', 'create', 'update', 'delete', 'manage', 'test'],
    sql: ['read', 'execute', 'manage'],
    passkeys: ['read', 'create', 'update', 'delete', 'manage'],
    sessions: ['read', 'export', 'manage'],
    security: ['read', 'create', 'update', 'delete', 'manage'],
    content: ['read', 'create', 'update', 'delete', 'manage'],
    orders: ['read', 'create', 'update', 'delete', 'manage', 'export'],
    payments: ['read', 'update', 'manage', 'export'],
    quotes: ['read', 'create', 'update', 'delete', 'manage', 'export'],
    settings: ['read', 'update', 'manage'],
  },
  admin: {
    admin: ['read'],
    products: ['read', 'create', 'update', 'delete', 'export'],
    team: ['read'],
    integrations: ['read', 'test'],
    passkeys: ['read', 'create', 'update', 'delete'],
    sessions: ['read'],
    security: ['read', 'update'],
    content: ['read', 'create', 'update', 'delete'],
    orders: ['read', 'create', 'update', 'export'],
    payments: ['read', 'export'],
    quotes: ['read', 'create', 'update', 'delete', 'export'],
    settings: ['read'],
  },
  editor: {
    admin: ['read'],
    products: ['read', 'update'],
    content: ['read', 'create', 'update', 'delete'],
    quotes: ['read'],
    orders: ['read'],
  },
  ventas: {
    admin: ['read'],
    products: ['read'],
    orders: ['read', 'create', 'update', 'export'],
    payments: ['read'],
    quotes: ['read', 'create', 'update', 'export'],
    sessions: ['read'],
  },
  soporte: {
    admin: ['read'],
    products: ['read'],
    orders: ['read'],
    quotes: ['read'],
    sessions: ['read'],
  },
  viewer: {
    admin: ['read'],
    products: ['read'],
    content: ['read'],
    orders: ['read'],
    quotes: ['read'],
  },
};

const CRITICAL_SUPERADMIN_RESOURCES = new Set<AdminResource>(['team', 'integrations', 'sql', 'security', 'settings']);
const CRITICAL_ACTIONS = new Set<AdminAction>(['create', 'update', 'delete', 'execute', 'manage', 'test']);

export function normalizeAdminRole(role?: string | null): AdminRole {
  if (role === 'superadmin' || role === 'admin' || role === 'editor' || role === 'ventas' || role === 'soporte' || role === 'viewer') {
    return role;
  }
  return 'viewer';
}

export function roleAtLeast(role: AdminRole, minimum: AdminRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[minimum];
}

export function can(roleInput: string | null | undefined, resource: AdminResource, action: AdminAction): boolean {
  const role = normalizeAdminRole(roleInput);
  const allowed = MATRIX[role][resource] ?? [];
  return allowed.includes(action) || allowed.includes('manage');
}

export function isCriticalPermission(check: PermissionCheck): boolean {
  return CRITICAL_SUPERADMIN_RESOURCES.has(check.resource) && CRITICAL_ACTIONS.has(check.action);
}

export function checkAdminPermission(session: AdminSessionPayload | null, check: PermissionCheck): PermissionResult {
  if (!session) return { allowed: false, status: 401, reason: 'No autenticado.' };
  const role = normalizeAdminRole(session.rol);

  if (!can(role, check.resource, check.action)) {
    return { allowed: false, status: 403, reason: `Rol ${role} no puede ejecutar ${check.action} en ${check.resource}.` };
  }

  if (check.requirePasskey && role !== 'superadmin') {
    return { allowed: false, status: 403, reason: 'Solo superadmin puede ejecutar esta acción crítica.' };
  }

  return { allowed: true };
}

export function adminForbidden(reason = 'No tienes permisos para esta acción.'): NextResponse {
  return NextResponse.json({ error: reason, code: 'ADMIN_FORBIDDEN' }, { status: 403 });
}

export async function requireAdminPermission(request: NextRequest, check: PermissionCheck): Promise<
  | { ok: true; session: AdminSessionPayload; role: AdminRole }
  | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession(request);
  if (!session) return { ok: false, response: adminUnauthorized() };
  const result = checkAdminPermission(session, check);
  if (!result.allowed) {
    return { ok: false, response: result.status === 401 ? adminUnauthorized() : adminForbidden(result.reason) };
  }
  return { ok: true, session, role: normalizeAdminRole(session.rol) };
}

export function describePermission(check: PermissionCheck): string {
  return `${check.action}:${check.resource}${check.requirePasskey ? ':passkey-required' : ''}`;
}
