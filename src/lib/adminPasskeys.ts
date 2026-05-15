/**
 * Server-side helpers for WebAuthn / Passkey authentication.
 *
 * Covers:
 *  1. RP ID / origin resolution (honours WEBAUTHN_RP_ID env override)
 *  2. Short-lived challenge cookie (HMAC-signed, 2-minute TTL)
 *  3. InsForge CRUD for the admin_passkeys table
 */
import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, SESSION_COOKIE_OPTIONS, SESSION_TTL_MS, encodeSession } from '@/lib/adminAuth';

export const RP_NAME = 'Soluciones Fabrick Admin';
const CHALLENGE_TTL_MS = 2 * 60 * 1000;
export const CHALLENGE_COOKIE_NAME = 'pk_challenge';

export function getRpId(request: Request): string {
  const explicit = (process.env.WEBAUTHN_RP_ID ?? process.env.NEXT_PUBLIC_DOMAIN ?? '').trim();
  if (explicit) return explicit;
  try { return new URL(request.url).hostname; } catch { return 'localhost'; }
}

export function getOrigin(request: Request): string {
  const explicit = (process.env.WEBAUTHN_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  try {
    const u = new URL(request.url);
    return u.origin;
  } catch { return 'http://localhost:3001'; }
}

export interface ChallengePayload {
  ch: string;
  type: 'register' | 'authenticate';
  email?: string;
  exp: number;
}

async function getChallengeKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET is required for passkey authentication.');
  }
  const raw = new TextEncoder().encode(secret ?? 'fabrick-admin-dev-only-secret');
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signChallengeCookie(payload: ChallengePayload): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await getChallengeKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${Buffer.from(sig).toString('base64url')}`;
}

export async function verifyChallengeCookie(cookie: string): Promise<ChallengePayload | null> {
  try {
    const dot = cookie.lastIndexOf('.');
    if (dot === -1) return null;
    const data = cookie.slice(0, dot);
    const sig = cookie.slice(dot + 1);
    const key = await getChallengeKey();
    const valid = await crypto.subtle.verify(
      'HMAC', key, Buffer.from(sig, 'base64url'), new TextEncoder().encode(data),
    );
    if (!valid) return null;
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as ChallengePayload;
    if (typeof p.ch !== 'string' || typeof p.exp !== 'number') return null;
    if (Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

export const CHALLENGE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: CHALLENGE_TTL_MS / 1000,
};

export const CLEAR_CHALLENGE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
  expires: new Date(0),
};

export interface StoredPasskey {
  id: string;
  user_email: string;
  tenant_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: boolean;
  transports: string[] | null;
  aaguid: string | null;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export async function getPasskeysForUser(email: string, tenantId: string): Promise<StoredPasskey[]> {
  try {
    const { data, error } = await insforgeAdmin.database
      .from('admin_passkeys')
      .select('id, user_email, tenant_id, public_key, counter, device_type, backed_up, transports, aaguid, name, created_at, last_used_at')
      .eq('user_email', email)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[adminPasskeys] list error:', error); return []; }
    return (data ?? []) as StoredPasskey[];
  } catch { return []; }
}

export async function getPasskeyById(credentialId: string): Promise<StoredPasskey | null> {
  try {
    const { data, error } = await insforgeAdmin.database
      .from('admin_passkeys')
      .select('*')
      .eq('id', credentialId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as StoredPasskey | null;
  } catch { return null; }
}

export async function savePasskey(passkey: Omit<StoredPasskey, 'last_used_at'>): Promise<void> {
  const { error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .insert([passkey]);
  if (error) throw new Error(`Failed to save passkey: ${error.message}`);
}

export async function updatePasskeyCounter(credentialId: string, newCounter: number): Promise<void> {
  const { error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .update({ counter: newCounter, last_used_at: new Date().toISOString() })
    .eq('id', credentialId);
  if (error) throw new Error(`Failed to update passkey counter: ${error.message}`);
}

export async function deletePasskey(credentialId: string, email: string, tenantId: string): Promise<boolean> {
  const { error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .delete()
    .eq('id', credentialId)
    .eq('user_email', email)
    .eq('tenant_id', tenantId);
  if (error) { console.error('[adminPasskeys] delete error:', error); return false; }
  return true;
}

export async function renamePasskey(credentialId: string, email: string, tenantId: string, name: string): Promise<boolean> {
  const { error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .update({ name })
    .eq('id', credentialId)
    .eq('user_email', email)
    .eq('tenant_id', tenantId);
  if (error) { console.error('[adminPasskeys] rename error:', error); return false; }
  return true;
}

export async function createPasskeySession(
  email: string,
  rol: 'superadmin' | 'admin' | 'viewer',
  tenantId: string,
): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  return encodeSession({ email, exp, rol, tenant_id: tenantId });
}

export { ADMIN_COOKIE_NAME, SESSION_COOKIE_OPTIONS };
