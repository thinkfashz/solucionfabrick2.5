CREATE TABLE IF NOT EXISTS public.admin_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id),
  credential_id text NOT NULL UNIQUE,
  public_key_cose text NOT NULL,
  sign_count integer NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_passkeys_email_tenant_idx
  ON public.admin_passkeys(email, tenant_id);

CREATE TABLE IF NOT EXISTS public.admin_passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('registration','authentication')),
  email text,
  tenant_id uuid,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_passkey_challenges_lookup_idx
  ON public.admin_passkey_challenges(challenge, purpose, email, tenant_id);

CREATE INDEX IF NOT EXISTS admin_passkey_challenges_expiry_idx
  ON public.admin_passkey_challenges(expires_at);
