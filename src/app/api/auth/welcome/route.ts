import { NextResponse, type NextRequest } from 'next/server';
import { addSubscriber, buildUnsubscribeLink, normalizeEmail } from '@/lib/newsletter';
import { getResendCredentials } from '@/lib/resendCredentials';
import { insforgeAdmin } from '@/lib/insforge';
import { sendWelcomeEmail } from '@/lib/emailDriver';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
const welcomeSchema = {
  email: v.email({ required: true, max: 255 }),
  name:  v.string({ max: 200 }),
};

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => ({}));
  const result = parse(welcomeSchema, raw);
  if (!result.ok) return validationError(result.errors);

  const email = normalizeEmail(result.data.email as string);
  const name  = (result.data.name as string | undefined) ?? null;

  const subscription = await addSubscriber({ email, name, source: 'signup' });

  if (await recentlySent(email)) {
    return NextResponse.json({ ok: true, deduped: true, subscribed: subscription.ok });
  }

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json(
      {
        ok: true,
        subscribed: subscription.ok,
        emailed: false,
        warning: 'Resend no está configurado. Agrega la API Key en /admin/integraciones.',
      },
      { status: 200 },
    );
  }

  const shopUrl = pickShopUrl(request.url);
  const logoUrl = pickLogoUrl(request.url);
  const unsubscribeUrl = buildUnsubscribeLink(email, shopUrl || undefined);

  const emailResult = await sendWelcomeEmail({
    to: email,
    name,
    shopUrl: shopUrl || 'https://solucionesfabrick.cl',
    unsubscribeUrl,
    logoUrl,
  });

  if (!emailResult.ok && !emailResult.simulated) {
    return NextResponse.json(
      { ok: false, subscribed: subscription.ok, emailed: false, error: emailResult.error },
      { status: 502 },
    );
  }
  if (!emailResult.simulated) await recordSent(email);
  return NextResponse.json({ ok: true, subscribed: subscription.ok, emailed: !emailResult.simulated, id: emailResult.id ?? null });
}
