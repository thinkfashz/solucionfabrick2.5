import { insforgeAdmin } from '@/lib/insforge';

export type PasskeyChallengePurpose = 'registration' | 'authentication';

export type PasskeyChallengeRow = {
  id: string;
  challenge: string;
  purpose: PasskeyChallengePurpose;
  email: string | null;
  tenant_id: string | null;
  expires_at: string;
  consumed_at?: string | null;
};

export type AdminPasskeyRow = {
  id: string;
  email: string;
  tenant_id: string;
  credential_id: string;
  public_key_cose: string;
  sign_count: number;
  device_name?: string | null;
  created_at?: string;
  last_used_at?: string | null;
};

export async function createPasskeyChallenge(input: {
  challenge: string;
  purpose: PasskeyChallengePurpose;
  email?: string | null;
  tenantId?: string | null;
  ttlSeconds: number;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
  const { error } = await insforgeAdmin.database.from('admin_passkey_challenges').insert([
    {
      challenge: input.challenge,
      purpose: input.purpose,
      email: input.email ?? null,
      tenant_id: input.tenantId ?? null,
      expires_at: expiresAt,
    },
  ]);
  if (error) throw new Error(error.message ?? 'No se pudo guardar el challenge passkey.');
}

export async function consumePasskeyChallenge(input: {
  challenge: string;
  purpose: PasskeyChallengePurpose;
  email?: string | null;
  tenantId?: string | null;
}): Promise<PasskeyChallengeRow> {
  let query = insforgeAdmin.database
    .from('admin_passkey_challenges')
    .select('id, challenge, purpose, email, tenant_id, expires_at, consumed_at')
    .eq('challenge', input.challenge)
    .eq('purpose', input.purpose)
    .limit(1);

  if (input.email) query = query.eq('email', input.email);
  if (input.tenantId) query = query.eq('tenant_id', input.tenantId);

  const { data, error } = await query;
  if (error) throw new Error(error.message ?? 'No se pudo leer el challenge passkey.');
  const row = data?.[0] as PasskeyChallengeRow | undefined;
  if (!row) throw new Error('Challenge passkey no encontrado.');
  if (row.consumed_at) throw new Error('Challenge passkey ya fue usado.');
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error('Challenge passkey expirado.');

  const { error: updateError } = await insforgeAdmin.database
    .from('admin_passkey_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updateError) throw new Error(updateError.message ?? 'No se pudo consumir el challenge passkey.');

  return row;
}

export async function saveAdminPasskey(input: {
  email: string;
  tenantId: string;
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
  deviceName?: string | null;
}): Promise<void> {
  const { error } = await insforgeAdmin.database.from('admin_passkeys').upsert(
    [{
      email: input.email,
      tenant_id: input.tenantId,
      credential_id: input.credentialId,
      public_key_cose: input.publicKeyCose,
      sign_count: input.signCount,
      device_name: input.deviceName ?? null,
    }],
    { onConflict: 'credential_id' },
  );
  if (error) throw new Error(error.message ?? 'No se pudo guardar la passkey.');
}

export async function findAdminPasskeyByCredentialId(credentialId: string): Promise<AdminPasskeyRow | null> {
  const { data, error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .select('id, email, tenant_id, credential_id, public_key_cose, sign_count, device_name, created_at, last_used_at')
    .eq('credential_id', credentialId)
    .limit(1);
  if (error) throw new Error(error.message ?? 'No se pudo leer la passkey.');
  return (data?.[0] as AdminPasskeyRow | undefined) ?? null;
}

export async function listCredentialIdsForEmail(email: string, tenantId: string): Promise<string[]> {
  const { data, error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .select('credential_id')
    .eq('email', email)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message ?? 'No se pudieron listar passkeys.');
  return (data ?? []).map((row: { credential_id?: string }) => row.credential_id).filter(Boolean) as string[];
}

export async function updatePasskeyUsage(input: {
  credentialId: string;
  signCount: number;
}): Promise<void> {
  const { error } = await insforgeAdmin.database
    .from('admin_passkeys')
    .update({ sign_count: input.signCount, last_used_at: new Date().toISOString() })
    .eq('credential_id', input.credentialId);
  if (error) throw new Error(error.message ?? 'No se pudo actualizar la passkey.');
}
