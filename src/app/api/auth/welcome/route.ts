import { NextResponse, type NextRequest } from 'next/server';
import { addSubscriber, buildUnsubscribeLink, normalizeEmail } from '@/lib/newsletter';
import { getResendCredentials } from '@/lib/resendCredentials';
import { insforgeAdmin } from '@/lib/insforge';
import { sendEmail } from '@/lib/emailDriver';
import WelcomeEmail from '@/emails/WelcomeEmail';
import { getTenantById, getTenantBySlug } from '@/lib/tenant';
import { v, parse, validationError } from '@/lib/validate';
import type { ReactElement } from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    // best-effort
  }
}

function shopUrl(request: NextRequest) {
  try {
    return request.nextUrl.origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://solucionesfabrick.com';
  }
}

async function resolveBranding(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || '';
  const tenantSlug = request.headers.get('x-tenant-slug') || '';
  const tenant = tenantId
    ? await getTenantById(tenantId)
    : tenantSlug
      ? await getTenantBySlug(tenantSlug)
      : null;

  return {
    name: tenant?.name || 'Soluciones Fabrick',
    logoUrl: tenant?.logoUrl || `${request.nextUrl.origin}/brand/soluciones-fabrick-email.png`,
    accentColor: tenant?.primaryColor || '#F5871F',
    contactEmail: tenant?.contactEmail || tenant?.ownerEmail || 'contacto@solucionesfabrick.com',
  };
}

const welcomeSchema = {
  email: v.email({ required: true, max: 255 }),
  name: v.string({ max: 200 }),
};

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => ({}));
  const result = parse(welcomeSchema, raw);
  if (!result.ok) return validationError(result.errors);

  const email = normalizeEmail(result.data.email as string);
  const name = (result.data.name as string | undefined) ?? null;
  const subscription = await addSubscriber({ email, name, source: 'signup' });

  if (await recentlySent(email)) {
    return NextResponse.json({ ok: true, deduped: true, subscribed: subscription.ok });
  }

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({
      ok: true,
      subscribed: subscription.ok,
      emailed: false,
      warning: 'El proveedor de correo aún no está configurado.',
    });
  }

  const brand = await resolveBranding(request).catch(() => ({
    name: 'Soluciones Fabrick',
    logoUrl: `${request.nextUrl.origin}/brand/soluciones-fabrick-email.png`,
    accentColor: '#F5871F',
    contactEmail: 'contacto@solucionesfabrick.com',
  }));
  const appUrl = shopUrl(request);
  const unsubscribeUrl = buildUnsubscribeLink(email, appUrl || undefined);

  const emailResult = await sendEmail({
    to: email,
    subject: `¡Bienvenido a ${brand.name}!`,
    replyTo: brand.contactEmail,
    react: WelcomeEmail({
      customerName: name ?? undefined,
      shopUrl: appUrl,
      unsubscribeUrl,
      logoUrl: brand.logoUrl,
      brandName: brand.name,
      accentColor: brand.accentColor,
      contactEmail: brand.contactEmail,
    }) as ReactElement,
  });

  if (!emailResult.ok && !emailResult.simulated) {
    return NextResponse.json({ ok: false, subscribed: subscription.ok, emailed: false, error: emailResult.error }, { status: 502 });
  }
  if (!emailResult.simulated) await recordSent(email);
  return NextResponse.json({ ok: true, subscribed: subscription.ok, emailed: !emailResult.simulated, id: emailResult.id ?? null });
}
