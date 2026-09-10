-- Soluciones Fabrick · customer data + consent + CRM
-- Additive and idempotent. No customer rows are deleted or rewritten.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  marketing_email boolean NOT NULL DEFAULT false,
  marketing_whatsapp boolean NOT NULL DEFAULT false,
  terms_version text,
  privacy_version text,
  accepted_terms_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS first_name text DEFAULT '';
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS last_name text DEFAULT '';
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS marketing_email boolean DEFAULT false;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS marketing_whatsapp boolean DEFAULT false;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS privacy_version text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS customer_profiles_email_lower_idx ON public.customer_profiles (lower(email));
CREATE INDEX IF NOT EXISTS customer_profiles_updated_idx ON public.customer_profiles (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  user_id uuid PRIMARY KEY,
  label text NOT NULL DEFAULT 'Principal',
  address_line1 text NOT NULL DEFAULT '',
  commune text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  delivery_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS label text DEFAULT 'Principal';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS address_line1 text DEFAULT '';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS commune text DEFAULT '';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS region text DEFAULT '';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS delivery_notes text DEFAULT '';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_snapshot text NOT NULL DEFAULT '',
  consent_key text NOT NULL,
  granted boolean NOT NULL,
  terms_version text,
  privacy_version text,
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_consents_key_check CHECK (consent_key IN ('terms_privacy','marketing_email','marketing_whatsapp'))
);
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS email_snapshot text DEFAULT '';
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS privacy_version text;
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS user_consents_user_created_idx ON public.user_consents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_consents_key_created_idx ON public.user_consents (user_id, consent_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'Cuenta web',
  lifecycle_stage text NOT NULL DEFAULT 'Registrado',
  marketing_email boolean NOT NULL DEFAULT false,
  marketing_whatsapp boolean NOT NULL DEFAULT false,
  last_order_id text,
  last_order_at timestamptz,
  last_order_total bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS name text DEFAULT '';
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS source text DEFAULT 'Cuenta web';
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'Registrado';
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS marketing_email boolean DEFAULT false;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS marketing_whatsapp boolean DEFAULT false;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS last_order_id text;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS last_order_at timestamptz;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS last_order_total bigint DEFAULT 0;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS crm_customers_user_idx ON public.crm_customers (user_id);
CREATE INDEX IF NOT EXISTS crm_customers_email_lower_idx ON public.crm_customers (lower(email));
CREATE INDEX IF NOT EXISTS crm_customers_updated_idx ON public.crm_customers (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id bigserial PRIMARY KEY,
  order_id text,
  customer_user_id uuid,
  name text NOT NULL,
  contact text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  company text DEFAULT '',
  value bigint DEFAULT 0,
  stage text DEFAULT 'Contacto inicial',
  probability integer DEFAULT 20,
  notes text DEFAULT '',
  next_action text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS customer_user_id uuid;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS contact text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS company text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS value bigint DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Contacto inicial';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS probability integer DEFAULT 20;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS next_action text DEFAULT '';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_order_id_idx ON public.crm_leads (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON public.crm_leads (stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_leads_customer_user_idx ON public.crm_leads (customer_user_id) WHERE customer_user_id IS NOT NULL;

-- Customer PII tables are server-only. With RLS enabled and no anon policies,
-- the public client cannot enumerate profiles, addresses, consents or CRM rows.
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fabrick_schema_migrations (
  version text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.fabrick_schema_migrations(version, description)
VALUES ('20260910_customer_data_crm', 'Private customer profiles, addresses, consent ledger and CRM customers')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;
