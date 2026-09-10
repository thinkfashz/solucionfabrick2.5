import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_INSTRUCTIONS = 700;
const MODEL_PREFERENCE = [
  'google/gemini-3.1-flash-image',
  'openai/gpt-image-1',
  'bytedance-seed/seedream-4.5',
  'x-ai/grok-imagine-image-quality',
];

type Mode = 'generate' | 'improve';
type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  sku?: string | null;
  specifications?: Record<string, unknown> | null;
};

type ImageModel = {
  id?: string;
  supported_parameters?: Record<string, unknown> | string[];
};

function clean(value: unknown, max = 300) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function slug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'general';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function supports(model: ImageModel, key: string) {
  const params = model.supported_parameters;
  if (Array.isArray(params)) return params.includes(key);
  return Boolean(params && typeof params === 'object' && key in params);
}

async function chooseImageModel(apiKey: string, appName: string, siteUrl: string | null, mode: Mode) {
  const configured = clean(process.env.OPENROUTER_IMAGE_MODEL, 160);
  const response = await fetch('https://openrouter.ai/api/v1/images/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-Title': appName,
      ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`No se pudo consultar los modelos de imagen (HTTP ${response.status}).`);
  const json = await response.json().catch(() => ({})) as { data?: ImageModel[] };
  const models = Array.isArray(json.data) ? json.data.filter((item) => clean(item.id, 160)) : [];
  const compatible = (model: ImageModel) => mode === 'generate' || supports(model, 'input_references');

  if (configured) {
    const exact = models.find((item) => item.id === configured);
    if (exact && compatible(exact)) return exact;
  }
  for (const preferred of MODEL_PREFERENCE) {
    const model = models.find((item) => item.id === preferred);
    if (model && compatible(model)) return model;
  }
  const fallback = models.find(compatible);
  if (!fallback?.id) throw new Error(mode === 'improve' ? 'No hay un modelo de imagen configurado que acepte una imagen de referencia.' : 'No hay modelos de imagen disponibles en OpenRouter.');
  return fallback;
}

