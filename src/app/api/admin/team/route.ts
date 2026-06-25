import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforge, insforgeAdmin } from '@/lib/insforge';
import { getClientIp } from '@/lib/adminAuth';
import { assertPepperConfigured, hashAdminPassword } from '@/lib/adminPasswordHash';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import { requireTenantAdmin, withTenant } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';

type Role = 'superadmin' | 'admin' | 'viewer';
type AdminRow = {
  email: string;
  nombre?: string | null;
  rol: Role;
  aprobado: boolean;
  created_at?: string;
  updated_at?: string;
  tenant_id?: string | null;
};

type AuditRow = {
  email?: string | null;
  ip?: string | null;
  outcome?: string | null;
  ts?: string | null;
  user_agent?: string | null;
};

function isMissingTable(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isRole(value: unknown): value is Role {
  return value === 'superadmin' || value === 'admin' || value === 'viewer';
}

function generateTemporaryPassword(): string {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return `Sf-${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12, 18)}!9`;
}

function enrichWithAudit(rows: AdminRow[], audit: AuditRow[]) {
  const latestByEmail = new Map<string, AuditRow>();
  for (const item of audit) {
    const email = item.email?.toLowerCase();
    if (!email || latestByEmail.has(email)) continue;
    latestByEmail.set(email, item);
  }
  return rows.map((row) => {
    const latest = latestByEmail.get(row.email.toLowerCase());
    return {
      ...row,
      last_ip: latest?.ip ?? null,
      last_outcome: latest?.outcome ?? null,
      last_seen_at: latest?.ts ?? null,
      last_user_agent: latest?.user_agent ?? null,
    };
  });
}

async function readTenantAuditRows(memberEmails: string[]): Promise<AuditRow[]> {
  if (!memberEmails.length) return [];
  const auditResult = await insforgeAdmin.database
    .from('admin_login_audit')
    .select('email, ip, outcome, ts, user_agent')
    .order('ts', { ascending: false })
    .limit(300);

  if (auditResult.error) return [];
  const allowed = new Set(memberEmails.map((email) => email.toLowerCase()));
  return ((auditResult.data ?? []) as AuditRow[]).filter((row) => row.email && allowed.has(row.email.toLowerCase()));
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'team', action: 'read' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { data, error } = await insforgeAdmin.database
    .from('admin_users')
    .select('email, nombre, rol, aprobado, created_at, updated_at, tenant_id')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    await recordAdminFailure({ session: ctx.session, request, action: 'read', resource: 'team', metadata: { error: error.message, tenantId: ctx.tenantId } });
    if (isMissingTable(error)) return NextResponse.json({ members: [], pending: [], audit: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AdminRow[];
  const auditRows = await readTenantAuditRows(rows.map((row) => row.email));
  const all = enrichWithAudit(rows, auditRows);

  return NextResponse.json({
    members: all.filter((m) => m.aprobado === true),
    pending: all.filter((m) => m.aprobado === false),
    audit: auditRows.slice(0, 20),
    tenantId: ctx.tenantId,
    requestIp: getClientIp(request),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'team', action: 'create' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let email = '';
  let nombre = '';
  let rol: Role = 'admin';
  let password = '';
  try {
    const body = await request.json();
    email = normalizeEmail(body.email);
    nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    rol = isRole(body.rol) ? body.rol : 'admin';
    password = typeof body.password === 'string' && body.password.trim().length >= 12
      ? body.password.trim()
      : generateTemporaryPassword();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email válido requerido.' }, { status: 400 });
  if (!nombre) nombre = email.split('@')[0];

  assertPepperConfigured();
  const passwordHash = await hashAdminPassword(password);

  const signUp = await insforge.auth.signUp({ email, password, name: nombre });
  if (signUp.error) {
    await recordAdminFailure({ session: ctx.session, request, action: 'create', resource: 'team', resourceId: email, metadata: { phase: 'auth_signup', error: signUp.error.message, rol, tenantId: ctx.tenantId } });
    return NextResponse.json({ error: `No se pudo crear la cuenta de autenticación: ${signUp.error.message}` }, { status: 400 });
  }

  const signIn = await insforge.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    await recordAdminFailure({ session: ctx.session, request, action: 'create', resource: 'team', resourceId: email, metadata: { phase: 'auth_verify', error: signIn.error.message, rol, tenantId: ctx.tenantId } });
    return NextResponse.json({ error: `La cuenta se creó pero no pudo verificarse: ${signIn.error.message}` }, { status: 400 });
  }

  const row = withTenant(ctx, {
    email,
    nombre,
    rol,
    aprobado: true,
    password_hash: passwordHash,
    created_by: ctx.session.email ?? null,
  });

  const upsert = await insforgeAdmin.database
    .from('admin_users')
    .upsert([row], { onConflict: 'email,tenant_id' });

  if (upsert.error) {
    await recordAdminFailure({ session: ctx.session, request, action: 'create', resource: 'team', resourceId: email, metadata: { phase: 'admin_users_upsert', error: upsert.error.message, rol, tenantId: ctx.tenantId } });
    if (isMissingTable(upsert.error)) return NextResponse.json({ error: 'La tabla admin_users no existe o falta tenant_id.' }, { status: 500 });
    return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  }

  await recordAdminAudit({ session: ctx.session, request, action: 'create', resource: 'team', resourceId: email, metadata: { rol, nombre, tenantId: ctx.tenantId } });
  return NextResponse.json({ ok: true, user: { email, nombre, rol, tenant_id: ctx.tenantId }, temporaryPassword: password });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'team', action: 'update' });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  let email: string;
  let action: string;
  let rol: string | undefined;
  try {
    const body = await request.json();
    email = normalizeEmail(body.email);
    action = body.action ?? '';
    rol = body.rol;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !['approve', 'reject', 'set_role'].includes(action)) {
    return NextResponse.json({ error: 'Email y acción válida son requeridos.' }, { status: 400 });
  }

  if (email === ctx.session.email && action !== 'approve') {
    return NextResponse.json({ error: 'No puedes modificar tu propia cuenta.' }, { status: 400 });
  }

  if (action === 'approve') {
    const { error } = await insforgeAdmin.database
      .from('admin_users')
      .update({ aprobado: true })
      .eq('email', email)
      .eq('tenant_id', ctx.tenantId);
    if (error) {
      await recordAdminFailure({ session: ctx.session, request, action: 'update', resource: 'team', resourceId: email, metadata: { teamAction: action, error: error.message, tenantId: ctx.tenantId } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await recordAdminAudit({ session: ctx.session, request, action: 'update', resource: 'team', resourceId: email, metadata: { teamAction: action, tenantId: ctx.tenantId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const { error } = await insforgeAdmin.database
      .from('admin_users')
      .delete()
      .eq('email', email)
      .eq('tenant_id', ctx.tenantId);
    if (error) {
      await recordAdminFailure({ session: ctx.session, request, action: 'delete', resource: 'team', resourceId: email, metadata: { teamAction: action, error: error.message, tenantId: ctx.tenantId } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await recordAdminAudit({ session: ctx.session, request, action: 'delete', resource: 'team', resourceId: email, metadata: { teamAction: action, tenantId: ctx.tenantId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'set_role') {
    if (!rol || !isRole(rol)) return NextResponse.json({ error: 'Rol válido requerido.' }, { status: 400 });
    const { error } = await insforgeAdmin.database
      .from('admin_users')
      .update({ rol })
      .eq('email', email)
      .eq('tenant_id', ctx.tenantId);
    if (error) {
      await recordAdminFailure({ session: ctx.session, request, action: 'update', resource: 'team', resourceId: email, metadata: { teamAction: action, rol, error: error.message, tenantId: ctx.tenantId } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await recordAdminAudit({ session: ctx.session, request, action: 'update', resource: 'team', resourceId: email, metadata: { teamAction: action, rol, tenantId: ctx.tenantId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}
