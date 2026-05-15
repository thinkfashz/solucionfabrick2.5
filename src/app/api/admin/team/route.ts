import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforge, insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession, getClientIp } from '@/lib/adminAuth';
import { assertPepperConfigured, hashAdminPassword } from '@/lib/adminPasswordHash';

export const dynamic = 'force-dynamic';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

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

async function requireSuperadmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  if (payload.rol === 'viewer') return { error: NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 }) };
  if (payload.rol !== 'superadmin') return { error: NextResponse.json({ error: 'Solo superadmin puede modificar el equipo.' }, { status: 403 }) };
  return { payload };
}

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

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol === 'viewer') {
    return NextResponse.json({ error: 'Modo demo: equipo y usuarios es una zona crítica.' }, { status: 403 });
  }
  if (payload.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede ver el equipo.' }, { status: 403 });
  }

  const { data, error } = await insforgeAdmin.database
    .from('admin_users')
    .select('email, nombre, rol, aprobado, created_at, updated_at, tenant_id')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ members: [], pending: [], audit: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let auditRows: AuditRow[] = [];
  const auditResult = await insforgeAdmin.database
    .from('admin_login_audit')
    .select('email, ip, outcome, ts, user_agent')
    .order('ts', { ascending: false })
    .limit(200);
  if (!auditResult.error) auditRows = (auditResult.data ?? []) as AuditRow[];

  const all = enrichWithAudit((data ?? []) as AdminRow[], auditRows);
  return NextResponse.json({
    members: all.filter((m) => m.aprobado === true),
    pending: all.filter((m) => m.aprobado === false),
    audit: auditRows.slice(0, 20),
    requestIp: getClientIp(request),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin(request);
  if (auth.error) return auth.error;
  const payload = auth.payload;

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
    return NextResponse.json({ error: `No se pudo crear la cuenta de autenticación: ${signUp.error.message}` }, { status: 400 });
  }

  const signIn = await insforge.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    return NextResponse.json({ error: `La cuenta se creó pero no pudo verificarse: ${signIn.error.message}` }, { status: 400 });
  }

  const tenantId = payload?.tenant_id ?? DEFAULT_TENANT_ID;
  const row = {
    email,
    nombre,
    rol,
    aprobado: true,
    password_hash: passwordHash,
    tenant_id: tenantId,
    created_by: payload?.email ?? null,
  };

  let upsert = await insforgeAdmin.database
    .from('admin_users')
    .upsert([row], { onConflict: 'email,tenant_id' });

  if (upsert.error && isMissingTable(upsert.error)) {
    return NextResponse.json({ error: 'La tabla admin_users no existe o falta la columna tenant_id.' }, { status: 500 });
  }

  if (upsert.error) {
    const legacyRow = { email, nombre, rol, aprobado: true, password_hash: passwordHash };
    upsert = await insforgeAdmin.database
      .from('admin_users')
      .upsert([legacyRow], { onConflict: 'email' });
  }

  if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, user: { email, nombre, rol }, temporaryPassword: password });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperadmin(request);
  if (auth.error) return auth.error;
  const payload = auth.payload;

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

  if (email === payload?.email && action !== 'approve') {
    return NextResponse.json({ error: 'No puedes modificar tu propia cuenta.' }, { status: 400 });
  }

  if (action === 'approve') {
    const { error } = await insforgeAdmin.database
      .from('admin_users').update({ aprobado: true }).eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const { error } = await insforgeAdmin.database
      .from('admin_users').delete().eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'set_role') {
    if (!rol || !isRole(rol)) return NextResponse.json({ error: 'Rol válido requerido.' }, { status: 400 });
    const { error } = await insforgeAdmin.database
      .from('admin_users').update({ rol }).eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}
