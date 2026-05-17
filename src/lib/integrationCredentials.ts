import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { detectEnvProviderCredentials } from '@/lib/integrationsEnvMap';

export type CredentialSource = 'env' | 'db' | 'missing';

export type ResolvedIntegrationCredentials = {
  provider: string;
  source: CredentialSource;
  encryptedAtRest: boolean;
  values: Record<string, string>;
  missing: string[];
};

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

async function readStoredValues(provider: string): Promise<Record<string, string>> {
  const { data, error } = await insforgeAdmin.database
    .from('integrations')
    .select('credentials')
    .eq('provider', provider)
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) return {};
  const raw = (data[0] as { credentials?: Record<string, unknown> }).credentials ?? {};
  const plain = decryptCredentials(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(plain)) {
    const next = clean(value);
    if (next) out[key] = next;
  }
  return out;
}

export async function resolveIntegrationCredentials(provider: string, fields: string[], preferDb = true): Promise<ResolvedIntegrationCredentials> {
  const envDetected = detectEnvProviderCredentials(provider);
  const envValues: Record<string, string> = {};
  for (const [field, detected] of Object.entries(envDetected)) envValues[field] = detected.value;

  const dbValues = await readStoredValues(provider);
  const values = preferDb ? { ...envValues, ...dbValues } : { ...dbValues, ...envValues };
  const missing = fields.filter((field) => !values[field]);
  const hasDb = fields.some((field) => Boolean(dbValues[field]));
  const hasEnv = fields.some((field) => Boolean(envValues[field]));

  return {
    provider,
    source: hasDb && preferDb ? 'db' : hasEnv ? 'env' : hasDb ? 'db' : 'missing',
    encryptedAtRest: isEncryptionConfigured(),
    values,
    missing,
  };
}
