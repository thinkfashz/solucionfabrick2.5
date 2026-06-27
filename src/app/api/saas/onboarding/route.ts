import { NextResponse } from 'next/server';
import { provisionSaaSTenant, type SaaSOnboardingInput } from '@/lib/saasOnboarding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = Partial<SaaSOnboardingInput> & {
  acceptTerms?: boolean;
};

const VALID_PLANS = new Set(['starter', 'pro', 'enterprise']);

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function tenantUrls(slug: string) {
  return {
    storeUrl: `https://${slug}.solucionesfabrick.com`,
    adminUrl: `https://${slug}.solucionesfabrick.com/admin`,
    fallbackAdminUrl: `/admin?tenant=${encodeURIComponent(slug)}`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;

    if (!body.acceptTerms) {
      return NextResponse.json({ ok: false, error: 'Debes aceptar los términos para crear la empresa demo.' }, { status: 400 });
    }

    const planId = VALID_PLANS.has(cleanString(body.planId)) ? cleanString(body.planId) as SaaSOnboardingInput['planId'] : 'starter';
    const businessName = cleanString(body.businessName);
    const ownerEmail = cleanString(body.ownerEmail).toLowerCase();
    const ownerName = cleanString(body.ownerName);
    const ownerPhone = cleanString(body.ownerPhone);
    const primaryColor = cleanString(body.primaryColor);
    const paletteId = cleanString(body.paletteId) as SaaSOnboardingInput['paletteId'];

    const result = await provisionSaaSTenant({
      businessName,
      ownerEmail,
      ownerName,
      ownerPhone,
      planId,
      paletteId,
      primaryColor,
      source: 'public-registro',
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.setupRequired ? 503 : 400 });
    }

    return NextResponse.json({
      ...result,
      tempPassword: undefined,
      urls: result.slug ? tenantUrls(result.slug) : null,
      message: result.welcomeEmail === 'sent'
        ? 'Empresa creada. Enviamos las instrucciones de acceso al correo del dueño.'
        : 'Empresa creada. Revisa el panel de Super Admin para entregar acceso manual si el correo no salió.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo procesar el onboarding.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
