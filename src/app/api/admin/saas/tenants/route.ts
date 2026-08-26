import { NextRequest, NextResponse } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { toSlug } from '@/lib/tenant-edge';
import { ensureSaasTenantSchema } from '@/lib/ensureSaasTenantSchema';
import { invalidateTenantCache } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PLANS = new Set(['starter', 'pro', 'enterprise', 'free']);
const VALID_STATUSES = new Set(['active', 'suspended', 'trial', 'cancelled']);
const TENANT_SELECT = 'id, slug, name, plan_id, status, owner_email, owner_name, owner_phone, phone, contact_email, billing_email, custom_domain, logo_url, primary_color, trial_ends_at, created_at, updated_at';

function cleanText(value: unknown, max = 255): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanEmail(value: unknown): string {
  return cleanText(value, 255).toLowerCase();
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) return null;
  if (domain.length > 253 || !/^[a-z0-9.-]+$/.test(domain) || !domain.includes('.')) return null;
  return domain;
}

function normalizeLogoUrl(value: unknown): string | null {
  const url = cleanText(value, 1200);
  if (!url) return null;
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeColor(value: unknown): string {
  const color = cleanText(value, 20);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : '#F5871F';
}

async function requireRoot(request: NextRequest) {
  return requireAdminPermission(request, { resource: 'admin', action: 'manage' });
}

async function schemaOrResponse(force = false) {
  const schema = await ensureSaasTenantSchema({ force });
  if (schema.ok) return null;
  return NextResponse.json({
    error: 'La base SaaS necesita una reparación de esquema antes de continuar.',
    detail: schema.detail,
    setupRequired: true,
    repairRoute: '/api/admin/superadmin/saas/repair',
  }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const auth = await requireRoot(request);
  if (!auth.ok) return auth.response;

  const schemaResponse = await schemaOrResponse();
  if (schemaResponse) return schemaResponse;

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .select(TENANT_SELECT)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_GET_FAILED', 500, request);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRoot(request);
  if (!auth.ok) return auth.response;

  const schemaResponse = await schemaOrResponse();
  if (schemaResponse) return schemaResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const name = cleanText(body.name, 100);
  const ownerEmail = cleanEmail(body.owner_email);
  const ownerName = cleanText(body.owner_name, 100);
  const ownerPhone = cleanText(body.owner_phone, 30);
  const contactEmail = cleanEmail(body.contact_email) || ownerEmail;
  const billingEmail = cleanEmail(body.billing_email) || ownerEmail;
  const customDomain = normalizeDomain(body.custom_domain);
  const logoUrl = normalizeLogoUrl(body.logo_url);
  const primaryColor = normalizeColor(body.primary_color);
  const planId = typeof body.plan_id === 'string' && VALID_PLANS.has(body.plan_id) ? body.plan_id : 'starter';

  if (!name) return NextResponse.json({ error: 'El nombre público de la aplicación es obligatorio.' }, { status: 400 });
  if (!ownerEmail || !validEmail(ownerEmail)) return NextResponse.json({ error: 'Correo del propietario inválido.' }, { status: 400 });
  if (!ownerName) return NextResponse.json({ error: 'El nombre del contacto principal es obligatorio.' }, { status: 400 });
  if (!validEmail(contactEmail)) return NextResponse.json({ error: 'Correo de contacto inválido.' }, { status: 400 });
  if (!validEmail(billingEmail)) return NextResponse.json({ error: 'Correo de facturación inválido.' }, { status: 400 });
  if (body.custom_domain && !customDomain) return NextResponse.json({ error: 'Dominio propio inválido.' }, { status: 400 });
  if (body.logo_url && !logoUrl) return NextResponse.json({ error: 'La URL del logo no es válida.' }, { status: 400 });

  const baseSlug = toSlug(name).slice(0, 40);
  if (!baseSlug || baseSlug.length < 3) return NextResponse.json({ error: 'No se pudo generar un subdominio válido.' }, { status: 400 });

  const client = getAdminInsforge();
  let slug = baseSlug;
  let suffix = 0;
  let unique = false;

  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: existing } = await client.database.from('tenants').select('id').eq('slug', slug).limit(1);
    if (!existing || existing.length === 0) {
      unique = true;
      break;
    }
    suffix += 1;
    slug = `${baseSlug.slice(0, Math.max(3, 39 - String(suffix).length))}-${suffix}`;
  }

  if (!unique) return NextResponse.json({ error: 'No se pudo generar un subdominio disponible.' }, { status: 409 });

  try {
    const now = new Date().toISOString();
    const { data, error } = await client.database
      .from('tenants')
      .insert([{
        slug,
        name,
        plan_id: planId,
        status: 'trial',
        primary_color: primaryColor,
        logo_url: logoUrl,
        owner_email: ownerEmail,
        owner_name: ownerName,
        owner_phone: ownerPhone || null,
        phone: ownerPhone || null,
        contact_email: contactEmail,
        billing_email: billingEmail,
        custom_domain: customDomain,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
      }])
      .select(TENANT_SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_POST_FAILED', 500, request);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRoot(request);
  if (!auth.ok) return auth.response;

  const schemaResponse = await schemaOrResponse();
  if (schemaResponse) return schemaResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const id = cleanText(body.id, 80);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.has(body.status)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    updates.status = body.status;
  }
  if (typeof body.plan_id === 'string') {
    if (!VALID_PLANS.has(body.plan_id)) return NextResponse.json({ error: 'Plan inválido.' }, { status: 400 });
    updates.plan_id = body.plan_id;
  }
  if (typeof body.name === 'string') {
    const value = cleanText(body.name, 100);
    if (!value) return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 });
    updates.name = value;
  }
  if (typeof body.owner_name === 'string') updates.owner_name = cleanText(body.owner_name, 100) || null;
  if (typeof body.owner_phone === 'string') {
    const phone = cleanText(body.owner_phone, 30) || null;
    updates.owner_phone = phone;
    updates.phone = phone;
  }
  if (body.contact_email !== undefined) {
    const value = cleanEmail(body.contact_email);
    if (!validEmail(value)) return NextResponse.json({ error: 'Correo de contacto inválido.' }, { status: 400 });
    updates.contact_email = value || null;
  }
  if (body.billing_email !== undefined) {
    const value = cleanEmail(body.billing_email);
    if (!validEmail(value)) return NextResponse.json({ error: 'Correo de facturación inválido.' }, { status: 400 });
    updates.billing_email = value || null;
  }
  if (body.logo_url !== undefined) {
    const logoUrl = normalizeLogoUrl(body.logo_url);
    if (body.logo_url && !logoUrl) return NextResponse.json({ error: 'URL de logo inválida.' }, { status: 400 });
    updates.logo_url = logoUrl;
  }
  if (body.primary_color !== undefined) updates.primary_color = normalizeColor(body.primary_color);
  if (body.custom_domain !== undefined) {
    const customDomain = normalizeDomain(body.custom_domain);
    if (body.custom_domain && !customDomain) return NextResponse.json({ error: 'Dominio propio inválido.' }, { status: 400 });
    updates.custom_domain = customDomain;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 });

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(TENANT_SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateTenantCache(id, data?.slug);
    return NextResponse.json(data);
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_PATCH_FAILED', 500, request);
  }
}
