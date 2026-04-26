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
-- Schema en inglés usado por el panel de administración (`/admin/productos`),
-- el catálogo público (`/tienda`) y los endpoints `/api/productos` y `/api/sync/*`.
-- Mantiene coherencia con los campos que consumen los componentes React.
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: integrations
-- Almacena las credenciales (JSON libre) de cada proveedor externo configurado
-- desde `/admin/configuracion`. Se usa también como fallback en
-- `/api/admin/social/publish` y `/api/admin/integrations/test`.
CREATE TABLE IF NOT EXISTS public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

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
-- Idempotent column backfill for environments where `projects` already
-- existed with an older schema (pre `metros_cuadrados`, `imagenes`,
-- `cliente`, ...). `CREATE TABLE IF NOT EXISTS` is a no-op on existing
-- tables, so without these `ALTER`s the seed `INSERT` below fails with
-- `column "metros_cuadrados" of relation "projects" does not exist`.
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
  ('slogan', 'Ingeniería Residencial de Precisión')
ON CONFLICT (clave) DO NOTHING;

-- SEED: proyecto demo para no mostrar vacío
INSERT INTO public.projects (titulo, descripcion, categoria, ubicacion, metros_cuadrados, destacado, anio)
VALUES
  ('Casa Andes — Vivienda Metalcon 2 Pisos', 'Construcción industrializada con perfilería Metalcon, aislación lana mineral y revestimiento exterior PVC.', 'VIVIENDA NUEVA', 'Colina, Región Metropolitana', 142, true, 2024),
  ('Ampliación Cocina Sur', 'Ampliación de cocina con estructura Metalcon, ventanales de aluminio y terminaciones en PVC mármol.', 'AMPLIACIÓN', 'Linares, Maule', 38, false, 2024),
  ('Baño Completo Premium', 'Remodelación integral con revestimiento PVC mármol, gasfitería certificada SEC y domótica básica.', 'REMODELACIÓN', 'Talca, Maule', 12, true, 2023)
ON CONFLICT DO NOTHING;
