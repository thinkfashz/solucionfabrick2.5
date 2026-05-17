import 'server-only';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  source: 'env' | 'db' | 'missing';
  encryptedAtRest: boolean;
  ready: boolean;
  missing: string[];
}

export async function getCloudinaryCredentials(options: { preferDb?: boolean } = {}): Promise<CloudinaryCredentials> {
  const resolved = await resolveIntegrationCredentials('cloudinary', ['cloud_name', 'api_key', 'api_secret'], Boolean(options.preferDb));
  return {
    cloudName: resolved.values.cloud_name ?? '',
    apiKey: resolved.values.api_key ?? '',
    apiSecret: resolved.values.api_secret ?? '',
    source: resolved.source,
    encryptedAtRest: resolved.encryptedAtRest,
    ready: resolved.missing.length === 0,
    missing: resolved.missing,
  };
}