async function getCloudinaryCredentials() {
  const client = getAdminInsforge();
  const { data, error } = await client.database.from('integrations').select('credentials').eq('provider', 'cloudinary').limit(1);
  if (error || !Array.isArray(data) || !data.length) return null;
  const plain = decryptCredentials((data[0] as { credentials?: Record<string, unknown> }).credentials ?? {}) as Record<string, string | undefined>;
  const cloudName = clean(plain.cloud_name || plain.cloudName, 120);
  const apiKey = clean(plain.api_key || plain.apiKey, 180);
  const apiSecret = clean(plain.api_secret || plain.apiSecret, 240);
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function cloudinarySignature(params: Record<string, string>, secret: string) {
  const base = Object.entries(params).filter(([, value]) => value).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  return createHash('sha1').update(`${base}${secret}`).digest('hex');
}

async function uploadToCloudinary(input: { dataUrl: string; folder: string }) {
  const creds = await getCloudinaryCredentials();
  if (!creds) throw new Error('Cloudinary no está configurado en Administrador > Integraciones.');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = cloudinarySignature({ folder: input.folder, timestamp }, creds.apiSecret);
  const form = new FormData();
  form.append('file', input.dataUrl);
  form.append('folder', input.folder);
  form.append('timestamp', timestamp);
  form.append('api_key', creds.apiKey);
  form.append('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  const json = await response.json().catch(() => ({})) as { secure_url?: string; public_id?: string; width?: number; height?: number; bytes?: number; error?: { message?: string } };
  if (!response.ok || !json.secure_url) throw new Error(json.error?.message || `Cloudinary rechazó la imagen (HTTP ${response.status}).`);
  return { url: json.secure_url, publicId: json.public_id || '', width: json.width || 0, height: json.height || 0, bytes: json.bytes || 0 };
}

function buildPrompt(product: ProductRow, mode: Mode, instructions: string) {
  const identity = [
    `Producto: ${clean(product.name, 180)}`,
    product.sku ? `SKU: ${clean(product.sku, 80)}` : '',
    product.description ? `Descripción disponible: ${clean(product.description, 650)}` : '',
  ].filter(Boolean).join('\n');
  const task = mode === 'improve'
    ? 'Usa la imagen de referencia como identidad visual obligatoria. Conserva exactamente el producto, su forma, colores, proporciones, etiquetas, marca visible y piezas. Mejora únicamente iluminación, encuadre, limpieza de fondo, nitidez y presentación comercial. No inventes accesorios, certificaciones, textos ni características que no estén en la referencia.'
    : 'Crea una fotografía comercial de ecommerce clara y realista basada exclusivamente en la información entregada. Presenta un solo producto centrado, fondo limpio y neutro, iluminación profesional y composición cuadrada. No agregues textos promocionales, logos inventados, certificaciones, accesorios o especificaciones no confirmadas.';
  return `${task}\n\n${identity}${instructions ? `\n\nIndicaciones adicionales del administrador: ${instructions}` : ''}\n\nDestino: catálogo de construcción y hogar de Soluciones Fabrick en Chile. La imagen debe funcionar como portada de producto y mantener apariencia profesional, natural y creíble.`;
}

async function loadProduct(id: string): Promise<ProductRow | null> {
  const client = getAdminInsforge();
  const { data, error } = await client.database.from('products').select('id,name,description,image_url,category_id,sku,specifications').eq('id', id).limit(1);
  if (error) throw new Error(error.message || 'No se pudo cargar el producto.');
  return Array.isArray(data) && data[0] ? data[0] as ProductRow : null;
}

async function persistProductImage(product: ProductRow, asset: { url: string; publicId: string }, metadata: Record<string, unknown>) {
  const specs = asRecord(product.specifications);
  const priorAssets = Array.isArray(specs.gallery_assets) ? specs.gallery_assets.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
  const priorUrls = Array.isArray(specs.gallery_images) ? specs.gallery_images.map(String).filter(Boolean) : [];
  const newAsset = { url: asset.url, public_id: asset.publicId, source: 'ai-cloudinary', ...metadata };
  const galleryAssets = [newAsset, ...priorAssets.filter((item) => String(item.url || '') !== asset.url)].slice(0, 20);
  const galleryImages = Array.from(new Set([asset.url, product.image_url || '', ...priorUrls])).filter(Boolean).slice(0, 20);
  const nextSpecs = { ...specs, gallery_assets: galleryAssets, gallery_images: galleryImages, ai_image: metadata };
  const client = getAdminInsforge();
  const { error } = await client.database.from('products').update({ image_url: asset.url, specifications: nextSpecs }).eq('id', product.id);
  if (error) throw new Error(error.message || 'La imagen se generó pero no se pudo asociar al producto.');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'content', action: 'create' });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as { productId?: unknown; mode?: unknown; instructions?: unknown };
  const productId = clean(body.productId, 140);
  const mode: Mode = body.mode === 'improve' ? 'improve' : 'generate';
  const instructions = clean(body.instructions, MAX_INSTRUCTIONS);
  if (!productId) return NextResponse.json({ error: 'Selecciona un producto guardado.' }, { status: 400 });

  try {
    const product = await loadProduct(productId);
    if (!product) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    if (mode === 'improve' && (!product.image_url || !/^https:\/\//i.test(product.image_url))) {
      return NextResponse.json({ error: 'Este producto todavía no tiene una imagen pública que pueda usarse como referencia.' }, { status: 422 });
    }

    const openRouter = await getOpenRouterCredentials();
    if (!openRouter) return NextResponse.json({ error: 'OpenRouter no está configurado. Añade la API en Administrador > Integraciones para habilitar generación de imágenes.' }, { status: 503 });
    const model = await chooseImageModel(openRouter.apiKey, openRouter.appName, openRouter.siteUrl, mode);
    const prompt = buildPrompt(product, mode, instructions);
    const payload: Record<string, unknown> = { model: model.id, prompt, n: 1 };
    if (supports(model, 'aspect_ratio')) payload.aspect_ratio = '1:1';
    if (supports(model, 'resolution')) payload.resolution = '1K';
    if (supports(model, 'output_format')) payload.output_format = 'webp';
    if (mode === 'improve') payload.input_references = [{ type: 'image_url', image_url: { url: product.image_url } }];

    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': openRouter.appName,
        ...(openRouter.siteUrl ? { 'HTTP-Referer': openRouter.siteUrl } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(105_000),
    });
    const json = await response.json().catch(() => ({})) as { data?: Array<{ b64_json?: string; media_type?: string }>; error?: { message?: string }; usage?: { cost?: number } };
    if (!response.ok) throw new Error(json.error?.message || `El proveedor de IA rechazó la solicitud (HTTP ${response.status}).`);
    const generated = Array.isArray(json.data) ? json.data.find((item) => item?.b64_json) : undefined;
    if (!generated?.b64_json) throw new Error('El modelo respondió sin una imagen utilizable.');
    if (generated.b64_json.length > 22_000_000) throw new Error('La imagen generada excede el límite seguro de tamaño.');
    const mime = clean(generated.media_type, 80) || 'image/png';
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(mime)) throw new Error(`Formato de imagen no compatible: ${mime}.`);

    const asset = await uploadToCloudinary({ dataUrl: `data:${mime};base64,${generated.b64_json}`, folder: `fabrick/productos/ia/${slug(product.category_id || 'general')}` });
    const metadata = {
      provider: 'openrouter',
      model: model.id,
      mode,
      generated_at: new Date().toISOString(),
      instructions: instructions || null,
      cost_usd: typeof json.usage?.cost === 'number' ? json.usage.cost : null,
      public_id: asset.publicId,
    };
    await persistProductImage(product, asset, metadata);

    return NextResponse.json({ ok: true, url: asset.url, asset: { public_id: asset.publicId, width: asset.width, height: asset.height, bytes: asset.bytes }, model: model.id, mode, cost_usd: metadata.cost_usd });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar la imagen.' }, { status: 500 });
  }
}
