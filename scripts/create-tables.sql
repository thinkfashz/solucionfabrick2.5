-- ============================================================
-- Soluciones Fabrick — Schema completo
-- Ejecutar en: InsForge Dashboard → SQL Editor
-- Seguro de ejecutar múltiples veces (IF NOT EXISTS / ON CONFLICT)
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         NUMERIC      NOT NULL DEFAULT 0,
  stock         INTEGER      DEFAULT 0,
  image_url     TEXT,
  specifications JSONB       DEFAULT '{}'::jsonb,
  featured      BOOLEAN      DEFAULT false,
  rating        NUMERIC(3,1) DEFAULT 0,
  delivery_days VARCHAR(50),
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  category_id   UUID,
  activo        BOOLEAN      DEFAULT true,
  tagline       TEXT,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_featured_idx  ON public.products (featured);
CREATE INDEX IF NOT EXISTS products_activo_idx    ON public.products (activo);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products (created_at DESC);

-- ── categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id              TEXT         DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id         UUID,
  customer_name   TEXT         DEFAULT '',
  customer_email  TEXT         DEFAULT '',
  customer_phone  TEXT,
  region          TEXT         DEFAULT '',
  shipping_address TEXT        DEFAULT '',
  items           JSONB        DEFAULT '[]'::jsonb,
  total           NUMERIC      DEFAULT 0,
  subtotal        NUMERIC      DEFAULT 0,
  tax             NUMERIC      DEFAULT 0,
  shipping_fee    NUMERIC      DEFAULT 0,
  currency        TEXT         DEFAULT 'CLP',
  status          TEXT         DEFAULT 'pendiente',
  payment_id      TEXT,
  payment_status  TEXT,
  created_at      TIMESTAMPTZ  DEFAULT now(),
  updated_at      TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx     ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- ── deliveries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deliveries (
  id              UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        TEXT  NOT NULL UNIQUE,
  customer_name   TEXT,
  address         TEXT,
  estimated_date  DATE,
  responsible     TEXT,
  status          TEXT  DEFAULT 'pendiente',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_status_idx     ON public.deliveries (status);
CREATE INDEX IF NOT EXISTS deliveries_updated_at_idx ON public.deliveries (updated_at DESC);

-- ── payment_webhooks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key  TEXT  NOT NULL,
  event_type       TEXT  NOT NULL,
  order_id         TEXT  NOT NULL,
  payment_id       TEXT,
  payment_status   TEXT  NOT NULL,
  payload          JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhooks_idempotency_key_idx
  ON public.payment_webhooks (idempotency_key);

-- ── leads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre         VARCHAR(255),
  email          VARCHAR(255),
  telefono       VARCHAR(20),
  tipo_proyecto  VARCHAR(100),
  mensaje        TEXT,
  estado         VARCHAR(50)  DEFAULT 'nuevo',
  created_at     TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_estado_idx    ON public.leads (estado);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

-- ── projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                   UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title                VARCHAR(255) NOT NULL,
  location             VARCHAR(255),
  year                 INTEGER,
  area_m2              NUMERIC,
  category             VARCHAR(100),
  hero_image           TEXT,
  gallery              JSONB        DEFAULT '[]'::jsonb,
  summary              TEXT,
  description          TEXT,
  materials            TEXT,
  highlights           JSONB        DEFAULT '[]'::jsonb,
  scope                TEXT,
  featured             BOOLEAN      DEFAULT false,
  created_at           TIMESTAMPTZ  DEFAULT now(),
  updated_at           TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_featured_idx ON public.projects (featured);
CREATE INDEX IF NOT EXISTS projects_year_idx     ON public.projects (year DESC);

-- ── admin_users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  password_hash TEXT,
  nombre       TEXT,
  rol          VARCHAR(20)  DEFAULT 'admin',
  aprobado     BOOLEAN      DEFAULT false,
  created_at   TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users (email);

-- ── admin_invitations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  codigo       VARCHAR(6)  NOT NULL,
  rol          VARCHAR(20) DEFAULT 'admin',
  invitado_por UUID,
  usado        BOOLEAN     DEFAULT false,
  expira_at    TIMESTAMPTZ DEFAULT now() + interval '24 hours',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── admin_webauthn_credentials ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_webauthn_credentials (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id      UUID,
  credential_id TEXT UNIQUE NOT NULL,
  public_key    TEXT NOT NULL,
  device_name   VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_used     TIMESTAMPTZ
);

-- ── banners ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banners (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      VARCHAR(255),
  subtitulo   VARCHAR(255),
  image_url   TEXT,
  color_fondo VARCHAR(20)  DEFAULT '#f5c800',
  link        TEXT,
  activo      BOOLEAN      DEFAULT true,
  orden       INTEGER      DEFAULT 0,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS banners_activo_idx ON public.banners (activo);
CREATE INDEX IF NOT EXISTS banners_orden_idx  ON public.banners (orden);

-- ── business_config ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_config (
  id              TEXT PRIMARY KEY,
  nombre          TEXT,
  rut             TEXT,
  direccion       TEXT,
  ciudad          TEXT,
  whatsapp        TEXT,
  email_contacto  TEXT,
  sitio_web       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── site_config ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_config (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  clave      VARCHAR(100) UNIQUE NOT NULL,
  valor      TEXT,
  tipo       VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── integrations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider    VARCHAR(50) NOT NULL UNIQUE,
  credentials JSONB       DEFAULT '{}'::jsonb,
  activo      BOOLEAN     DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── push_subscriptions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── posts_social ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts_social (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo             VARCHAR(255),
  descripcion        TEXT,
  hashtags           TEXT,
  tag                VARCHAR(100),
  fecha_publicacion  TIMESTAMPTZ,
  tema               VARCHAR(20) DEFAULT 'light',
  imagenes           JSONB       DEFAULT '[]'::jsonb,
  plataformas        JSONB       DEFAULT '[]'::jsonb,
  estado             VARCHAR(50) DEFAULT 'borrador',
  meta_post_id       VARCHAR(255),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── observatory_logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.observatory_logs (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo      VARCHAR(50),
  servicio  VARCHAR(50),
  mensaje   TEXT,
  latencia  INTEGER,
  status    VARCHAR(20) DEFAULT 'ok',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo       VARCHAR(50) NOT NULL,
  titulo     VARCHAR(255) NOT NULL,
  mensaje    TEXT,
  leida      BOOLEAN     DEFAULT false,
  admin_id   UUID,
  metadata   JSONB       DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── servicios ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.servicios (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      VARCHAR(255) NOT NULL,
  descripcion TEXT,
  imagen_url  TEXT,
  icono       VARCHAR(50),
  precio_desde INTEGER,
  activo      BOOLEAN      DEFAULT true,
  orden       INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── testimonios ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonios (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       VARCHAR(255),
  cargo        VARCHAR(255),
  texto        TEXT,
  calificacion INTEGER      DEFAULT 5,
  imagen_url   TEXT,
  activo       BOOLEAN      DEFAULT true,
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- ── cupones ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cupones (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo      VARCHAR(50)  UNIQUE NOT NULL,
  descuento   NUMERIC(5,2) NOT NULL,
  tipo        VARCHAR(20)  DEFAULT 'porcentaje',
  usado       BOOLEAN      DEFAULT false,
  origen      VARCHAR(50)  DEFAULT 'juego',
  puntos      INTEGER      DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cupones_codigo_idx ON public.cupones (codigo);

-- ── Alteraciones seguras en tablas existentes ────────────────
-- (idempotentes — si la columna ya existe, no falla)

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'admin';
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT false;

-- ── Seed inicial ─────────────────────────────────────────────
INSERT INTO public.site_config (clave, valor, tipo) VALUES
  ('hero_titulo',       'Construimos tu Sueño en Realidad',              'text'),
  ('hero_subtitulo',    'Tu hogar merece lo mejor',                      'text'),
  ('tagline',           'Tu Obra en Buenas Manos',                       'text'),
  ('whatsapp',          '+56930121625',                                  'text'),
  ('email_contacto',    'contacto@solucionesfabrick.com',                'text'),
  ('direccion',         'Linares, Maule, Chile',                         'text'),
  ('color_primario',    '#f5c800',                                       'color'),
  ('meta_titulo',       'Soluciones Fabrick',                            'text'),
  ('meta_descripcion',  'Construcción y remodelación residencial en Chile','text')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.business_config (id, nombre, whatsapp, email_contacto, ciudad) VALUES
  ('main', 'Soluciones Fabrick', '+56930121625', 'contacto@solucionesfabrick.com', 'Linares')
ON CONFLICT (id) DO NOTHING;
