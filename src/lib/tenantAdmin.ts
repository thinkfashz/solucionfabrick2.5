import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission, type AdminAction, type AdminResource, type AdminRole } from '@/lib/adminPermissions';
import type { AdminSessionPayload } from '@/lib/adminAuth';

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export type TenantAdminContext = {
  session: AdminSessionPayload;
  role: AdminRole;
  tenantId: string;
  isSuperadmin: boolean;
};

export type TenantPermission = {
  resource: AdminResource;
  action: AdminAction;
  requirePasskey?: boolean;
};

export function tenantMissingResponse() {
  return NextResponse.json(
    {
      error: 'No se pudo resolver tenant_id para esta solicitud admin.',
      code: 'TENANT_REQUIRED',
    },
    { status: 403 },
  );
}

export function tenantScopeError(entity = 'registro') {
  return NextResponse.json(
    {
      error: `No tienes permisos para acceder a este ${entity}.`,
      code: 'TENANT_SCOPE_DENIED',
    },
    { status: 403 },
  );
}

export async function requireTenantAdmin(
  request: NextRequest,
  permission: TenantPermission,
): Promise<{ ok: true; ctx: TenantAdminContext } | { ok: false; response: NextResponse }> {
  const auth = await requireAdminPermission(request, permission);
  if (!auth.ok) return auth;

  const tenantId = auth.session.tenant_id || await getAdminTenantId(request);
  if (!tenantId) return { ok: false, response: tenantMissingResponse() };

  return {
    ok: true,
    ctx: {
      session: auth.session,
      role: auth.role,
      tenantId,
      isSuperadmin: auth.role === 'superadmin',
    },
  };
}

export function ensureTenantOwnership<T extends { tenant_id?: string | null }>(
  record: T | null | undefined,
  ctx: TenantAdminContext,
): record is T {
  if (!record) return false;
  if (ctx.isSuperadmin && !record.tenant_id) return true;
  return record.tenant_id === ctx.tenantId;
}

export function withTenant<T extends Record<string, unknown>>(ctx: TenantAdminContext, data: T): T & { tenant_id: string } {
  return { ...data, tenant_id: ctx.tenantId };
}

export function tenantWhere(ctx: TenantAdminContext) {
  return { tenant_id: ctx.tenantId };
}

export function assertTenantId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return DEFAULT_TENANT_ID;
}
