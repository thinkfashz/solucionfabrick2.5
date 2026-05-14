/**
 * GET  /api/platform/tenants          — list all tenants
 * POST /api/platform/tenants          — provision a new tenant manually
 * PATCH /api/platform/tenants?id=...  — update tenant (plan, status, etc.)
 *
 * All endpoints require Authorization: Bearer $PLATFORM_ADMIN_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { isPlatformAdmin, invalidateTenantCache, toSlug, RESERVED_SLUGS } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  if (!isPlatformAdmin(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  let query = insforge.database
    .from('platform_tenant_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenants: data ?? [], total: (data ?? []).length });
}

export async function POST(request: NextRequest) {
  if (!isPlatformAdmin(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json() as {
    business_name: string;
    owner_email: string;
    plan_id?: string;
    slug?: string;
    status?: string;
  };

  if (!body.business_name || !body.owner_email) {
    return NextResponse.json({ error: 'business_name y owner_email son requeridos.' }, { status: 400 });
  }

  const rawSlug = body.slug?.trim().toLowerCase() || toSlug(body.business_name);

  if (RESERVED_SLUGS.has(rawSlug) || !/^[a-z0-9-]{3,40}$/.test(rawSlug)) {
    return NextResponse.json({ error: `Slug inválido o reservado: ${rawSlug}` }, { status: 400 });
  }

  const { data: existing } = await insforge.database
    .from('tenants').select('id').eq('slug', rawSlug).limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `El slug "${rawSlug}" ya está en uso.` }, { status: 409 });
  }

  const { data, error } = await insforge.database
    .from('tenants')
    .insert([{
      slug: rawSlug,
      name: body.business_name,
      owner_email: body.owner_email,
      plan_id: body.plan_id ?? 'starter',
      status: body.status ?? 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }])
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenant: data?.[0] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isPlatformAdmin(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Se requiere ?id=' }, { status: 400 });

  const body = await request.json() as Record<string, unknown>;

  // Whitelist updatable fields
  const allowed: (keyof typeof body)[] = [
    'name', 'plan_id', 'status', 'custom_domain', 'logo_url',
    'primary_color', 'billing_email', 'mp_access_token', 'mp_public_key',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await insforge.database
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select('id, slug')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = data?.[0] as { id: string; slug: string } | undefined;
  if (row) invalidateTenantCache(row.id, row.slug);

  return NextResponse.json({ ok: true, tenant: row });
}
