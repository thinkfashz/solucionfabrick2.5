-- Reparación idempotente del esquema SaaS de Fabrick.
-- Puede ejecutarse más de una vez sin eliminar datos.

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
