import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, adminUnauthorized, adminError, getAdminInsforge } from '@/lib/adminApi';
import { toSlug } from '@/lib/tenant-edge';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .select('id, slug, name, plan_id, status, owner_email, owner_name, owner_phone, trial_ends_at, created_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_GET_FAILED', 500, request);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

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

  if (!name) return NextResponse.json({ error: 'El nombre del negocio es obligatorio.' }, { status: 400 });
  if (!ownerEmail || !ownerEmail.includes('@')) return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
  if (!ownerName) return NextResponse.json({ error: 'El nombre del contacto es obligatorio.' }, { status: 400 });

  const VALID_PLANS = new Set(['starter', 'pro', 'enterprise', 'free']);
  const planId = typeof body.plan_id === 'string' && VALID_PLANS.has(body.plan_id) ? body.plan_id : 'starter';

  const baseSlug = toSlug(name);
  const client = getAdminInsforge();

  // Find a unique slug (cap at 20 attempts to prevent an infinite loop)
  let slug = baseSlug;
  let suffix = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: existing } = await client.database
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    if (!existing || existing.length === 0) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

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
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_POST_FAILED', 500, request);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const allowed = ['status', 'plan_id', 'owner_phone', 'owner_name'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 });
  }

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return adminError(err, 'SAAS_TENANTS_PATCH_FAILED', 500, request);
  }
}
