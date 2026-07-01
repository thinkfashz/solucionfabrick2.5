-- TABLA: productos
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  precio numeric(10,2) DEFAULT 0,
  precio_oferta numeric(10,2),
  stock integer DEFAULT 0,
  imagen_url text,
  categoria text,
  activo boolean DEFAULT true,
  en_oferta boolean DEFAULT false,
  destacado boolean DEFAULT false,
  vistas integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tagline text,
  price numeric(10,2) DEFAULT 0,
  stock integer DEFAULT 0,
  image_url text,
  category_id text,
  featured boolean DEFAULT false,
  activo boolean DEFAULT true,
  rating numeric(3,2),
  delivery_days integer,
  discount_percentage numeric(5,2),
  specifications jsonb,
  shipping_mode text DEFAULT 'inherit',
  shipping_fee numeric(12,2),
  shipping_weight_kg numeric(8,2),
  shipping_dimensions text,
  shipping_region_overrides jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: products-migrate
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_price numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_currency text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_mode text DEFAULT 'inherit';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_fee numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_weight_kg numeric(8,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_dimensions text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_region_overrides jsonb DEFAULT '{}'::jsonb;

-- TABLA: products-indexes
CREATE INDEX IF NOT EXISTS products_public_catalog_idx ON public.products (activo, featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_active_idx ON public.products (category_id, activo);
CREATE INDEX IF NOT EXISTS products_stock_active_idx ON public.products (stock) WHERE activo = true;
CREATE INDEX IF NOT EXISTS products_source_idx ON public.products (source, source_id) WHERE source IS NOT NULL;

-- TABLA: integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- TABLA: presupuestos
CREATE TABLE IF NOT EXISTS public.presupuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notas text,
  status text NOT NULL DEFAULT 'borrador',
  sent_via jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expira_at timestamptz NOT NULL DEFAULT (now() + interval '5 days')
);
CREATE INDEX IF NOT EXISTS presupuestos_slug_idx ON public.presupuestos (slug);
CREATE INDEX IF NOT EXISTS presupuestos_created_at_idx ON public.presupuestos (created_at DESC);

-- TABLA: presupuestos-migrate
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS status text DEFAULT 'borrador';
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS sent_via jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS expira_at timestamptz DEFAULT (now() + interval '5 days');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presupuestos_slug_key') THEN
    BEGIN
      ALTER TABLE public.presupuestos ADD CONSTRAINT presupuestos_slug_key UNIQUE (slug);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS presupuestos_slug_idx ON public.presupuestos (slug);
CREATE INDEX IF NOT EXISTS presupuestos_created_at_idx ON public.presupuestos (created_at DESC);

-- TABLA: orders
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  customer_name text,
  customer_email text,
  customer_phone text,
  region text,
  shipping_address text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) DEFAULT 0,
  tax numeric(12,2) DEFAULT 0,
  shipping_fee numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'CLP',
  status text DEFAULT 'pendiente_pago',
  payment_id text,
  payment_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cliente_nombre text,
  cliente_email text,
  cliente_telefono text,
  direccion_envio text
);

-- TABLA: orders-migrate
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax numeric(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CLP';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente_pago';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cliente_nombre text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cliente_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cliente_telefono text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS direccion_envio text;

-- TABLA: orders-indexes
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_id_idx ON public.orders (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders (payment_status, updated_at DESC) WHERE payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_customer_email_idx ON public.orders (lower(customer_email)) WHERE customer_email IS NOT NULL;

-- TABLA: payment_webhooks
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  event_type text,
  order_id text,
  payment_id text,
  payment_status text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- TABLA: payment-webhooks-indexes
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhooks_idempotency_key_idx ON public.payment_webhooks (idempotency_key);
CREATE INDEX IF NOT EXISTS payment_webhooks_order_idx ON public.payment_webhooks (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_webhooks_payment_idx ON public.payment_webhooks (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_webhooks_created_at_idx ON public.payment_webhooks (created_at DESC);

-- TABLA: checkout-atomic-stock
CREATE OR REPLACE FUNCTION public.decrement_stock_for_paid_order(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_affected integer := 0;
BEGIN
  SELECT items INTO v_items
  FROM public.orders
  WHERE id::text = p_order_id
  LIMIT 1;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'warning', 'order_not_found', 'orderId', p_order_id);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_items, '[]'::jsonb)) LOOP
    v_product_id := COALESCE(v_item->>'productoId', v_item->>'productId', v_item->>'id');
    v_qty := CASE
      WHEN COALESCE(v_item->>'cantidad', '') ~ '^[0-9]+$' THEN (v_item->>'cantidad')::integer
      WHEN COALESCE(v_item->>'quantity', '') ~ '^[0-9]+$' THEN (v_item->>'quantity')::integer
      ELSE 0
    END;

    IF v_product_id IS NULL OR v_product_id = '' OR v_qty <= 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    UPDATE public.products
    SET stock = stock - v_qty,
        updated_at = now()
    WHERE id::text = v_product_id
      AND stock IS NOT NULL
      AND stock >= v_qty;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected > 0 THEN
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'updated', v_updated, 'skipped', v_skipped, 'orderId', p_order_id);
END;
$$;

-- TABLA: leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  telefono text,
  tipo_proyecto text,
  mensaje text,
  atendido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_atendido_created_at_idx ON public.leads (atendido, created_at DESC);

-- TABLA: posts (blog)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  slug text UNIQUE NOT NULL,
  contenido text,
  resumen text,
  imagen_url text,
  publicado boolean DEFAULT false,
  autor text DEFAULT 'Fabrick',
  categoria text DEFAULT 'Noticias',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_slug_idx ON public.posts (slug);
CREATE INDEX IF NOT EXISTS posts_publicado_created_at_idx ON public.posts (publicado, created_at DESC);

-- TABLA: projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  categoria text,
  ubicacion text,
  metros_cuadrados numeric(8,2),
  imagen_url text,
  imagenes jsonb DEFAULT '[]',
  destacado boolean DEFAULT false,
  anio integer DEFAULT EXTRACT(YEAR FROM now()),
  cliente text,
  created_at timestamptz DEFAULT now()
);

