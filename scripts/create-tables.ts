/**
 * scripts/create-tables.ts
 *
 * Crea todas las tablas faltantes en InsForge usando la API REST
 * (`POST /api/database/advance/rawsql`) directamente con `fetch`.
 *
 * Uso:
 *   NEXT_PUBLIC_INSFORGE_URL=...  INSFORGE_API_KEY=...  npx tsx scripts/create-tables.ts
 *
 * Variables de entorno requeridas:
 *   - NEXT_PUBLIC_INSFORGE_URL : URL base del proyecto InsForge (ej. https://xxxx.us-east.insforge.app)
 *   - INSFORGE_API_KEY         : API key de administrador del proyecto InsForge
 *
 * El script ejecuta 13 operaciones SQL en orden. Por cada una imprime
 * ✅ o ❌ con el error, y al final un resumen "X tablas creadas, X errores".
 */

type SqlStep = {
  name: string;
  query: string;
};

const STEPS: SqlStep[] = [
  {
    name: 'projects',
    query: `CREATE TABLE IF NOT EXISTS projects (
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
);`,
  },
  {
    name: 'notifications',
    query: `CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  admin_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'observatory_logs',
    query: `CREATE TABLE IF NOT EXISTS observatory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50),
  servicio VARCHAR(50),
  mensaje TEXT,
  latencia INTEGER,
  status VARCHAR(20) DEFAULT 'ok',
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'posts_social',
    query: `CREATE TABLE IF NOT EXISTS posts_social (
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
);`,
  },
  {
    name: 'admin_invitations',
    query: `CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  rol VARCHAR(20) DEFAULT 'admin',
  invitado_por UUID,
  usado BOOLEAN DEFAULT false,
  expira_at TIMESTAMPTZ DEFAULT now() + interval '24 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'admin_webauthn_credentials',
    query: `CREATE TABLE IF NOT EXISTS admin_webauthn_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  device_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used TIMESTAMPTZ
);`,
  },
  {
    name: 'servicios',
    query: `CREATE TABLE IF NOT EXISTS servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  icono VARCHAR(50),
  precio_desde INTEGER,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'banners',
    query: `CREATE TABLE IF NOT EXISTS banners (
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
);`,
  },
  {
    name: 'site_config',
    query: `CREATE TABLE IF NOT EXISTS site_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'testimonios',
    query: `CREATE TABLE IF NOT EXISTS testimonios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255),
  cargo VARCHAR(255),
  texto TEXT,
  calificacion INTEGER DEFAULT 5,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
  },
  {
    name: 'integrations',
    query: `CREATE TABLE IF NOT EXISTS integrations (
  provider    TEXT        PRIMARY KEY,
  credentials JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
  },
  {
    name: 'admin_users (columnas rol + aprobado)',
    query: `ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'admin';
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT false;`,
  },
  {
    name: 'site_config (seed inicial)',
    query: `INSERT INTO site_config (clave, valor, tipo) VALUES
  ('hero_titulo', 'Construimos tu Sueño en Realidad', 'text'),
  ('hero_subtitulo', 'Tu hogar merece lo mejor', 'text'),
  ('tagline', 'Tu Obra en Buenas Manos', 'text'),
  ('whatsapp', '', 'text'),
  ('email_contacto', '', 'text'),
  ('direccion', 'Santiago, Chile', 'text'),
  ('color_primario', '#f5c800', 'color'),
  ('meta_titulo', 'Soluciones Fabrick', 'text'),
  ('meta_descripcion', 'Construcción y remodelación residencial en Chile', 'text')
ON CONFLICT (clave) DO NOTHING;`,
  },
];

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

async function runRawSql(
  baseUrl: string,
  apiKey: string,
  query: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/database/advance/rawsql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const text = await res.text();
      detail = text ? ` — ${text}` : '';
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail}`);
  }
}

async function main(): Promise<void> {
  const baseUrl = getEnv('NEXT_PUBLIC_INSFORGE_URL');
  const apiKey = getEnv('INSFORGE_API_KEY');

  if (!baseUrl || !apiKey) {
    console.error(
      '❌ Faltan variables de entorno. Define NEXT_PUBLIC_INSFORGE_URL e INSFORGE_API_KEY antes de ejecutar este script.'
    );
    process.exit(1);
  }

  console.log(`🚀 Ejecutando ${STEPS.length} operaciones SQL contra ${baseUrl}\n`);

  let ok = 0;
  let failed = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (const step of STEPS) {
    try {
      await runRawSql(baseUrl, apiKey, step.query);
      console.log(`✅ ${step.name}`);
      ok += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${step.name} — ${msg}`);
      errors.push({ name: step.name, error: msg });
      failed += 1;
    }
  }

  console.log('\n──────── Resumen ────────');
  console.log(`✅ ${ok} operaciones exitosas`);
  console.log(`❌ ${failed} errores`);
  if (errors.length > 0) {
    console.log('\nDetalle de errores:');
    for (const e of errors) {
      console.log(`  - ${e.name}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
