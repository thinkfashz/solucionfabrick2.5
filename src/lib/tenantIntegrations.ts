import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials } from '@/lib/integrationsCrypto';

export type TenantIntegrationResult = {
  provider: string;
  tenantId: string;
  values: Record<string, string>;
  missing: string[];
  ready: boolean;
  source: 'tenant' | 'missing';
};

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const next = value.trim();
  return next ? next : undefined;
}

function unpack(raw: Record<string, unknown>): Record<string, string> {
  const plain = decryptCredentials(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(plain)) {
    const next = clean(value);
    if (next) out[key] = next;
  }
  return out;
}

export async function readTenantIntegration(
  tenantId: string,
  provider: string,
  requiredFields: string[] = [],
): Promise<TenantIntegrationResult> {
  const { data, error } = await insforgeAdmin.database
    .from('integrations')
    .select('credentials')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return {
      provider,
      tenantId,
      values: {},
      missing: requiredFields,
      ready: false,
      source: 'missing',
    };
  }

  const raw = (data[0] as { credentials?: Record<string, unknown> }).credentials ?? {};
  const values = unpack(raw);
  const missing = requiredFields.filter((field) => !values[field]);

  return {
    provider,
    tenantId,
    values,
    missing,
    ready: missing.length === 0,
    source: 'tenant',
  };
}

export function maskTenantIntegration(values: Record<string, string>) {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    masked[key] = value.length <= 8 ? '••••' : `${value.slice(0, 4)}…${value.slice(-4)}`;
  }
  return masked;
}
