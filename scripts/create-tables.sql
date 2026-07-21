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

-- TABLA: categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_idx ON public.categories (lower(name));
CREATE INDEX IF NOT EXISTS categories_created_at_idx ON public.categories (created_at DESC);

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
  tracking_number text,
  carrier text,
  delivery_status text DEFAULT 'pendiente',
  tracking_created_at timestamptz,
  estimated_delivery_at timestamptz,
  shipment_details jsonb DEFAULT '{}'::jsonb,
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
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pendiente';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_created_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipment_details jsonb DEFAULT '{}'::jsonb;
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
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_number_idx ON public.orders (tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_delivery_status_idx ON public.orders (delivery_status, updated_at DESC);

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

-- TABLA: leads-migrate
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tipo_proyecto text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mensaje text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS atendido boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
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

-- TABLA: project_categories
CREATE TABLE IF NOT EXISTS public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#FDE047',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: project-categories-migrate
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#FDE047';
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS project_categories_slug_idx ON public.project_categories (slug);
CREATE INDEX IF NOT EXISTS project_categories_order_idx ON public.project_categories (sort_order, name);

-- TABLA: project-categories-seed
INSERT INTO public.project_categories (name, slug, description, color, sort_order)
VALUES
  ('Ideas', 'ideas', 'Referencias para inspirar nuevos proyectos.', '#FDE047', 0),
  ('Remodelación', 'remodelacion', 'Antes y después, interiores y cambios de espacios.', '#FB923C', 10),
  ('Interiores', 'interiores', 'Terminaciones, cocinas, baños y muebles.', '#F7EFD9', 20)
ON CONFLICT (slug) DO NOTHING;

-- TABLA: project_media
CREATE TABLE IF NOT EXISTS public.project_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE NOT NULL,
  cloudinary_url text NOT NULL,
  folder text DEFAULT 'fabrick/proyectos',
  category_slug text DEFAULT 'ideas',
  title text DEFAULT '',
  story text DEFAULT '',
  description text DEFAULT '',
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  keywords jsonb DEFAULT '[]'::jsonb,
  social jsonb DEFAULT '{}'::jsonb,
  is_favorite boolean DEFAULT false,
  is_published boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: project-media-migrate
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS public_id text;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS cloudinary_url text;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS folder text DEFAULT 'fabrick/proyectos';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS category_slug text DEFAULT 'ideas';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS title text DEFAULT '';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS story text DEFAULT '';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS seo_title text DEFAULT '';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS seo_description text DEFAULT '';
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS keywords jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS social jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.project_media ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS project_media_public_id_idx ON public.project_media (public_id);
CREATE INDEX IF NOT EXISTS project_media_public_gallery_idx ON public.project_media (is_published, is_favorite DESC, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS project_media_category_idx ON public.project_media (category_slug, is_published);

-- TABLA: project_media_comments
CREATE TABLE IF NOT EXISTS public.project_media_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.project_media(id) ON DELETE CASCADE,
  author_name text DEFAULT 'Equipo Fabrick',
  body text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: project-media-comments-migrate
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS media_id uuid;
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS author_name text DEFAULT 'Equipo Fabrick';
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false;
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.project_media_comments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS project_media_comments_media_idx ON public.project_media_comments (media_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_media_comments_pending_idx ON public.project_media_comments (is_resolved, created_at DESC);

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

-- SEED: categorías iniciales
INSERT INTO public.categories (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('General', 'Categoría por defecto.'),
  ('Aire acondicionado', 'Equipos y accesorios de climatización.'),
  ('Hogar', 'Productos para el hogar.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE lower(c.name) = lower(v.name)
);

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

-- TABLA: home_sections
CREATE TABLE IF NOT EXISTS public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text,
  subtitle text,
  body text,
  image_url text,
  link_url text,
  link_label text,
  position integer DEFAULT 0,
  visible boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  page text DEFAULT 'home',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS page text DEFAULT 'home';
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS home_sections_page_position_idx ON public.home_sections (page, position);
CREATE INDEX IF NOT EXISTS home_sections_visible_idx ON public.home_sections (visible, page, position);

-- TABLA: media_assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text DEFAULT 'default',
  bucket text DEFAULT 'media',
  path text NOT NULL,
  url text NOT NULL,
  alt text,
  folder text DEFAULT 'general',
  mime_type text,
  size_bytes bigint DEFAULT 0,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS tenant_id text DEFAULT 'default';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'media';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS folder text DEFAULT 'general';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS size_bytes bigint DEFAULT 0;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS uploaded_by text;
CREATE INDEX IF NOT EXISTS media_assets_tenant_folder_created_idx ON public.media_assets (tenant_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_created_at_idx ON public.media_assets (created_at DESC);
