import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TenantProfile = {
  id: string;
  slug: string;
  name: string;
  owner_email?: string | null;
  owner_name?: string | null;
  phone?: string | null;
  custom_domain?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  billing_email?: string | null;
  status?: string | null;
  plan_id?: string | null;
  trial_ends_at?: string | null;
  updated_at?: string | null;
};

type UpdatePayload = {
  name?: unknown;
  owner_name?: unknown;
  phone?: unknown;
  custom_domain?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
  billing_email?: unknown;
};

function isMissingTenants(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

function text(value: unknown, max = 180): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim().slice(0, max);
  return next || null;
}

function color(value: unknown): string | null {
  const next = text(value, 20);
  if (!next) return null;
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : null;
}

function domain(value: unknown): string | null {
  const next = text(value, 120)?.toLowerCase() ?? null;
  if (!next) return null;
  const cleaned = next.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned) ? cleaned : null;
}

function url(value: unknown): string | null {
  const next = text(value, 500);
  if (!next) return null;
  try {
    const parsed = new URL(next);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function email(value: unknown): string | null {
  const next = text(value, 180)?.toLowerCase() ?? null;
  if (!next) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'settings', action: 'read' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { data, error } = await insforgeAdmin.database
    .from('tenants')
    .select('id, slug, name, owner_email, owner_name, phone, custom_domain, logo_url, primary_color, billing_email, status, plan_id, trial_ends_at, updated_at')
    .eq('id', ctx.tenantId)
    .limit(1);

  if (error) {
    if (isMissingTenants(error)) {
      return NextResponse.json({
        ok: false,
        setupRequired: true,
        tenantId: ctx.tenantId,
        error: 'La tabla tenants todavía no existe. Puedes seguir usando la app y ejecutar la migración SaaS al final.',
      }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profile = Array.isArray(data) && data.length > 0 ? data[0] as TenantProfile : null;
  if (!profile) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      tenantId: ctx.tenantId,
      error: 'No existe perfil de empresa para este tenant todavía.',
    }, { status: 200 });
  }

  return NextResponse.json({ ok: true, tenantId: ctx.tenantId, profile });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'settings', action: 'update' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let body: UpdatePayload;
  try {
    body = await request.json() as UpdatePayload;
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if ('name' in body) updates.name = text(body.name, 120);
  if ('owner_name' in body) updates.owner_name = text(body.owner_name, 120);
  if ('phone' in body) updates.phone = text(body.phone, 40);
  if ('custom_domain' in body) updates.custom_domain = domain(body.custom_domain);
  if ('logo_url' in body) updates.logo_url = url(body.logo_url);
  if ('primary_color' in body) updates.primary_color = color(body.primary_color);
  if ('billing_email' in body) updates.billing_email = email(body.billing_email);

  if (!updates.name && 'name' in body) {
    return NextResponse.json({ error: 'El nombre de empresa es obligatorio.' }, { status: 400 });
  }

  const { data, error } = await insforgeAdmin.database
    .from('tenants')
    .update(updates)
    .eq('id', ctx.tenantId)
    .select('id, slug, name, owner_email, owner_name, phone, custom_domain, logo_url, primary_color, billing_email, status, plan_id, trial_ends_at, updated_at')
    .limit(1);

  if (error) {
    if (isMissingTenants(error)) {
      return NextResponse.json({
        ok: false,
        setupRequired: true,
        error: 'La tabla tenants todavía no existe. Ejecuta la migración SaaS al final para activar este módulo.',
      }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenantId: ctx.tenantId, profile: Array.isArray(data) ? data[0] : null });
}
