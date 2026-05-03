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

-- TABLA: products-migrate
-- Columnas de "origen del producto" usadas por el flujo de importación
-- desde URL (`/admin/productos/importar`) y por el botón "Comprar y enviar
-- al cliente" en el detalle de pedido (`/admin/pedidos/[id]`). Se aplican
-- como migración separada para no romper instalaciones previas.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_price numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_currency text;

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

-- TABLA: projects-migrate-designer
-- Columnas adicionales utilizadas por el Ecosistema de Diseño Bimodal
-- (`/editor`). `design_json` guarda el array completo de elementos del
-- store (`useDesignStore`) en formato JSON; `thumbnail_url` contiene la
-- URL pública (subida al bucket `project-thumbnails`) de la captura de
-- pantalla del Canvas en el momento del guardado.
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
  page text DEFAULT 'home',
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
-- `page` discrimina la página dueña de la sección. Valores actuales:
-- 'home' (landing) y 'tienda' (catálogo). Editores admin filtran por este
-- campo para reusar la misma tabla y mismo flujo. Default 'home' para no
-- romper registros antiguos.
ALTER TABLE public.home_sections ADD COLUMN IF NOT EXISTS page text DEFAULT 'home';
UPDATE public.home_sections SET page = 'home' WHERE page IS NULL;

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

-- ─────────────────────────────────────────────────────────────────
-- EPIC 4 — PWA adoption analytics
-- ─────────────────────────────────────────────────────────────────

-- TABLA: pwa_events
-- Registra eventos anónimos (install_prompt_shown, installed, push_granted...)
-- emitidos por `POST /api/pwa/track`. Sin PII obligatorio: `user_id` y `meta`
-- son opcionales. Usado por `/admin/analytics/pwa` (épica 4).
CREATE TABLE IF NOT EXISTS public.pwa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  user_id text,
  ua text,
  platform text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- TABLA: pwa_events-migrate
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS event text;
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS ua text;
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.pwa_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────────
-- Monitor de Errores (admin)
-- ─────────────────────────────────────────────────────────────────

