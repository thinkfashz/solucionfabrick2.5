import { NextRequest, NextResponse } from 'next/server';
import { adminError, getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { toSlug } from '@/lib/tenant-edge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PLANS = new Set(['starter', 'pro', 'enterprise', 'free']);
const VALID_STATUSES = new Set(['active', 'suspended', 'trial', 'cancelled']);

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) return null;
  if (domain.length > 253 || !/^[a-z0-9.-]+$/.test(domain) || !domain.includes('.')) return null;
  return domain;
}

async function requireRoot(request: NextRequest) {
  return requireAdminPermission(request, { resource: 'admin', action: 'manage' });
}

export async function GET(request: NextRequest) {
  const auth = await requireRoot(request);
  if (!auth.ok) return auth.response;

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .select('id, slug, name, plan_id, status, owner_email, owner_name, owner_phone, custom_domain, trial_ends_at, created_at')
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const ownerEmail = typeof body.owner_email === 'string' ? body.owner_email.trim().toLowerCase().slice(0, 255) : '';
  const ownerName = typeof body.owner_name === 'string' ? body.owner_name.trim().slice(0, 100) : '';
  const ownerPhone = typeof body.owner_phone === 'string' ? body.owner_phone.trim().slice(0, 30) : null;
  const customDomain = normalizeDomain(body.custom_domain);
  const planId = typeof body.plan_id === 'string' && VALID_PLANS.has(body.plan_id) ? body.plan_id : 'starter';

  if (!name) return NextResponse.json({ error: 'El nombre del negocio es obligatorio.' }, { status: 400 });
  if (!ownerEmail || !ownerEmail.includes('@')) return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
  if (!ownerName) return NextResponse.json({ error: 'El nombre del contacto es obligatorio.' }, { status: 400 });
  if (body.custom_domain && !customDomain) return NextResponse.json({ error: 'Dominio propio inválido.' }, { status: 400 });

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
    const { data, error } = await client.database
      .from('tenants')
      .insert([{
        slug,
        name,
        plan_id: planId,
        status: 'active',
        primary_color: '#10b981',
        owner_email: ownerEmail,
        owner_name: ownerName,
        owner_phone: ownerPhone || null,
        custom_domain: customDomain,
      }])
      .select('id, slug, name, plan_id, status, owner_email, owner_name, owner_phone, custom_domain, trial_ends_at, created_at')
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
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
  if (typeof body.owner_name === 'string') updates.owner_name = body.owner_name.trim().slice(0, 100);
  if (typeof body.owner_phone === 'string') updates.owner_phone = body.owner_phone.trim().slice(0, 30) || null;
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
      .select('id, slug, name, plan_id, status, owner_email, owner_name, owner_phone, custom_domain, trial_ends_at, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_PATCH_FAILED', 500, request);
  }
}
