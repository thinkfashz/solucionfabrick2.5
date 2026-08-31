import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
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

    return NextResponse.json({ ...result, configureUrl: '/admin/integraciones?category=ai' });
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
