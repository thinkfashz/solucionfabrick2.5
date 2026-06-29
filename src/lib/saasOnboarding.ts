import { insforgeAdmin } from '@/lib/insforge';
import { TENANT_PALETTES, type TenantPaletteId } from '@/lib/tenantTheme';

export type SaaSOnboardingInput = {
  businessName: string;
  ownerName?: string;
  ownerEmail: string;
  ownerPhone?: string;
  planId: 'starter' | 'pro' | 'enterprise';
  paletteId?: TenantPaletteId;
  primaryColor?: string;
  modules?: string[];
  source?: string;
};

export type SaaSOnboardingResult = {
  ok: boolean;
  tenantId?: string;
  slug?: string;
  adminEmail?: string;
  adminCreated?: boolean;
  tempPassword?: string;
  modules?: string[];
  welcomeEmail?: 'sent' | 'skipped' | 'failed';
  setupRequired?: boolean;
  error?: string;
};

const DEFAULT_MODULES = [
  'store',
  'checkout',
  'quotes',
  'budgets',
  'tenant_branding',
  'tenant_palette',
  'integrations',
  'analytics',
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || `tenant-${Date.now()}`;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%';
  let out = '';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

function resolvePalette(input: SaaSOnboardingInput) {
  const palette = TENANT_PALETTES.find((item) => item.id === input.paletteId) || TENANT_PALETTES[0];
  return {
    palette,
    primaryColor: input.primaryColor?.trim() || palette.primary,
  };
}

function isMissingTableError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message || '') : String(error || '');
  return /does not exist|schema cache|relation .* not found|table .* not found|404/i.test(message);
}

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

async function findAvailableSlug(base: string) {
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}-${randomSuffix()}`;
    const { data, error } = await insforgeAdmin.database.from('tenants').select('id').eq('slug', candidate).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 56);
}

async function createAuthUser(email: string, password: string) {
  const auth = (insforgeAdmin as unknown as { auth?: Record<string, unknown> }).auth;
  const signUp = auth?.signUpWithPassword || auth?.signUp;
  if (typeof signUp !== 'function') return { created: false, reason: 'auth_method_unavailable' };

  try {
    const result = await (signUp as Function).call(auth, { email, password });
    const error = result?.error;
    if (error) {
      const message = String(error.message || error);
      if (/already|exists|duplicate/i.test(message)) return { created: false, reason: 'already_exists' };
      return { created: false, reason: message };
    }
    return { created: true, reason: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/already|exists|duplicate/i.test(message)) return { created: false, reason: 'already_exists' };
    return { created: false, reason: message };
  }
}

async function notifyWelcome(tenantId: string, tempPassword: string) {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  const baseUrl = appBaseUrl();
  if (!secret || !baseUrl) return 'skipped' as const;

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/platform/notify-activation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-platform-secret': secret,
      },
      body: JSON.stringify({ tenant_id: tenantId, temp_password: tempPassword }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok ? 'sent' as const : 'failed' as const;
  } catch {
    return 'failed' as const;
  }
}

async function insertModules(tenantId: string, modules: string[]) {
  const rows = modules.map((module) => ({ tenant_id: tenantId, module, enabled: true }));
  try {
    const result = await insforgeAdmin.database.from('tenant_modules').upsert(rows, { onConflict: 'tenant_id,module' });
    if (result.error && !isMissingTableError(result.error)) throw result.error;
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
}

export async function provisionSaaSTenant(input: SaaSOnboardingInput): Promise<SaaSOnboardingResult> {
  const ownerEmail = normalizeEmail(input.ownerEmail || '');
  const businessName = input.businessName?.trim();
  if (!businessName || businessName.length < 2) return { ok: false, error: 'Nombre de empresa requerido.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return { ok: false, error: 'Correo del dueño inválido.' };

  const modules = Array.from(new Set([...(input.modules || []), ...DEFAULT_MODULES]));
  const { primaryColor } = resolvePalette(input);
  const baseSlug = slugify(businessName);
  const tempPassword = generateTempPassword();

  try {
    const slug = await findAvailableSlug(baseSlug);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const tenantPayload = {
      slug,
      name: businessName,
      owner_email: ownerEmail,
      owner_name: input.ownerName?.trim() || null,
      owner_phone: input.ownerPhone?.trim() || null,
      phone: input.ownerPhone?.trim() || null,
      billing_email: ownerEmail,
      plan_id: input.planId || 'starter',
      status: 'trial',
      trial_ends_at: trialEndsAt,
      primary_color: primaryColor,
    };

    const tenantInsert = await insforgeAdmin.database.from('tenants').insert([tenantPayload]).select('id, slug').limit(1);
    if (tenantInsert.error) throw tenantInsert.error;

    const tenant = tenantInsert.data?.[0] as { id: string; slug: string } | undefined;
    if (!tenant?.id) throw new Error('No se pudo crear tenant.');

    const authResult = await createAuthUser(ownerEmail, tempPassword);

    const adminInsert = await insforgeAdmin.database.from('admin_users').upsert([{
      email: ownerEmail,
      rol: 'admin',
      aprobado: true,
      tenant_id: tenant.id,
    }], { onConflict: 'email,tenant_id' });
    if (adminInsert.error) throw adminInsert.error;

    const subscriptionInsert = await insforgeAdmin.database.from('platform_subscriptions').insert([{
      tenant_id: tenant.id,
      plan_id: input.planId || 'starter',
      status: 'pending',
      amount_clp: input.planId === 'enterprise' ? 149990 : input.planId === 'pro' ? 59990 : 29990,
    }]);
    if (subscriptionInsert.error && !isMissingTableError(subscriptionInsert.error)) throw subscriptionInsert.error;

    await insertModules(tenant.id, modules);

    await insforgeAdmin.database.from('admin_error_logs').insert([{
      endpoint: '/api/saas/onboarding',
      method: 'POST',
      payload: { tenant_id: tenant.id, slug: tenant.slug, plan: input.planId, modules, source: input.source || 'registro' },
      error_message: null,
      status_code: 200,
    }]).then(() => void 0, () => void 0);

    const welcomeEmail = await notifyWelcome(tenant.id, tempPassword);

    return {
      ok: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      adminEmail: ownerEmail,
      adminCreated: authResult.created,
      tempPassword: authResult.created ? tempPassword : undefined,
      modules,
      welcomeEmail,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { ok: false, setupRequired: true, error: 'Faltan tablas SaaS. Ejecuta la migración multi-tenant al final antes de activar onboarding real.' };
    }
    const message = err instanceof Error ? err.message : String(err);
    await insforgeAdmin.database.from('admin_error_logs').insert([{
      endpoint: '/api/saas/onboarding',
      method: 'POST',
      payload: { businessName, ownerEmail, plan: input.planId, source: input.source || 'registro' },
      error_message: message,
      status_code: 500,
    }]).then(() => void 0, () => void 0);
    return { ok: false, error: message };
  }
}