-- TABLA: projects-migrate
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ubicacion text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metros_cuadrados numeric(8,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS imagen_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS destacado boolean DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS anio integer DEFAULT EXTRACT(YEAR FROM now());
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cliente text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- TABLA: projects-migrate-designer
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS design_json jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: projects-indexes
CREATE INDEX IF NOT EXISTS projects_destacado_created_at_idx ON public.projects (destacado, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_categoria_created_at_idx ON public.projects (categoria, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_anio_idx ON public.projects (anio DESC);

-- TABLA: cupones
CREATE TABLE IF NOT EXISTS public.cupones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  descuento numeric(5,4) DEFAULT 0.002,
  usado boolean DEFAULT false,
  usuario_email text,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- TABLA: configuracion
CREATE TABLE IF NOT EXISTS public.configuracion (
  clave text PRIMARY KEY,
  valor text,
  updated_at timestamptz DEFAULT now()
);

-- TABLA: admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  rol text DEFAULT 'admin',
  aprobado boolean DEFAULT true,
  nombre text,
  created_at timestamptz DEFAULT now()
);

-- TABLA: admin_error_logs
CREATE TABLE IF NOT EXISTS public.admin_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text,
  method text,
  status_code integer,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_error_logs_created_at_idx ON public.admin_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_error_logs_endpoint_created_idx ON public.admin_error_logs (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_error_logs_status_created_idx ON public.admin_error_logs (status_code, created_at DESC);

-- TABLA: banners
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  subtitulo text,
  imagen_url text,
  link text,
  activo boolean DEFAULT true,
  orden integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banners_activo_orden_idx ON public.banners (activo, orden, created_at DESC);

-- SEED: configuracion inicial
INSERT INTO public.configuracion (clave, valor) VALUES
  ('logo_url', '/logo-soluciones-fabrick.svg'),
  ('whatsapp', '56930121625'),
  ('email_contacto', 'contacto@solucionesfabrick.com'),
  ('direccion', 'Dentista Lidia Pincheira #1920, Doña Agustina, Linares'),
  ('nombre_empresa', 'Soluciones Fabrick'),
  ('slogan', 'Ingeniería Residencial de Precisión'),
  ('shipping_config', '{"mode":"test","lowValueThreshold":50000,"lowValueSurcharge":10000,"extraUnitFee":2500,"updatedAt":"2026-06-16","rates":[{"region":"VII","label":"Maule / Linares / Talca","testFee":7990,"productionFee":9990,"eta":"1 a 3 días hábiles","updatedAt":"2026-06-16","source":"reference"},{"region":"RM","label":"Región Metropolitana","testFee":6990,"productionFee":8990,"eta":"1 a 3 días hábiles","updatedAt":"2026-06-16","source":"reference"}]}' )
ON CONFLICT (clave) DO NOTHING;

-- SEED: proyecto demo para no mostrar vacío
INSERT INTO public.projects (titulo, descripcion, categoria, ubicacion, metros_cuadrados, destacado, anio)
VALUES
  ('Casa Andes — Vivienda Metalcon 2 Pisos', 'Construcción industrializada con perfilería Metalcon, aislación lana mineral y revestimiento exterior PVC.', 'VIVIENDA NUEVA', 'Colina, Región Metropolitana', 142, true, 2024),
  ('Ampliación Cocina Sur', 'Ampliación de cocina con estructura Metalcon, ventanales de aluminio y terminaciones en PVC mármol.', 'AMPLIACIÓN', 'Linares, Maule', 38, false, 2024),
  ('Baño Completo Premium', 'Remodelación integral con revestimiento PVC mármol, gasfitería certificada SEC y domótica básica.', 'REMODELACIÓN', 'Talca, Maule', 12, true, 2023)
ON CONFLICT DO NOTHING;

-- TABLA: blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text,
  cover_image text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_created_at_idx ON public.blog_posts (published, created_at DESC);
