import 'server-only';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

export interface BillingCredentials {
  provider: 'haulmer'; apiKey: string; rutEmisor: string; razonSocial: string; giro: string; direccion: string; comuna: string; baseUrl: string;
  source: 'env' | 'db' | 'missing'; encryptedAtRest: boolean; ready: boolean; missing: string[];
}
const DEFAULT_BASE_URL = 'https://api.haulmer.com';
export async function resolveBillingCredentials(): Promise<BillingCredentials> {
  const resolved = await resolveIntegrationCredentials('haulmer', ['api_key', 'rut_emisor', 'razon_social'], true);
  return { provider: 'haulmer', apiKey: resolved.values.api_key ?? '', rutEmisor: resolved.values.rut_emisor ?? '', razonSocial: resolved.values.razon_social ?? '', giro: resolved.values.giro ?? '', direccion: resolved.values.direccion ?? '', comuna: resolved.values.comuna ?? '', baseUrl: (resolved.values.base_url || DEFAULT_BASE_URL).replace(/\/$/, ''), source: resolved.source, encryptedAtRest: resolved.encryptedAtRest, ready: resolved.missing.length === 0, missing: resolved.missing };
}
export function maskBillingValue(value: string): string { const clean = value.trim(); if (!clean) return ''; if (clean.length <= 4) return '••••'; return `•••• ${clean.slice(-4)}`; }
