import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { fetchMercadoPagoAccount, detectMpMode, getMpTokenPrefix, type MercadoPagoAccountInfo } from '@/lib/mercadopago';

export const MP_LAB_PROVIDER = 'mercadopago_lab';
export const MP_LAB_EVENTS_PROVIDER = 'mercadopago_lab_events';
export const MP_API_BASE = 'https://api.mercadopago.com';

type Source = 'db' | 'missing';

export type MercadoPagoLabCredentials = {
  publicKey: string;
  accessToken: string;
  webhookSecret: string;
  source: Source;
  encryptedAtRest: boolean;
  missing: string[];
};

export type MercadoPagoLabStatus = {
  ready: boolean;
  mode: 'production' | 'sandbox' | 'unknown';
  tokenPrefix: string;
  publicKeyPreview: string;
  accessTokenPreview: string;
  webhookSecretPreview: string;
  encryptedAtRest: boolean;
  account: MercadoPagoAccountInfo | null;
  message: string;
};

export type MercadoPagoLabEvent = {
  id: string;
  receivedAt: string;
  method: string;
  query: Record<string, string>;
  body: unknown;
  paymentId?: string;
  topic?: string;
  type?: string;
  action?: string;
  userId?: string;
  liveMode?: boolean;
  payment?: unknown;
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function preview(value: string) {
  if (!value) return '—';
  if (value.length <= 10) return '•••';
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export async function getMercadoPagoLabCredentials(): Promise<MercadoPagoLabCredentials> {
  try {
    const { data } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', MP_LAB_PROVIDER)
      .limit(1);
    const row = Array.isArray(data) && data.length > 0 ? data[0] as { credentials?: Record<string, unknown> } : null;
    const plain = decryptCredentials(row?.credentials ?? {});
    const publicKey = clean(plain.public_key);
    const accessToken = clean(plain.access_token);
    const webhookSecret = clean(plain.webhook_secret);
    const missing = [
      !publicKey ? 'public_key' : '',
      !accessToken ? 'access_token' : '',
    ].filter(Boolean);
    return { publicKey, accessToken, webhookSecret, source: publicKey || accessToken ? 'db' : 'missing', encryptedAtRest: isEncryptionConfigured(), missing };
  } catch {
    return { publicKey: '', accessToken: '', webhookSecret: '', source: 'missing', encryptedAtRest: isEncryptionConfigured(), missing: ['public_key', 'access_token'] };
  }
}

export async function saveMercadoPagoLabCredentials(input: { publicKey?: string; accessToken?: string; webhookSecret?: string }) {
  const current = await getMercadoPagoLabCredentials();
  const next = {
    public_key: clean(input.publicKey) || current.publicKey,
    access_token: clean(input.accessToken) || current.accessToken,
    webhook_secret: clean(input.webhookSecret) || current.webhookSecret,
  };
  const encrypted = encryptCredentials(next);
  const { error } = await insforgeAdmin.database.from('integrations').upsert([
    { provider: MP_LAB_PROVIDER, credentials: encrypted, updated_at: new Date().toISOString() },
  ], { onConflict: 'provider' });
  if (error) throw new Error((error as { message?: string }).message || 'No se pudieron guardar credenciales MercadoPago Lab.');
  return getMercadoPagoLabStatus();
}

export async function getMercadoPagoLabStatus(): Promise<MercadoPagoLabStatus> {
  const creds = await getMercadoPagoLabCredentials();
  const mode = detectMpMode(creds.accessToken);
  const account = creds.accessToken ? await fetchMercadoPagoAccount(creds.accessToken) : null;
  const verifiedMode = account?.isTestUser ? 'sandbox' : mode;
  const ready = creds.missing.length === 0;
  return {
    ready,
    mode: verifiedMode,
    tokenPrefix: getMpTokenPrefix(creds.accessToken),
    publicKeyPreview: preview(creds.publicKey),
    accessTokenPreview: preview(creds.accessToken),
    webhookSecretPreview: preview(creds.webhookSecret),
    encryptedAtRest: creds.encryptedAtRest,
    account,
    message: ready ? `MercadoPago Lab listo (${verifiedMode}).` : `Faltan credenciales: ${creds.missing.join(', ')}`,
  };
}

export async function mpLabFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const creds = await getMercadoPagoLabCredentials();
  if (!creds.accessToken) throw new Error('Falta access_token de MercadoPago Lab.');
  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `MercadoPago respondió HTTP ${response.status}`);
  return data as T;
}

export async function appendMercadoPagoLabEvent(event: MercadoPagoLabEvent) {
  try {
    const { data } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', MP_LAB_EVENTS_PROVIDER)
      .limit(1);
    const row = Array.isArray(data) && data.length > 0 ? data[0] as { credentials?: Record<string, unknown> } : null;
    const previous = row?.credentials?.events;
    const events = Array.isArray(previous) ? previous as MercadoPagoLabEvent[] : [];
    const next = [event, ...events].slice(0, 40);
    await insforgeAdmin.database.from('integrations').upsert([
      { provider: MP_LAB_EVENTS_PROVIDER, credentials: { events: next }, updated_at: new Date().toISOString() },
    ], { onConflict: 'provider' });
  } catch {
    // Best effort: the webhook must respond 200 even if the internal log table is not available.
  }
}

export async function listMercadoPagoLabEvents(): Promise<MercadoPagoLabEvent[]> {
  try {
    const { data } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', MP_LAB_EVENTS_PROVIDER)
      .limit(1);
    const row = Array.isArray(data) && data.length > 0 ? data[0] as { credentials?: Record<string, unknown> } : null;
    const events = row?.credentials?.events;
    return Array.isArray(events) ? events as MercadoPagoLabEvent[] : [];
  } catch {
    return [];
  }
}
