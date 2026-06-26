-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: Endurecimiento multi-tenant para producción SaaS
--
-- Ejecutar después de scripts/add-multitenancy.sql.
-- Objetivo: asegurar constraints únicos e índices necesarios para evitar
-- colisiones entre empresas y permitir upserts por tenant.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Integraciones por empresa: provider + tenant_id
DO $$
BEGIN
  IF to_regclass('public.integrations') IS NOT NULL THEN
    ALTER TABLE public.integrations
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
        REFERENCES public.tenants(id);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'integrations_provider_tenant_unique'
        AND conrelid = 'public.integrations'::regclass
    ) THEN
      ALTER TABLE public.integrations
        ADD CONSTRAINT integrations_provider_tenant_unique UNIQUE (provider, tenant_id);
    END IF;

    CREATE INDEX IF NOT EXISTS integrations_tenant_idx ON public.integrations(tenant_id);
  END IF;
END $$;

-- 2) Usuarios admin por empresa: email + tenant_id
DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    ALTER TABLE public.admin_users
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
        REFERENCES public.tenants(id);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'admin_users_email_tenant_unique'
        AND conrelid = 'public.admin_users'::regclass
    ) THEN
      ALTER TABLE public.admin_users
        ADD CONSTRAINT admin_users_email_tenant_unique UNIQUE (email, tenant_id);
    END IF;

    CREATE INDEX IF NOT EXISTS admin_users_tenant_idx ON public.admin_users(tenant_id);
  END IF;
END $$;

-- 3) Presupuestos por empresa: id + tenant_id y slug + tenant_id
DO $$
BEGIN
  IF to_regclass('public.presupuestos') IS NOT NULL THEN
    ALTER TABLE public.presupuestos
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
        REFERENCES public.tenants(id);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'presupuestos_id_tenant_unique'
        AND conrelid = 'public.presupuestos'::regclass
    ) THEN
      ALTER TABLE public.presupuestos
        ADD CONSTRAINT presupuestos_id_tenant_unique UNIQUE (id, tenant_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'presupuestos_slug_tenant_unique'
        AND conrelid = 'public.presupuestos'::regclass
    ) THEN
      ALTER TABLE public.presupuestos
        ADD CONSTRAINT presupuestos_slug_tenant_unique UNIQUE (slug, tenant_id);
    END IF;

    CREATE INDEX IF NOT EXISTS presupuestos_tenant_idx ON public.presupuestos(tenant_id);
  END IF;
END $$;

-- 4) Órdenes por empresa: índices para actualizaciones y webhooks
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
        REFERENCES public.tenants(id);

    CREATE INDEX IF NOT EXISTS orders_tenant_idx ON public.orders(tenant_id);
    CREATE INDEX IF NOT EXISTS orders_id_tenant_idx ON public.orders(id, tenant_id);
    CREATE INDEX IF NOT EXISTS orders_payment_id_tenant_idx ON public.orders(payment_id, tenant_id);
  END IF;
END $$;

-- 5) Snapshots de cuota por empresa
DO $$
BEGIN
  IF to_regclass('public.integration_quota_snapshots') IS NOT NULL THEN
    ALTER TABLE public.integration_quota_snapshots
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
        REFERENCES public.tenants(id);

    CREATE INDEX IF NOT EXISTS integration_quota_snapshots_tenant_idx
      ON public.integration_quota_snapshots(tenant_id, provider, captured_at DESC);
  END IF;
END $$;

-- 6) Auditoría de integraciones por empresa
DO $$
BEGIN
  IF to_regclass('public.integration_audit') IS NOT NULL THEN
    ALTER TABLE public.integration_audit
      ADD COLUMN IF NOT EXISTS tenant_id uuid
        REFERENCES public.tenants(id);

    CREATE INDEX IF NOT EXISTS integration_audit_tenant_idx
      ON public.integration_audit(tenant_id, provider, action);
  END IF;
END $$;
