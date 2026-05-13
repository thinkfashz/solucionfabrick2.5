/**
 * Tenant provisioning: called once when a tenant's subscription is activated.
 *
 * Creates:
 *   1. The InsForge auth user for the tenant owner
 *   2. An admin_users row scoped to the tenant
 *   3. Default configuracion rows (nombre_empresa, etc.)
 *
 * Returns { ok, temp_password } so the webhook can send it by email.
 * Idempotent: re-running for the same tenant_id is a no-op (checks existence).
 */

import { randomBytes } from 'node:crypto';
import { insforge } from '@/lib/insforge';

export interface ProvisionResult {
  ok: boolean;
  already_existed: boolean;
  temp_password?: string;
  admin_user_id?: string;
  error?: string;
}

function generateTempPassword(): string {
  // 12-char alphanumeric — easy to copy-paste, strong enough for a temp cred
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export async function provisionTenant(tenantId: string): Promise<ProvisionResult> {
  // Fetch tenant info
  const { data: tenantRows, error: tenantErr } = await insforge.database
    .from('tenants')
    .select('id, slug, name, owner_email, owner_name')
    .eq('id', tenantId)
    .limit(1);

  if (tenantErr || !tenantRows || tenantRows.length === 0) {
    return { ok: false, already_existed: false, error: 'Tenant no encontrado.' };
  }

  const tenant = tenantRows[0] as {
    id: string; slug: string; name: string;
    owner_email: string; owner_name: string | null;
  };

  // Idempotency: check if admin_users row already exists for this tenant+email
  const { data: existingAdmins } = await insforge.database
    .from('admin_users')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', tenant.owner_email)
    .limit(1);

  if (existingAdmins && existingAdmins.length > 0) {
    return { ok: true, already_existed: true };
  }

  const tempPassword = generateTempPassword();

  // Create InsForge auth user (will receive email confirmation)
  let authUserId: string | null = null;
  try {
    const { data: authData } = await insforge.auth.signUp({
      email: tenant.owner_email,
      password: tempPassword,
    });
    authUserId = authData?.user?.id ?? null;
  } catch {
    // InsForge user may already exist from a previous attempt — non-fatal
  }

  // Create admin_users row scoped to this tenant
  const { data: adminInserted, error: adminErr } = await insforge.database
    .from('admin_users')
    .insert([{
      email: tenant.owner_email,
      rol: 'superadmin',
      aprobado: true,
      tenant_id: tenantId,
      // password_hash left null — operator sets it with admin:set-password
    }])
    .select('id')
    .limit(1);

  if (adminErr) {
    return { ok: false, already_existed: false, error: `Error creando admin_user: ${adminErr.message}` };
  }

  const adminUserId = (adminInserted?.[0] as { id: string } | undefined)?.id ?? authUserId ?? '';

  // Seed default configuracion rows for this tenant
  const defaultSettings = [
    { clave: 'nombre_empresa', valor: tenant.name },
    { clave: 'slogan', valor: 'Tu negocio, en línea.' },
    { clave: 'email_contacto', valor: tenant.owner_email },
    { clave: 'copyright_text', valor: `© ${new Date().getFullYear()} ${tenant.name}` },
  ];

  // configuracion uses (clave, tenant_id) as composite key — insert if not existing
  for (const s of defaultSettings) {
    await insforge.database
      .from('configuracion')
      .upsert([{ ...s, tenant_id: tenantId }], { onConflict: 'clave,tenant_id', ignoreDuplicates: true })
      .then(() => void 0, () => void 0); // best-effort
  }

  return {
    ok: true,
    already_existed: false,
    temp_password: tempPassword,
    admin_user_id: adminUserId,
  };
}
