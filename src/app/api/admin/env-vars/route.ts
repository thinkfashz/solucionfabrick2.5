import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// ── Catalog of all known env vars grouped by service ───────────────────────

type VarDef = {
  key: string;
  label: string;
  sensitive: boolean;
  required?: boolean;
};

type ServiceDef = {
  id: string;
  name: string;
  description: string;
  pingKey?: string;    // env var that holds the URL to ping
  pingHeader?: string; // header name for auth (e.g. "apikey")
  pingAuthKey?: string;// env var that holds the header value
  vars: VarDef[];
};

const SERVICES: ServiceDef[] = [
  {
    id: 'insforge',
    name: 'InsForge · BD',
    description: 'Base de datos principal (PostgreSQL hosted)',
    pingKey: 'NEXT_PUBLIC_INSFORGE_URL',
    pingHeader: 'apikey',
    pingAuthKey: 'NEXT_PUBLIC_INSFORGE_ANON_KEY',
    vars: [
      { key: 'NEXT_PUBLIC_INSFORGE_URL', label: 'URL del servidor', sensitive: false, required: true },
      { key: 'NEXT_PUBLIC_INSFORGE_ANON_KEY', label: 'Anon Key (pública)', sensitive: false, required: true },
      { key: 'INSFORGE_API_KEY', label: 'API Key (server-only)', sensitive: true, required: false },
    ],
  },
  {
    id: 'app',
    name: 'Aplicación',
    description: 'Configuración general del sitio',
    vars: [
      { key: 'NEXT_PUBLIC_APP_URL', label: 'URL pública de la app', sensitive: false, required: true },
      { key: 'NEXT_PUBLIC_WHATSAPP_NUMBER', label: 'WhatsApp operativo', sensitive: false },
    ],
  },
  {
    id: 'admin-auth',
    name: 'Admin · Autenticación',
    description: 'Sesión, contraseñas y bootstrap del admin',
    vars: [
      { key: 'ADMIN_SESSION_SECRET', label: 'Secreto de sesión (HMAC)', sensitive: true, required: true },
      { key: 'ADMIN_PASSWORD_PEPPER', label: 'Pepper de contraseñas', sensitive: true, required: false },
      { key: 'ADMIN_EMAIL', label: 'Email del administrador', sensitive: false },
      { key: 'ADMIN_INITIAL_PASSWORD', label: 'Contraseña inicial (bootstrap)', sensitive: true },
      { key: 'ADMIN_INIT_SECRET', label: 'Secreto de inicialización', sensitive: true },
    ],
  },
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    description: 'Pasarela de pagos online',
    vars: [
      { key: 'MERCADO_PAGO_ACCESS_TOKEN', label: 'Access Token (servidor)', sensitive: true, required: true },
      { key: 'MERCADOPAGO_ACCESS_TOKEN', label: 'Access Token (alt)', sensitive: true },
      { key: 'MP_ACCESS_TOKEN', label: 'Access Token (alt 2)', sensitive: true },
      { key: 'NEXT_PUBLIC_MP_PUBLIC_KEY', label: 'Public Key (cliente)', sensitive: false },
      { key: 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', label: 'Public Key (alt)', sensitive: false },
      { key: 'MERCADO_PAGO_WEBHOOK_SECRET', label: 'Webhook Secret', sensitive: true },
      { key: 'MERCADOPAGO_WEBHOOK_SECRET', label: 'Webhook Secret (alt)', sensitive: true },
    ],
  },
  {
    id: 'mercadolibre',
    name: 'MercadoLibre',
    description: 'Marketplace ML Chile (OAuth seller)',
    vars: [
      { key: 'ML_CLIENT_ID', label: 'App ID (público)', sensitive: false },
      { key: 'ML_CLIENT_SECRET', label: 'Client Secret', sensitive: true },
      { key: 'MERCADOLIBRE_ACCESS_TOKEN', label: 'Access Token (importador)', sensitive: true },
    ],
  },
  {
    id: 'google',
    name: 'Google & Búsqueda',
    description: 'Búsqueda personalizada y APIs de Google',
    vars: [
      { key: 'GOOGLE_CSE_CX', label: 'Custom Search Engine ID', sensitive: false },
      { key: 'GOOGLE_CSE_KEY', label: 'API Key de búsqueda', sensitive: true },
      { key: 'JINA_API_KEY', label: 'Jina Reader API Key', sensitive: true },
    ],
  },
  {
    id: 'meta',
    name: 'Meta Ads & WhatsApp',
    description: 'Graph API para campañas y mensajería',
    vars: [
      { key: 'META_ACCESS_TOKEN', label: 'Access Token', sensitive: true },
      { key: 'META_API_VERSION', label: 'Versión de la API', sensitive: false },
      { key: 'META_AD_ACCOUNT_ID', label: 'Ad Account ID', sensitive: false },
      { key: 'META_ACCOUNT_ID', label: 'Account ID', sensitive: false },
    ],
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    description: 'Almacenamiento y transformación de imágenes',
    vars: [
      { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloud Name', sensitive: false },
      { key: 'CLOUDINARY_API_KEY', label: 'API Key', sensitive: false },
      { key: 'CLOUDINARY_API_SECRET', label: 'API Secret', sensitive: true },
    ],
  },
  {
    id: 'sentry',
    name: 'Sentry · Monitoreo',
    description: 'Captura de errores en producción',
    vars: [
      { key: 'NEXT_PUBLIC_SENTRY_DSN', label: 'DSN público', sensitive: false },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

type ValueKind = 'hash' | 'jwt' | 'secret' | 'url' | 'token' | 'plain' | 'empty';

function detectKind(value: string): ValueKind {
  if (!value) return 'empty';
  if (value.startsWith('$2b$') || value.startsWith('$argon2') || value.startsWith('sha')) return 'hash';
  const parts = value.split('.');
  if (parts.length === 3 && parts.every((p) => /^[a-zA-Z0-9_-]+$/.test(p)) && value.length > 40) return 'jwt';
  if (value.startsWith('http://') || value.startsWith('https://')) return 'url';
  if (/^(ik_|sk_|pk_|TEST-|APP-|AC|EAA)/.test(value)) return 'token';
  if (value.length >= 32 && /^[a-zA-Z0-9+/=_\-]+$/.test(value)) return 'secret';
  return 'plain';
}

async function pingService(service: ServiceDef): Promise<'connected' | 'misconfigured' | 'offline' | 'unknown'> {
  if (!service.pingKey) return 'unknown';
  const baseUrl = process.env[service.pingKey];
  if (!baseUrl) return 'misconfigured';
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (service.pingHeader && service.pingAuthKey) {
      const headerVal = process.env[service.pingAuthKey];
      if (headerVal) headers[service.pingHeader] = headerVal;
    }
    const res = await fetch(`${baseUrl}/rest/v1/`, { headers, signal: AbortSignal.timeout(4000) });
    return res.ok || res.status === 404 ? 'connected' : 'offline';
  } catch {
    return 'offline';
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Admin auth check
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Build response
  const servicesData = await Promise.all(
    SERVICES.map(async (service) => {
      const pingStatus = await pingService(service);
      const vars = service.vars.map((v) => {
        const raw = process.env[v.key] ?? '';
        return {
          key: v.key,
          label: v.label,
          value: raw,
          isSet: raw.length > 0,
          sensitive: v.sensitive,
          required: v.required ?? false,
          kind: detectKind(raw),
        };
      });

      // Derive service status from ping + var availability
      const hasRequiredVars = vars.filter((v) => v.required).every((v) => v.isSet);
      const hasAnyVar = vars.some((v) => v.isSet);
      let status: 'connected' | 'configured' | 'partial' | 'missing';
      if (pingStatus === 'connected') status = 'connected';
      else if (hasRequiredVars) status = 'configured';
      else if (hasAnyVar) status = 'partial';
      else status = 'missing';

      return { id: service.id, name: service.name, description: service.description, status, vars };
    }),
  );

  return NextResponse.json({ services: servicesData });
}
