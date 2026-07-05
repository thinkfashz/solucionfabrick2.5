-- TABLA: leads-order-link
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS order_id text;
CREATE INDEX IF NOT EXISTS leads_order_id_idx ON public.leads (order_id) WHERE order_id IS NOT NULL;

-- TABLA: crm_leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id SERIAL PRIMARY KEY,
  order_id text,
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
CREATE INDEX IF NOT EXISTS crm_leads_order_id_idx ON public.crm_leads (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON public.crm_leads (stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_leads_email_idx ON public.crm_leads (lower(email)) WHERE email IS NOT NULL;

-- TABLA: customer_accounts
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  last_order_id text,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS last_order_id text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_email_idx ON public.customer_accounts (lower(email));
CREATE INDEX IF NOT EXISTS customer_accounts_order_idx ON public.customer_accounts (order_id) WHERE order_id IS NOT NULL;
