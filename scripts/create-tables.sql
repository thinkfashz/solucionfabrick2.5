-- ─────────────────────────────────────────────────────────────
-- Fabrick · Esquema InsForge · creación de tablas administrativas
--
-- Ejecutar en el dashboard SQL de InsForge
-- (Database → SQL Editor → New query) o vía:
--   POST /api/database/advance/rawsql
--
-- Equivalente al script `scripts/create-tables.ts`. Cada bloque es
-- idempotente (usa IF NOT EXISTS / ON CONFLICT) por lo que puede
-- re-ejecutarse sin efectos secundarios.
-- ─────────────────────────────────────────────────────────────

-- 1. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  imagen_principal TEXT,
  imagenes_adicionales JSONB DEFAULT '[]',
  categoria VARCHAR(100),
  ubicacion VARCHAR(255),
  año INTEGER,
  destacado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  admin_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. observatory_logs
CREATE TABLE IF NOT EXISTS observatory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50),
  servicio VARCHAR(50),
  mensaje TEXT,
  latencia INTEGER,
  status VARCHAR(20) DEFAULT 'ok',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. posts_social
CREATE TABLE IF NOT EXISTS posts_social (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255),
  descripcion TEXT,
  hashtags TEXT,
  tag VARCHAR(100),
  fecha_publicacion TIMESTAMPTZ,
  tema VARCHAR(20) DEFAULT 'light',
  imagenes JSONB DEFAULT '[]',
  plataformas JSONB DEFAULT '[]',
  estado VARCHAR(50) DEFAULT 'borrador',
  meta_post_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. admin_invitations
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  rol VARCHAR(20) DEFAULT 'admin',
  invitado_por UUID,
  usado BOOLEAN DEFAULT false,
  expira_at TIMESTAMPTZ DEFAULT now() + interval '24 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. admin_webauthn_credentials
CREATE TABLE IF NOT EXISTS admin_webauthn_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  device_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used TIMESTAMPTZ
);

-- 7. servicios
CREATE TABLE IF NOT EXISTS servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  icono VARCHAR(50),
  precio_desde INTEGER,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. banners
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255),
  subtitulo VARCHAR(255),
  imagen_url TEXT,
  color_fondo VARCHAR(20) DEFAULT '#f5c800',
  url_destino TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. site_config
CREATE TABLE IF NOT EXISTS site_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. testimonios
CREATE TABLE IF NOT EXISTS testimonios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255),
  cargo VARCHAR(255),
  texto TEXT,
  calificacion INTEGER DEFAULT 5,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. integrations
CREATE TABLE IF NOT EXISTS integrations (
  provider    TEXT        PRIMARY KEY,
  credentials JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. admin_users (columnas adicionales rol + aprobado)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'admin';
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT false;

-- 13. site_config (seed inicial)
INSERT INTO site_config (clave, valor, tipo) VALUES
  ('hero_titulo', 'Construimos tu Sueño en Realidad', 'text'),
  ('hero_subtitulo', 'Tu hogar merece lo mejor', 'text'),
  ('tagline', 'Tu Obra en Buenas Manos', 'text'),
  ('whatsapp', '', 'text'),
  ('email_contacto', '', 'text'),
  ('direccion', 'Santiago, Chile', 'text'),
  ('color_primario', '#f5c800', 'color'),
  ('meta_titulo', 'Soluciones Fabrick', 'text'),
  ('meta_descripcion', 'Construcción y remodelación residencial en Chile', 'text')
ON CONFLICT (clave) DO NOTHING;
