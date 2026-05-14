-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: Multi-tenancy — Fabrick Platform SaaS
--
-- Ejecutar UNA SOLA VEZ sobre la base de datos de producción.
-- El tenant con id DEFAULT_TENANT_ID representa la instalación original
-- (Soluciones Fabrick Linares) y se crea automáticamente para no romper
-- datos existentes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PLANES DE SUSCRIPCIÓN ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id          text PRIMARY KEY,           -- 'starter' | 'pro' | 'enterprise'
  name        text NOT NULL,
  description text,
  price_clp   integer NOT NULL,           -- precio mensual en CLP
  price_usd   numeric(8,2),               -- referencia, no se cobra en USD
  mp_plan_id  text,                       -- ID del plan en MercadoPago (/preapproval_plan)
  limits      jsonb NOT NULL DEFAULT '{}',-- { max_products, max_orders_month, features[] }
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_plans (id, name, description, price_clp, price_usd, limits) VALUES
  ('starter',    'Starter',    'Ideal para negocios que empiezan a vender online.',
   29990,  33,
   '{"max_products":100,"max_orders_month":50,"features":["tienda","pedidos","cotizaciones","pagos_mp"]}'::jsonb),
  ('pro',        'Pro',        'Todo lo que necesita un negocio en crecimiento.',
   59990,  66,
   '{"max_products":500,"max_orders_month":null,"features":["tienda","pedidos","cotizaciones","pagos_mp","meta_ads","dte","envios","loyalty","blog"]}'::jsonb),
  ('enterprise', 'Enterprise', 'Plataforma completa con soporte prioritario.',
   149990, 165,
   '{"max_products":null,"max_orders_month":null,"features":["all","api_access","soporte_prioritario","onboarding_dedicado"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── 2. TENANTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,           -- subdominio: slug.fabrick.cl
  name             text NOT NULL,                  -- nombre del negocio
  owner_email      text NOT NULL,
  owner_name       text,
  phone            text,
  plan_id          text NOT NULL DEFAULT 'starter' REFERENCES public.platform_plans(id),
  status           text NOT NULL DEFAULT 'trial'   -- trial | active | suspended | cancelled
    CHECK (status IN ('trial','active','suspended','cancelled')),
  trial_ends_at    timestamptz,
  custom_domain    text UNIQUE,
  logo_url         text,
  primary_color    text DEFAULT '#10b981',
  mp_access_token  text,                           -- credenciales MP del tenant
  mp_public_key    text,
  billing_email    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Tenant por defecto — la instalación original de Fabrick Linares.
-- UUID fijo para que los datos existentes lo referencien sin migrar filas.
INSERT INTO public.tenants (id, slug, name, owner_email, plan_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'fabrick', 'Soluciones Fabrick', 'admin@fabrick.cl', 'pro', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 3. SUSCRIPCIONES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id             text NOT NULL REFERENCES public.platform_plans(id),
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','paused','cancelled','error')),
  mp_preapproval_id   text UNIQUE,         -- ID de la suscripción en MP (/preapproval)
  mp_plan_id          text,
  amount_clp          integer NOT NULL,
  next_payment_date   timestamptz,
  last_payment_date   timestamptz,
  last_payment_status text,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_subscriptions_tenant_idx ON public.platform_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS platform_subscriptions_status_idx ON public.platform_subscriptions(status);

-- ── 4. LOG DE PAGOS DE SUSCRIPCIONES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_payment_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.platform_subscriptions(id),
  tenant_id       uuid REFERENCES public.tenants(id),
  mp_payment_id   text,
  amount_clp      integer,
  status          text,
  event_type      text,
  raw             jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. AÑADIR tenant_id A TABLAS EXISTENTES ──────────────────────────────────
-- Usamos DEFAULT para no romper filas existentes: todas quedan asignadas
-- automáticamente al tenant original (Fabrick Linares).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

-- Índices de rendimiento para las consultas filtradas por tenant
CREATE INDEX IF NOT EXISTS products_tenant_idx      ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS orders_tenant_idx        ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS admin_users_tenant_idx   ON public.admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_tenant_idx      ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS quotes_tenant_idx        ON public.quotes(tenant_id);
CREATE INDEX IF NOT EXISTS shipments_tenant_idx     ON public.shipments(tenant_id);
CREATE INDEX IF NOT EXISTS blog_posts_tenant_idx    ON public.blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS media_assets_tenant_idx  ON public.media_assets(tenant_id);
CREATE INDEX IF NOT EXISTS banners_tenant_idx       ON public.banners(tenant_id);

-- ── 5b. CONSTRAINT UNIQUE (clave, tenant_id) EN configuracion ────────────────
-- El upsert de settings usa onConflict:'clave,tenant_id'. Sin este constraint
-- el upsert falla en runtime con "there is no unique or exclusion constraint".
ALTER TABLE public.configuracion
  DROP CONSTRAINT IF EXISTS configuracion_clave_key;

ALTER TABLE public.configuracion
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
    REFERENCES public.tenants(id);

ALTER TABLE public.configuracion
  ADD CONSTRAINT IF NOT EXISTS configuracion_clave_tenant_unique
  UNIQUE (clave, tenant_id);

CREATE INDEX IF NOT EXISTS configuracion_tenant_idx ON public.configuracion(tenant_id);

-- ── 6. VISTA: MRR EN TIEMPO REAL ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.platform_mrr AS
SELECT
  pp.id                                     AS plan_id,
  pp.name                                   AS plan_name,
  pp.price_clp,
  COUNT(ps.id)                              AS active_subscriptions,
  COUNT(ps.id) * pp.price_clp               AS mrr_clp,
  ROUND(COUNT(ps.id) * pp.price_clp / 1000.0, 2) AS mrr_usd_approx
FROM public.platform_plans pp
LEFT JOIN public.platform_subscriptions ps
  ON ps.plan_id = pp.id AND ps.status = 'authorized'
GROUP BY pp.id, pp.name, pp.price_clp
ORDER BY pp.price_clp;

-- ── 7. VISTA: RESUMEN POR TENANT ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.platform_tenant_summary AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.owner_email,
  t.plan_id,
  t.status,
  t.created_at,
  pp.price_clp,
  ps.status           AS subscription_status,
  ps.mp_preapproval_id,
  ps.next_payment_date,
  (SELECT COUNT(*) FROM public.orders o WHERE o.tenant_id = t.id)   AS total_orders,
  (SELECT COUNT(*) FROM public.products p WHERE p.tenant_id = t.id) AS total_products
FROM public.tenants t
LEFT JOIN public.platform_plans pp ON pp.id = t.plan_id
LEFT JOIN public.platform_subscriptions ps
  ON ps.tenant_id = t.id AND ps.status = 'authorized'
ORDER BY t.created_at DESC;

-- ── Billing: prevent duplicate DTE for the same order ────────────────────────
-- Closes the non-atomic SELECT→emit→INSERT race between payments/mercadopago
-- and payments/webhook firing fire-and-forget for the same order_id.
-- Error code 23505 (unique_violation) is caught in autoEmit.ts and handled
-- by returning the first winner's record instead of failing.
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_order_id_dte_type_key;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_order_id_dte_type_key
  UNIQUE (order_id, dte_type);