-- TABLA: admin_error_logs
-- Capturas automáticas de fallos en rutas /api/* envueltas con
-- `withErrorLogging` (src/lib/apiHandler.ts). Sirven al panel
-- `/admin/errores` (Monitor de Sistema) para ver, marcar como resueltos
-- y diagnosticar errores sin tener que abrir la consola de Vercel.
CREATE TABLE IF NOT EXISTS public.admin_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text,
  method text,
  payload jsonb,
  error_message text,
  status_code integer,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- TABLA: admin_error_logs-migrate
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS endpoint text;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS status_code integer;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;
ALTER TABLE public.admin_error_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_admin_error_logs_created_at
  ON public.admin_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_error_logs_resolved
  ON public.admin_error_logs (resolved);

-- ─────────────────────────────────────────────────────────────────
-- EPIC 3 — Multi-bodega + stock + variantes con barcode/QR
-- ─────────────────────────────────────────────────────────────────

-- TABLA: warehouses
-- Bodegas físicas. Una sola bodega por defecto si nunca se configuran otras.
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  comuna text,
  region text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: warehouses-migrate
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- SEED: bodega principal
INSERT INTO public.warehouses (code, name, address, comuna, region) VALUES
  ('main', 'Bodega Principal', 'Dentista Lidia Pincheira #1920', 'Linares', 'Maule')
ON CONFLICT (code) DO NOTHING;

-- TABLA: product_variants
-- Variantes de producto con SKU + EAN13. Si un producto no tiene variantes,
-- el código de la app crea automáticamente una variante "base" por producto.
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode_ean13 text UNIQUE,
  name text,
  weight_g integer,
  length_cm numeric(8,2),
  width_cm numeric(8,2),
  height_cm numeric(8,2),
  attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: product_variants-migrate
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode_ean13 text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight_g integer;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS length_cm numeric(8,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS width_cm numeric(8,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS height_cm numeric(8,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: inventory
-- Stock por variante × bodega. `qty_available = qty_on_hand - qty_reserved`.
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  qty_on_hand integer DEFAULT 0,
  qty_reserved integer DEFAULT 0,
  qty_safety integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (variant_id, warehouse_id)
);

-- TABLA: inventory-migrate
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS variant_id uuid;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS warehouse_id uuid;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS qty_on_hand integer DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS qty_reserved integer DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS qty_safety integer DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reorder_point integer DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: inventory_movements
-- Auditoría de movimientos: in/out/transfer/adjustment/reservation/release.
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  type text NOT NULL,
  qty integer NOT NULL,
  ref_order_id uuid,
  ref_user text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- TABLA: inventory_movements-migrate
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS variant_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS warehouse_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS ref_order_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS ref_user text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────────
-- EPIC 2 — Logística + direcciones de envío + tracking
-- ─────────────────────────────────────────────────────────────────

-- TABLA: shipping_addresses
-- Direcciones del cliente; un usuario puede tener varias y marcar una default.
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  user_id text,
  recipient_name text NOT NULL,
  phone text,
  region text NOT NULL,
  comuna text NOT NULL,
  calle text NOT NULL,
  numero text,
  dpto text,
  referencia text,
  lat numeric(10,7),
  lng numeric(10,7),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: shipping_addresses-migrate
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS calle text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS dpto text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS lat numeric(10,7);
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS lng numeric(10,7);
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.shipping_addresses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: shipments
-- Un shipment por orden (al menos). `carrier` es el código (chilexpress,
-- starken, correoschile, mock). `payload_json` guarda el cuerpo crudo del
-- proveedor por si necesitamos depurar más tarde sin volver a llamar la API.
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  carrier text NOT NULL,
  service_code text,
  tracking_code text,
  label_url text,
  cost numeric(10,2) DEFAULT 0,
  eta_days integer,
  status text DEFAULT 'pending',
  origin_warehouse_id uuid,
  address_id uuid,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: shipments-migrate
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS service_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS label_url text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS eta_days integer;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS origin_warehouse_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS address_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS payload_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────────
-- EPIC 1 — Facturación electrónica (SII)
-- ─────────────────────────────────────────────────────────────────

-- TABLA: invoices
-- DTE emitido por el proveedor (Haulmer/OpenFactura/LibreDTE/SimpleAPI…).
-- `dte_type` sigue los códigos del SII: 33 factura electrónica, 39 boleta,
-- 41 boleta exenta, 61 nota crédito, 56 nota débito.
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  dte_type integer NOT NULL,
  folio text,
  rut_emisor text,
  rut_receptor text,
  razon_social_receptor text,
  giro_receptor text,
  direccion_receptor text,
  comuna_receptor text,
  neto numeric(12,2) DEFAULT 0,
  iva numeric(12,2) DEFAULT 0,
  exento numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  xml_url text,
  pdf_url text,
  pdf_token text,
  sii_track_id text,
  sii_status text DEFAULT 'pending',
  provider text,
  provider_payload jsonb DEFAULT '{}'::jsonb,
  voided boolean DEFAULT false,
  voided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: invoices-migrate
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS dte_type integer;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rut_emisor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rut_receptor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS razon_social_receptor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS giro_receptor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS direccion_receptor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS comuna_receptor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS neto numeric(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS iva numeric(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exento numeric(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS xml_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_token text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sii_track_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sii_status text DEFAULT 'pending';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provider_payload jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided boolean DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────────
-- EPIC 5 — Loyalty + cupones + referidos
-- ─────────────────────────────────────────────────────────────────

-- TABLA: loyalty_accounts
-- Una cuenta por usuario. `tier` se recalcula del `lifetime_spend` al cerrar
-- una orden. `points_balance` se actualiza vía `loyalty_transactions`.
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  user_email text PRIMARY KEY,
  points_balance integer DEFAULT 0,
  tier text DEFAULT 'bronze',
  lifetime_spend numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: loyalty_accounts-migrate
ALTER TABLE public.loyalty_accounts ADD COLUMN IF NOT EXISTS points_balance integer DEFAULT 0;
ALTER TABLE public.loyalty_accounts ADD COLUMN IF NOT EXISTS tier text DEFAULT 'bronze';
ALTER TABLE public.loyalty_accounts ADD COLUMN IF NOT EXISTS lifetime_spend numeric(12,2) DEFAULT 0;
ALTER TABLE public.loyalty_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.loyalty_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: loyalty_transactions
-- Histórico de movimientos de puntos (earn / redeem / expire / adjust).
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  ref_order_id uuid,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABLA: loyalty_transactions-migrate
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS points integer;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS ref_order_id uuid;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- TABLA: coupons
-- Código de cupón válido para una o varias compras. `kind`:
--   percent   → `value` es % (0–100), tope 30% del subtotal por defecto.
--   amount    → `value` es CLP descontado del total.
--   free_shipping → ignora `value`, anula el costo de despacho.
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  kind text NOT NULL DEFAULT 'percent',
  value numeric(10,2) DEFAULT 0,
  min_amount numeric(12,2) DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  max_uses_per_user integer,
  uses_count integer DEFAULT 0,
  applies_to jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: coupons-migrate
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS kind text DEFAULT 'percent';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS value numeric(10,2) DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses_per_user integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS uses_count integer DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: coupon_redemptions
-- Una redención por (cupón, usuario, orden). Permite enforcement de
-- `max_uses_per_user` sin consultar `orders.items`.
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  user_email text,
  order_id uuid,
  amount_discounted numeric(12,2) DEFAULT 0,
  redeemed_at timestamptz DEFAULT now()
);

-- TABLA: coupon_redemptions-migrate
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS amount_discounted numeric(12,2) DEFAULT 0;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS redeemed_at timestamptz DEFAULT now();

-- TABLA: referrals
-- Programa de referidos. El referente gana puntos cuando el referido completa
-- su primera orden con monto >= a un umbral configurable (en `configuracion`).
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  referrer_email text NOT NULL,
  referee_email text,
  status text DEFAULT 'pending',
  reward_points integer DEFAULT 0,
  completed_order_id uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABLA: referrals-migrate
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referrer_email text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referee_email text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS completed_order_id uuid;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- SEED: configuracion loyalty (claves consumidas por src/lib/loyalty.ts)
INSERT INTO public.configuracion (clave, valor) VALUES
  ('loyalty_points_per_clp', '0.001'),
  ('loyalty_redeem_clp_per_point', '10'),
  ('loyalty_redeem_max_pct', '0.30'),
  ('loyalty_referral_min_amount', '20000'),
  ('loyalty_referral_reward_points', '500'),
  ('loyalty_points_expiry_months', '12')
ON CONFLICT (clave) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- EPIC 6 — Multi-moneda (i18n se resuelve en el cliente)
-- ─────────────────────────────────────────────────────────────────

-- TABLA: currencies
-- Catálogo de monedas soportadas. `decimals` controla redondeo (CLP=0, USD=2).
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  symbol text NOT NULL,
  name text,
  decimals integer DEFAULT 2,
  active boolean DEFAULT true
);

-- SEED: monedas iniciales
INSERT INTO public.currencies (code, symbol, name, decimals, active) VALUES
  ('CLP', '$', 'Peso chileno', 0, true),
  ('USD', 'US$', 'Dólar estadounidense', 2, true),
  ('EUR', '€', 'Euro', 2, false),
  ('UF', 'UF', 'Unidad de Fomento', 2, false)
ON CONFLICT (code) DO NOTHING;

-- TABLA: exchange_rates
-- Tipo de cambio CLP → cualquier otra moneda (base = CLP). Refrescada por
-- `/api/cron/refresh-rates` (cron Vercel) desde mindicador.cl.
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'CLP',
  quote text NOT NULL,
  rate numeric(20,8) NOT NULL,
  source text,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE (base, quote, fetched_at)
);

-- TABLA: exchange_rates-migrate
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS base text DEFAULT 'CLP';
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS quote text;
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS rate numeric(20,8);
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now();

-- TABLA: materials
-- Catálogo del Cotizador Fabrick. Alimenta /presupuesto y /admin/materiales.
-- `unit` ∈ {m2, ml, unidad, kit, global, instalacion, equipo, proyecto}.
-- `category` ∈ {obra-gruesa, terminaciones, especialidades, servicios,
--   electricidad, gasfiteria, climatizacion, conectividad, seguridad}.
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'obra-gruesa',
  unit text NOT NULL DEFAULT 'unidad',
  price numeric(12,2) NOT NULL DEFAULT 0,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  stock integer,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: materials-migrate
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category text DEFAULT 'obra-gruesa';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit text DEFAULT 'unidad';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: quotes
-- Presupuesto guardado por un cliente desde el Cotizador. `lines` es la
-- snapshot de los materiales/servicios elegidos al momento de finalizar
-- la cotización (precios congelados para evitar drift). `totals` guarda
-- subtotal, IVA, envío/instalación y total final calculado server-side.
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  region text,
  notes text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  shipping_cost numeric(12,2) DEFAULT 0,
  installation_cost numeric(12,2) DEFAULT 0,
  iva_rate numeric(5,4) DEFAULT 0.19,
  total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: quotes-migrate
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS lines jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS totals jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_cost numeric(12,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS installation_cost numeric(12,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS iva_rate numeric(5,4) DEFAULT 0.19;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS total numeric(14,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- TABLA: site_structure
-- Universal CMS: una fila por sección editable del sitio (nav-menu, footer,
-- checkout, producto, error-404, global-styles, custom-injection).
-- `content jsonb` contiene el blob con la forma definida en
-- src/lib/siteStructureTypes.ts. La capa pública usa `mergeWithDefault` por lo
-- que filas faltantes o malformadas degradan al contenido por defecto.
CREATE TABLE IF NOT EXISTS public.site_structure (
  section_key text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- TABLA: site_structure-migrate
ALTER TABLE public.site_structure ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.site_structure ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.site_structure ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.site_structure ADD COLUMN IF NOT EXISTS updated_by text;

-- TABLA: favorites
-- Wishlist por cliente registrado. Una fila por (user_id, product_id).
-- user_id corresponde al `id` del usuario InsForge (validado server-side).
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT favorites_user_product_unique UNIQUE (user_id, product_id)
);

-- TABLA: favorites-migrate
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_product_id_idx ON public.favorites(product_id);

-- TABLA: orders-migrate
-- Asegura columnas modernas de pago en deployments antiguos donde la tabla
-- `orders` se creó con un esquema previo. La columna `payment_status` la
-- escribe `/api/payments/mercadopago` y la lee `/admin/pagos`.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
