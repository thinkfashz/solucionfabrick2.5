import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import {
  getProductIntelligenceCapabilities,
  identifyProductByCode,
  identifyProductFromPhoto,
} from '@/lib/inventory/productIntelligence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

function cleanCode(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 512) : '';
}

async function sha1Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function uploadProductPhoto(tenantId: string, file: File) {
  const integration = await readTenantIntegration(tenantId, 'cloudinary', ['cloud_name', 'api_key', 'api_secret']);
  if (!integration.ready) return { url: '', warning: 'Cloudinary no está configurado para esta empresa; la foto se usó para el análisis pero no se guardó.' };

  const folder = 'inventory/intelligence';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await sha1Hex(`folder=${folder}&timestamp=${timestamp}${integration.values.api_secret}`);
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  form.append('timestamp', timestamp);
  form.append('api_key', integration.values.api_key);
  form.append('signature', signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(integration.values.cloud_name)}/image/upload`, {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });
    if (!response.ok) return { url: '', warning: `Cloudinary no pudo guardar la fotografía (HTTP ${response.status}).` };
    const json = await response.json().catch(() => ({})) as { secure_url?: string };
    return json.secure_url
      ? { url: json.secure_url, warning: '' }
      : { url: '', warning: 'Cloudinary respondió sin una URL de imagen.' };
  } catch {
    return { url: '', warning: 'No se pudo guardar la fotografía en Cloudinary.' };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const capabilities = await getProductIntelligenceCapabilities(auth.ctx.tenantId);
  return NextResponse.json({ ok: true, capabilities, configureUrl: '/admin/integraciones?category=ai' });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;
  const { tenantId } = auth.ctx;
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const action = String(form.get('action') ?? 'photo').trim();
    if (action !== 'photo') return NextResponse.json({ error: 'Acción multipart no soportada.' }, { status: 400 });
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Toma o selecciona una fotografía del producto.' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Formato de imagen no compatible. Usa JPG, PNG, WEBP, AVIF o una foto HEIC/HEIF.' }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'La imagen debe pesar menos de 3 MB. La pantalla intenta comprimirla automáticamente.' }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await identifyProductFromPhoto(tenantId, {
      code: cleanCode(form.get('code')),
      mimeType: file.type || 'image/jpeg',
      base64: bytes.toString('base64'),
    });

    if (!result.ok) {
      return NextResponse.json({
        ...result,
        configureUrl: '/admin/integraciones?category=ai',
      }, { status: result.code === 'AI_NOT_AVAILABLE' ? 503 : 502 });
    }

    const persistPhoto = String(form.get('persistPhoto') ?? '1') !== '0';
    const upload = persistPhoto ? await uploadProductPhoto(tenantId, file) : { url: '', warning: '' };
    const warnings = [...result.warnings, ...(upload.warning ? [upload.warning] : [])];

    return NextResponse.json({
      ...result,
      warnings,
      imageUrl: upload.url,
      configureUrl: '/admin/integraciones?category=ai',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action.trim() : 'lookup';
  if (action !== 'lookup') return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  const code = cleanCode(body.code);
  if (!code) return NextResponse.json({ error: 'Ingresa o escanea un código antes de buscar en línea.' }, { status: 400 });

  const result = await identifyProductByCode(tenantId, code);
  return NextResponse.json({ ok: true, ...result, configureUrl: '/admin/integraciones?category=ai' });
}
