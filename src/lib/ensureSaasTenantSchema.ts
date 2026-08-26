import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';

const REQUIRED_SELECT = [
  'id',
  'slug',
  'name',
  'owner_email',
  'owner_name',
  'owner_phone',
  'phone',
  'contact_email',
  'billing_email',
  'plan_id',
  'status',
  'trial_ends_at',
  'custom_domain',
  'logo_url',
  'primary_color',
  'created_at',
  'updated_at',
].join(', ');

const REPAIR_SQL = `
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#F5871F';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.tenants
SET
  owner_phone = COALESCE(owner_phone, phone),
  phone = COALESCE(phone, owner_phone),
  contact_email = COALESCE(contact_email, owner_email),
  billing_email = COALESCE(billing_email, owner_email),
  primary_color = COALESCE(NULLIF(primary_color, ''), '#F5871F'),
  updated_at = COALESCE(updated_at, now());
`;

export type SaasTenantSchemaStatus = {
  ok: boolean;
  repaired?: boolean;
  detail: string;
};

let lastRepairAt = 0;
let repairPromise: Promise<SaasTenantSchemaStatus> | null = null;

function insforgeBaseUrl() {
  return (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app').replace(/\/+$/, '');
}

export async function inspectSaasTenantSchema(): Promise<SaasTenantSchemaStatus> {
  try {
    const { error } = await insforgeAdmin.database.from('tenants').select(REQUIRED_SELECT).limit(1);
    if (error) return { ok: false, detail: error.message || 'El esquema tenants no está actualizado.' };
    return { ok: true, detail: 'Esquema tenants completo y compatible con branding SaaS.' };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'No se pudo verificar la tabla tenants.' };
  }
}

async function runRepair(): Promise<SaasTenantSchemaStatus> {
  const apiKey = process.env.INSFORGE_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, detail: 'INSFORGE_API_KEY no está configurada; no se puede reparar el esquema automáticamente.' };
  }

  try {
    const response = await fetch(`${insforgeBaseUrl()}/api/database/advance/rawsql/unrestricted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ query: REPAIR_SQL }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, detail: body.slice(0, 500) || `InsForge respondió ${response.status}.` };
    }

    const verified = await inspectSaasTenantSchema();
    if (!verified.ok) return verified;
    lastRepairAt = Date.now();
    return { ok: true, repaired: true, detail: 'Esquema SaaS reparado y verificado correctamente.' };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'No se pudo ejecutar la reparación SaaS.' };
  }
}

export async function ensureSaasTenantSchema(options: { force?: boolean } = {}): Promise<SaasTenantSchemaStatus> {
  const current = await inspectSaasTenantSchema();
  if (current.ok && !options.force) return current;

  if (!options.force && Date.now() - lastRepairAt < 60_000) return current;
  if (!repairPromise) {
    repairPromise = runRepair().finally(() => {
      repairPromise = null;
    });
  }
  return repairPromise;
}

export { REQUIRED_SELECT as SAAS_TENANT_REQUIRED_SELECT, REPAIR_SQL as SAAS_TENANT_REPAIR_SQL };
