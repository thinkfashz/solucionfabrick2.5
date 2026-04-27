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

-- TABLA: blog_posts
-- Contenido editable del blog desde /admin/blog. Sustituye/complementa los
-- ficheros .md en src/content/blog. Los .md siguen siendo el fallback hasta
-- migrar (botón "Importar .md" en /admin/setup).
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  body_md text DEFAULT '',
  body_html text DEFAULT '',
  tags jsonb DEFAULT '[]'::jsonb,
  author text,
  published boolean DEFAULT false,
  published_at timestamptz,
  reading_minutes integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: blog_posts-migrate
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS body_md text DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS body_html text DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS reading_minutes integer DEFAULT 1;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: home_sections
-- Modela los bloques editables de la pantalla principal. El campo `data jsonb`
-- guarda el contenido específico por tipo (lista de servicios, banners, ítems
-- de producto, etc.) sin requerir migraciones por cada cambio. La integración
-- pública prioriza estos registros sobre el contenido hardcodeado y cae al
-- fallback estático cuando la tabla está vacía.
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: home_sections-migrate
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS link_label text;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: media_assets
-- Inventario unificado de imágenes/archivos subidos por el panel. La subida
-- real va a InsForge Storage (bucket configurable, default `media`).
-- `folder` permite organizar (blog/, home/, banners/, general/...).
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'media',
  path text NOT NULL,
  url text NOT NULL,
  alt text,
  folder text DEFAULT 'general',
  mime_type text,
  size_bytes integer,
  width integer,
  height integer,
  tags jsonb DEFAULT '[]'::jsonb,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- TABLA: media_assets-migrate
-- NOTE: `bucket` is intentionally added as nullable here so the migration is
-- safe on tables with pre-existing rows from older schema versions. New rows
-- inserted by the API always include `bucket`; the column gets a default at
-- table-creation time above.
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'media';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS alt text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS folder text DEFAULT 'general';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS size_bytes integer;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS uploaded_by text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- SEED: configuracion CMS (claves usadas por el frontend público)
INSERT INTO public.configuracion (clave, valor) VALUES
  ('copyright_text', '© {year} Soluciones Fabrick · Todos los derechos reservados'),
  ('hero_title', 'SOLUCIONES FABRICK'),
  ('hero_subtitle', 'Ingeniería residencial de precisión'),
  ('hero_cover_url', ''),
  ('social_facebook', ''),
  ('social_instagram', ''),
  ('social_tiktok', '')
ON CONFLICT (clave) DO NOTHING;
