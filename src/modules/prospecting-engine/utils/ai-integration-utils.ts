import type { AiIntegrationCredentials, AiIntegrationStatus, AiProviderConfig } from '../types/ai.types';

export function maskSecret(value: unknown): { set: boolean; preview: string } {
  if (typeof value !== 'string' || !value.trim()) return { set: false, preview: '' };
  const clean = value.trim();
  return { set: true, preview: clean.length <= 6 ? '••••' : `•••• ${clean.slice(-4)}` };
}

export function maskCredentials(credentials: AiIntegrationCredentials | null | undefined, provider: AiProviderConfig): Record<string, { set: boolean; preview: string }> {
  const out: Record<string, { set: boolean; preview: string }> = {};
  const source = credentials || {};
  for (const field of provider.credentialFields) {
    out[field.key] = field.secret ? maskSecret(source[field.key]) : { set: Boolean(source[field.key]), preview: typeof source[field.key] === 'string' ? String(source[field.key]) : '' };
  }
  return out;
}

export function cleanCredentials(input: unknown): AiIntegrationCredentials {
  const obj = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const out: AiIntegrationCredentials = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const clean = value.trim();
      if (clean) out[key] = clean;
    }
  }
  return out;
}

export function integrationStatus(provider: AiProviderConfig, credentials: AiIntegrationCredentials | null | undefined, updatedAt?: string, encrypted?: boolean): AiIntegrationStatus {
  const masked = maskCredentials(credentials, provider);
  const configured = provider.credentialFields.filter((field) => field.required).every((field) => masked[field.key]?.set);
  return {
    provider: provider.id,
    label: provider.label,
    configured,
    encrypted,
    updated_at: updatedAt,
    credentials: masked,
    defaultModel: typeof credentials?.model === 'string' ? credentials.model : provider.defaultModel,
    models: provider.models,
  };
}

export function mergeCredentials(existing: AiIntegrationCredentials, incoming: AiIntegrationCredentials): AiIntegrationCredentials {
  const out: AiIntegrationCredentials = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  return out;
}
