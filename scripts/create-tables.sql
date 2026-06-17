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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre text,
  cliente_email text,
  cliente_telefono text,
  items jsonb DEFAULT '[]',
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pendiente',
  payment_id text,
  direccion_envio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
