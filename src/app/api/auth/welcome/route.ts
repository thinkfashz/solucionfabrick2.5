import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { addSubscriber, buildUnsubscribeLink, isValidEmail, normalizeEmail } from '@/lib/newsletter';
import { getResendCredentials } from '@/lib/resendCredentials';
import { insforgeAdmin } from '@/lib/insforge';
import WelcomeEmail from '@/emails/WelcomeEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Sandbox de Resend — sólo válido para pruebas. Configura RESEND_FROM en
// producción con un dominio verificado.
const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

interface WelcomeBody {
  email?: unknown;
  name?: unknown;
}

function pickLogoUrl(requestUrl: string): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/+$/, '')}/logo.png`;
  try {
    const u = new URL(requestUrl);
    return `${u.origin}/logo.png`;
  } catch {
    return undefined;
  }
}

function pickShopUrl(requestUrl: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    return new URL(requestUrl).origin;
  } catch {
    return '';
  }
}

async function recentlySent(email: string): Promise<boolean> {
  try {
    const { data } = await insforgeAdmin.database
      .from('welcome_emails_log')
      .select('email,sent_at')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (!data) return false;
    const sentAt = new Date((data as { sent_at?: string }).sent_at ?? 0).getTime();
    return Date.now() - sentAt < DEDUP_WINDOW_MS;
  } catch {
    return false;
  }
}

async function recordSent(email: string): Promise<void> {
  try {
    await insforgeAdmin.database
      .from('welcome_emails_log')
      .upsert([{ email, sent_at: new Date().toISOString() }], { onConflict: 'email' });
  } catch {
    /* best-effort */
  }
}

/**
 * POST /api/auth/welcome
 *
 * Llamado desde la página `/auth` tras un signUp exitoso. No requiere
 * sesión (el cliente recién registrado todavía no tiene token útil) —
 * la idempotencia evita abuso: cada email recibe a lo sumo un correo
 * de bienvenida cada 24h.
 */
export async function POST(request: NextRequest) {
  let body: WelcomeBody;
  try {
    body = (await request.json()) as WelcomeBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido (JSON requerido).' }, { status: 400 });
  }

  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) || null : null;

  const subscription = await addSubscriber({ email, name, source: 'signup' });

  if (await recentlySent(email)) {
    return NextResponse.json({ ok: true, deduped: true, subscribed: subscription.ok });
  }

  const creds = await getResendCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        ok: true,
        subscribed: subscription.ok,
        emailed: false,
        warning:
          'Resend no está configurado. Agrega la API Key en /admin/integraciones para activar correos de bienvenida.',
      },
      { status: 200 },
    );
  }

  const shopUrl = pickShopUrl(request.url);
  const logoUrl = pickLogoUrl(request.url);
  const unsubscribeUrl = buildUnsubscribeLink(email, shopUrl || undefined);

  const resend = new Resend(creds.apiKey);
  const from = creds.from ?? DEFAULT_FROM;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: '¡Bienvenido a Soluciones Fabrick!',
      react: WelcomeEmail({
        customerName: name,
        shopUrl: shopUrl || 'https://solucionesfabrick.cl',
        unsubscribeUrl,
        logoUrl,
      }),
    });
    if (error) {
      return NextResponse.json(
        { ok: false, subscribed: subscription.ok, emailed: false, error: error.message },
        { status: 502 },
      );
    }
    await recordSent(email);
    return NextResponse.json({ ok: true, subscribed: subscription.ok, emailed: true, id: data?.id ?? null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, subscribed: subscription.ok, emailed: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
