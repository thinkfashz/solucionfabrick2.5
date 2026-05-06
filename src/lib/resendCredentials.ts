import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials } from '@/lib/integrationsCrypto';

const RESEND_ENV_NAMES = ['RESEND_API_KEY', 'RESEND_KEY'] as const;
const RESEND_FROM_ENV_NAMES = ['RESEND_FROM', 'RESEND_FROM_EMAIL'] as const;

function pickEnv(names: readonly string[]): string | null {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

export interface ResendCredentials {
  apiKey: string;
  /** Dirección "From" — opcional; si falta el llamador debe usar un default propio. */
  from: string | null;
  source: 'env' | 'db';
}

/**
 * Resuelve las credenciales de Resend. Prioriza variables de entorno
 * (RESEND_API_KEY, RESEND_FROM) y cae a la fila `integrations.provider='resend'`
 * (campos `api_key` y `from`). Compatible con cifrado AES-GCM en reposo.
 */
export async function getResendCredentials(): Promise<ResendCredentials | null> {
  const envApiKey = pickEnv(RESEND_ENV_NAMES);
  const envFrom = pickEnv(RESEND_FROM_ENV_NAMES);
  if (envApiKey) {
    return { apiKey: envApiKey, from: envFrom, source: 'env' };
  }

  try {
    const { data, error } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'resend')
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const creds = decryptCredentials(
      (data as { credentials?: Record<string, unknown> }).credentials ?? {},
    ) as Record<string, string | undefined>;
    const apiKey = typeof creds.api_key === 'string' ? creds.api_key.trim() : '';
    if (!apiKey) return null;
    const from = typeof creds.from === 'string' && creds.from.trim().length > 0 ? creds.from.trim() : null;
    return { apiKey, from, source: 'db' };
  } catch {
    return null;
  }
}
