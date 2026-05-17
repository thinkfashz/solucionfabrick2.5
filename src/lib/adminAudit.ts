import 'server-only';
import type { NextRequest } from 'next/server';
import type { AdminSessionPayload } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import type { AdminAction, AdminResource } from '@/lib/adminPermissions';

export type AdminAuditInput = {
  session?: AdminSessionPayload | null;
  request?: NextRequest | Request | null;
  action: AdminAction | string;
  resource: AdminResource | string;
  resourceId?: string | null;
  status?: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, unknown>;
};

function getIp(request?: NextRequest | Request | null): string | null {
  if (!request) return null;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('cf-connecting-ip')
    ?? null;
}

function safeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  const blocked = new Set(['password', 'temporaryPassword', 'api_key', 'apiKey', 'api_secret', 'secret', 'token', 'access_token', 'refresh_token']);
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.has(key) || /password|secret|token|api[_-]?key/i.test(key)) {
      output[key] = '[redacted]';
    } else {
      output[key] = value;
    }
  }
  return output;
}

export async function recordAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    await insforgeAdmin.database.from('admin_action_audit').insert([
      {
        actor_email: input.session?.email ?? null,
        actor_role: input.session?.rol ?? null,
        tenant_id: input.session?.tenant_id ?? null,
        action: input.action,
        resource: input.resource,
        resource_id: input.resourceId ?? null,
        status: input.status ?? 'success',
        ip: getIp(input.request),
        user_agent: input.request?.headers.get('user-agent') ?? null,
        metadata: safeMetadata(input.metadata),
      },
    ]);
  } catch {
    // Never block admin actions because audit storage is unavailable.
    // The table can be created later without changing endpoint logic.
  }
}

export async function recordAdminFailure(input: Omit<AdminAuditInput, 'status'>): Promise<void> {
  return recordAdminAudit({ ...input, status: 'failure' });
}

export async function recordAdminBlocked(input: Omit<AdminAuditInput, 'status'>): Promise<void> {
  return recordAdminAudit({ ...input, status: 'blocked' });
}
