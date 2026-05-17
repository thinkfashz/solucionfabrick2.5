import 'server-only';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export type CredentialAuditAction = 'read' | 'test' | 'send' | 'upload' | 'create' | 'update' | 'delete';

type AuditInput = {
  provider: string;
  action: CredentialAuditAction;
  actor?: string | null;
  request?: NextRequest | Request | null;
  details?: Record<string, unknown>;
};

function getIp(request?: NextRequest | Request | null): string | null {
  if (!request) return null;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('cf-connecting-ip')
    ?? null;
}

export async function recordCredentialAudit(input: AuditInput): Promise<void> {
  try {
    await insforgeAdmin.database.from('integration_audit').insert([
      {
        provider: input.provider,
        action: input.action,
        actor: input.actor ?? null,
        ip: getIp(input.request),
        user_agent: input.request?.headers.get('user-agent') ?? null,
        details: input.details ?? {},
      },
    ]);
  } catch {
    // Never block runtime actions because audit storage is unavailable.
  }
}
