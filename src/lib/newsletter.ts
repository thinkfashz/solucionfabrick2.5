import 'server-only';
import { createHmac, randomBytes } from 'crypto';
import { insforgeAdmin } from '@/lib/insforge';

/**
 * Helpers del módulo de newsletter (bienvenida + boletín programable).
 *
 * Convenciones:
 * - Una persona suscrita que se da de baja queda con
 *   `status='unsubscribed'`. Las funciones de envío excluyen esos rows.
 * - El token de baja se firma con HMAC-SHA256 usando NEWSLETTER_SECRET
 *   (o ADMIN_SESSION_SECRET como fallback). Es un token determinista
 *   por email — no se guarda en la base, se valida al volver.
 */

export interface NewsletterSubscriberRow {
  email: string;
  name: string | null;
  status: 'confirmed' | 'unsubscribed' | 'bounced';
  source: string | null;
  unsubscribed_at: string | null;
  last_sent_at: string | null;
  created_at: string;
}

export interface NewsletterCampaignRow {
  id: string;
  subject: string;
  body_md: string;
  preview_text: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

function getSecret(): string {
  const secret = process.env.NEWSLETTER_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEWSLETTER_SECRET (or ADMIN_SESSION_SECRET) is required in production to sign unsubscribe tokens.',
      );
    }
    console.warn(
      '[newsletter] No secret configured — using insecure dev fallback. ' +
      'Set NEWSLETTER_SECRET in .env.local.',
    );
    return 'fabrick-newsletter-fallback-change-me';
  }
  return secret;
}

/** Genera token determinista basado en email (HMAC-SHA256, hex 32). */
export function generateUnsubscribeToken(email: string): string {
  const norm = normalizeEmail(email);
  return createHmac('sha256', getSecret())
    .update(`unsubscribe:${norm}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!token || token.length !== 32) return false;
  const expected = generateUnsubscribeToken(email);
  // timing-safe compare
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

/**
 * Inserta o actualiza un suscriptor. Si ya estaba `unsubscribed`, lo
 * deja así (re-opt-in requiere acción explícita). Idempotente.
 */
export async function addSubscriber(input: {
  email: string;
  name?: string | null;
  source?: string | null;
}): Promise<{ ok: boolean; created: boolean; error?: string }> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, created: false, error: 'Email inválido' };

  try {
    const existing = await insforgeAdmin.database
      .from('newsletter_subscribers')
      .select('email,status')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (existing.data) {
      // Sólo refrescar nombre si lo enviaron y el row no estaba dado de baja.
      if (input.name && (existing.data as { status?: string }).status === 'confirmed') {
        await insforgeAdmin.database
          .from('newsletter_subscribers')
          .update({ name: String(input.name).slice(0, 200) })
          .eq('email', email);
      }
      return { ok: true, created: false };
    }
  } catch {
    /* ignore — fall through to insert */
  }

  try {
    const { error } = await insforgeAdmin.database.from('newsletter_subscribers').insert([
      {
        email,
        name: input.name ? String(input.name).slice(0, 200) : null,
        status: 'confirmed',
        source: input.source ?? 'signup',
      },
    ]);
    if (error) {
      const code = (error as { code?: string }).code;
      // 23505 = unique_violation: ya existía (race condition)
      if (code === '23505') return { ok: true, created: false };
      return { ok: false, created: false, error: (error as { message?: string }).message };
    }
    return { ok: true, created: true };
  } catch (err) {
    return { ok: false, created: false, error: (err as Error).message };
  }
}

export async function unsubscribeByEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const norm = normalizeEmail(email);
  if (!isValidEmail(norm)) return { ok: false, error: 'Email inválido' };
  try {
    await insforgeAdmin.database
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('email', norm);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Lista suscriptores confirmados. Hasta 1000 por llamada. */
export async function listConfirmedSubscribers(limit = 1000): Promise<NewsletterSubscriberRow[]> {
  try {
    const { data, error } = await insforgeAdmin.database
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data as NewsletterSubscriberRow[];
  } catch {
    return [];
  }
}

/** Devuelve {total, confirmados, baja} */
export async function subscribersCounts(): Promise<{
  total: number;
  confirmed: number;
  unsubscribed: number;
}> {
  try {
    const { data } = await insforgeAdmin.database
      .from('newsletter_subscribers')
      .select('status');
    const rows = (data ?? []) as Array<{ status?: string }>;
    return {
      total: rows.length,
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
      unsubscribed: rows.filter((r) => r.status === 'unsubscribed').length,
    };
  } catch {
    return { total: 0, confirmed: 0, unsubscribed: 0 };
  }
}

/** Escapa minimal HTML para el plaintext fallback. */
export function stripMd(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_>`~]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildUnsubscribeLink(email: string, origin?: string): string {
  const base =
    (origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const token = generateUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${base}/newsletter/baja?${params.toString()}`;
}

/** Generador simple de id corto para correlación en logs. */
export function shortId(): string {
  return randomBytes(4).toString('hex');
}
