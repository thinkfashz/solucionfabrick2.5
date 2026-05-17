import 'server-only';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export interface ResendCredentials {
  apiKey: string;
  from: string | null;
  source: 'env' | 'db' | 'missing';
  encryptedAtRest: boolean;
  ready: boolean;
  missing: string[];
}

export async function getResendCredentials(options: { preferDb?: boolean } = {}): Promise<ResendCredentials> {
  const resolved = await resolveIntegrationCredentials('resend', ['api_key', 'from'], Boolean(options.preferDb));
  return {
    apiKey: resolved.values.api_key ?? '',
    from: resolved.values.from ?? null,
    source: resolved.source,
    encryptedAtRest: resolved.encryptedAtRest,
    ready: resolved.missing.length === 0,
    missing: resolved.missing,
  };
}
