import 'server-only';

import { readTenantIntegration } from '@/lib/tenantIntegrations';

export type ProductIntelligenceProvider =
  | 'upcitemdb'
  | 'mercadolibre'
  | 'serper'
  | 'gemini'
  | 'openrouter';

export type ProductIntelligenceSource = {
  provider: ProductIntelligenceProvider;
  label: string;
  url?: string;
  detail?: string;
  exact?: boolean;
};

export type ProductIntelligenceCandidate = {
  name: string;
  brand: string;
  model: string;
  description: string;
  sku: string;
  ean: string;
  category: string;
  referenceImageUrl: string;
  confidence: number;
  attributes: Record<string, string>;
  fieldSources: Record<string, ProductIntelligenceProvider[]>;
  sources: ProductIntelligenceSource[];
};

export type ProductIntelligenceCapabilities = {
  upcitemdb: true;
  mercadolibre: boolean;
  gemini: boolean;
  openrouter: boolean;
  serper: boolean;
  ai: boolean;
  webSearch: boolean;
  cloudinary: boolean;
};

type ProviderDraft = Partial<Omit<ProductIntelligenceCandidate, 'confidence' | 'fieldSources' | 'sources'>> & {
  confidence: number;
  provider: ProductIntelligenceProvider;
  sources: ProductIntelligenceSource[];
};

type LookupResult = {
  draft?: ProviderDraft;
  warning?: string;
  context?: string;
};

type JsonRecord = Record<string, unknown>;

const EMPTY_LOOKUP: LookupResult = {};
const CODE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const codeCache = new Map<string, {
  expiresAt: number;
  candidate: ProductIntelligenceCandidate | null;
  warnings: string[];
}>();

function clean(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function clampConfidence(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function isUniversalCode(value: string) {
  return /^\d{8,14}$/.test(value.replace(/\s+/g, ''));
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sameMeaning(a: string, b: string) {
  const left = normalizeComparable(a);
  const right = normalizeComparable(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

function emptyCandidate(): ProductIntelligenceCandidate {
  return {
    name: '',
    brand: '',
    model: '',
    description: '',
    sku: '',
    ean: '',
    category: '',
    referenceImageUrl: '',
    confidence: 0,
    attributes: {},
    fieldSources: {},
    sources: [],
  };
}

function mergeDrafts(drafts: ProviderDraft[]): ProductIntelligenceCandidate | null {
  if (!drafts.length) return null;
  const sorted = [...drafts].sort((a, b) => b.confidence - a.confidence);
  const output = emptyCandidate();
  const scalarFields = [
    'name',
    'brand',
    'model',
    'description',
    'sku',
    'ean',
    'category',
    'referenceImageUrl',
  ] as const;

  for (const draft of sorted) {
    for (const field of scalarFields) {
      const value = clean(draft[field], field === 'description' ? 5000 : 800);
      if (!value) continue;
      if (!output[field]) output[field] = value;
      if (sameMeaning(output[field], value)) {
        const existing = output.fieldSources[field] ?? [];
        if (!existing.includes(draft.provider)) output.fieldSources[field] = [...existing, draft.provider];
      }
    }

    for (const [key, value] of Object.entries(draft.attributes ?? {})) {
      const label = clean(key, 120);
      const text = clean(value, 500);
      if (label && text && !output.attributes[label]) output.attributes[label] = text;
    }

    for (const source of draft.sources) {
      if (!output.sources.some((item) =>
        item.provider === source.provider && item.url === source.url && item.detail === source.detail
      )) {
        output.sources.push(source);
      }
    }
  }

  const max = Math.max(...sorted.map((draft) => draft.confidence));
  const sourceCount = new Set(sorted.map((draft) => draft.provider)).size;
  output.confidence = Math.min(0.99, max + Math.min(0.1, Math.max(0, sourceCount - 1) * 0.04));
  return output.name || output.brand || output.model || output.ean ? output : null;
}

async function lookupUpcItemDb(code: string): Promise<LookupResult> {
  const normalized = code.replace(/\s+/g, '');
  if (!isUniversalCode(normalized)) return EMPTY_LOOKUP;

  try {
    const response = await fetchWithTimeout(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(normalized)}`,
      { headers: { Accept: 'application/json' } },
      7_000,
    );
    if (response.status === 404) return EMPTY_LOOKUP;
    if (response.status === 429) {
      return { warning: 'UPCitemdb alcanzó temporalmente su límite gratuito. Puedes continuar con Mercado Libre o la foto IA.' };
    }
    if (!response.ok) return { warning: `UPCitemdb respondió HTTP ${response.status}.` };

    const payload = record(await response.json().catch(() => ({})));
    const item = record(list(payload.items)[0]);
    if (!Object.keys(item).length) return EMPTY_LOOKUP;

    const images = list(item.images).map((value) => clean(value, 2000)).filter(Boolean);
    const attributes: Record<string, string> = {};
    const dimension = clean(item.dimension, 300);
    const weight = clean(item.weight, 120);
    if (dimension) attributes.Dimensiones = dimension;
    if (weight) attributes.Peso = weight;

    return {
      draft: {
        provider: 'upcitemdb',
        name: clean(item.title, 240),
        brand: clean(item.brand, 160),
        model: clean(item.model, 160),
        description: clean(item.description, 3000),
        ean: clean(item.ean || item.gtin || item.upc, 64) || normalized,
        category: clean(item.category, 240),
        referenceImageUrl: images[0] ?? '',
        attributes,
        confidence: 0.86,
        sources: [{
          provider: 'upcitemdb',
          label: 'UPCitemdb',
          url: `https://www.upcitemdb.com/upc/${encodeURIComponent(normalized)}`,
          detail: 'Coincidencia por UPC/EAN/GTIN',
          exact: true,
        }],
      },
    };
  } catch (error) {
    return {
      warning: error instanceof Error && error.name === 'AbortError'
        ? 'UPCitemdb tardó demasiado en responder.'
        : 'No se pudo consultar UPCitemdb.',
    };
  }
}

function attributeMap(value: unknown) {
  const output: Record<string, string> = {};
  for (const raw of list(value)) {
    const item = record(raw);
    const name = clean(item.name || item.id, 160);
    const text = clean(item.value_name, 400) || clean(record(list(item.values)[0]).name, 400);
    if (name && text) output[name] = text;
  }
  return output;
}

function findAttribute(attributes: Record<string, string>, keys: string[]) {
  const entries = Object.entries(attributes);
  for (const key of keys) {
    const hit = entries.find(([name]) => normalizeComparable(name) === normalizeComparable(key));
    if (hit?.[1]) return hit[1];
  }
  return '';
}

async function lookupMercadoLibre(
  token: string,
  value: string,
  exactIdentifier: boolean,
): Promise<LookupResult> {
  if (!token) return EMPTY_LOOKUP;

  try {
    const searchUrl = new URL('https://api.mercadolibre.com/products/search');
    searchUrl.searchParams.set('status', 'active');
    searchUrl.searchParams.set('site_id', 'MLC');
    searchUrl.searchParams.set('limit', '5');
    searchUrl.searchParams.set(exactIdentifier ? 'product_identifier' : 'q', value);

    const response = await fetchWithTimeout(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }, 8_000);
    if (response.status === 401 || response.status === 403) {
      return { warning: 'Mercado Libre requiere renovar la conexión OAuth antes de consultar catálogo.' };
    }
    if (!response.ok) return { warning: `Mercado Libre respondió HTTP ${response.status}.` };

    const payload = record(await response.json().catch(() => ({})));
    const first = record(list(payload.results)[0]);
    const productId = clean(first.id, 120);
    if (!productId) return EMPTY_LOOKUP;

    let detail = first;
    try {
      const detailResponse = await fetchWithTimeout(
        `https://api.mercadolibre.com/products/${encodeURIComponent(productId)}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        7_000,
      );
      if (detailResponse.ok) detail = record(await detailResponse.json().catch(() => first));
    } catch {
      // Search data remains useful if detail lookup is temporarily unavailable.
    }

    const attributes = attributeMap(detail.attributes ?? first.attributes);
    const pictures = list(detail.pictures ?? first.pictures)
      .map((picture) => {
        const item = record(picture);
        return clean(item.secure_url || item.url, 2000);
      })
      .filter(Boolean);
    const features = list(detail.main_features ?? first.main_features)
      .map((feature) => clean(record(feature).text || record(feature).value_name || feature, 500))
      .filter(Boolean);

    const brand = findAttribute(attributes, ['Marca', 'BRAND']);
    const model = findAttribute(attributes, ['Modelo', 'MODEL', 'Número de pieza', 'Part number', 'MPN']);
    const gtin = findAttribute(attributes, ['GTIN', 'EAN', 'UPC', 'Código universal de producto']);

    return {
      draft: {
        provider: 'mercadolibre',
        name: clean(detail.name || first.name, 240),
        brand,
        model,
        description: features.slice(0, 4).join(' · '),
        ean: gtin || (exactIdentifier ? value : ''),
        category: clean(detail.domain_id || first.domain_id, 200),
        referenceImageUrl: pictures[0] ?? '',
        attributes,
        confidence: exactIdentifier ? 0.94 : 0.76,
        sources: [{
          provider: 'mercadolibre',
          label: 'Mercado Libre Chile',
          url: `https://www.mercadolibre.cl/p/${encodeURIComponent(productId)}`,
          detail: exactIdentifier
            ? 'Producto de catálogo por GTIN/EAN/UPC'
            : 'Coincidencia de catálogo por nombre/modelo',
          exact: exactIdentifier,
        }],
      },
    };
  } catch (error) {
    return {
      warning: error instanceof Error && error.name === 'AbortError'
        ? 'Mercado Libre tardó demasiado en responder.'
        : 'No se pudo consultar Mercado Libre.',
    };
  }
}

async function searchSerper(apiKey: string, query: string): Promise<LookupResult> {
  if (!apiKey || !query.trim()) return EMPTY_LOOKUP;

  try {
    const response = await fetchWithTimeout('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'cl', hl: 'es', num: 5 }),
    }, 8_000);
    if (response.status === 401 || response.status === 403) return { warning: 'Serper rechazó la API key configurada.' };
    if (!response.ok) return { warning: `Serper respondió HTTP ${response.status}.` };

    const payload = record(await response.json().catch(() => ({})));
    const organic = list(payload.organic).slice(0, 5).map(record);
    if (!organic.length) return EMPTY_LOOKUP;

    const sources: ProductIntelligenceSource[] = organic.slice(0, 3).map((item) => ({
      provider: 'serper',
      label: clean(item.title, 180) || 'Resultado web',
      url: clean(item.link, 2000) || undefined,
      detail: clean(item.snippet, 300) || 'Resultado de búsqueda web',
      exact: false,
    }));
    const first = organic[0];

    return {
      draft: {
        provider: 'serper',
        name: clean(first.title, 220),
        description: clean(first.snippet, 1000),
        confidence: 0.5,
        sources,
      },
      context: organic
        .map((item) => `${clean(item.title, 220)} — ${clean(item.snippet, 500)}`)
        .filter(Boolean)
        .join('\n'),
    };
  } catch (error) {
    return {
      warning: error instanceof Error && error.name === 'AbortError'
        ? 'La búsqueda web tardó demasiado en responder.'
        : 'No se pudo consultar la búsqueda web.',
    };
  }
}

function parseAiJson(text: string): JsonRecord {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return record(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return record(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        return {};
      }
    }
    return {};
  }
}

function aiDraftFromJson(payload: JsonRecord, provider: 'gemini' | 'openrouter'): ProviderDraft | null {
  const attributes: Record<string, string> = {};
  if (Array.isArray(payload.attributes)) {
    for (const entry of payload.attributes) {
      const item = record(entry);
      const name = clean(item.name, 120);
      const value = clean(item.value, 400);
      if (name && value) attributes[name] = value;
    }
  } else {
    for (const [key, value] of Object.entries(record(payload.attributes))) {
      const text = clean(value, 400);
      if (key && text) attributes[clean(key, 120)] = text;
    }
  }

  const draft: ProviderDraft = {
    provider,
    name: clean(payload.name, 240),
    brand: clean(payload.brand, 160),
    model: clean(payload.model, 160),
    description: clean(payload.description, 2200),
    sku: clean(payload.sku || payload.part_number, 128),
    ean: clean(payload.ean || payload.gtin || payload.upc, 64),
    category: clean(payload.category, 180),
    attributes,
    confidence: clampConfidence(payload.confidence, 0.68),
    sources: [{
      provider,
      label: provider === 'gemini' ? 'Gemini Vision' : 'OpenRouter Vision',
      detail: 'Datos extraídos de la fotografía del producto',
      exact: false,
    }],
  };
  return draft.name || draft.brand || draft.model || draft.ean ? draft : null;
}

function buildVisionPrompt(code: string, externalContext: string) {
  return `Actúa como asistente profesional de recepción de inventario para una empresa de construcción y ferretería en Chile.
Analiza la fotografía del producto y extrae solamente datos que puedas observar o sostener con alta probabilidad. No inventes precio, stock ni fabricante.
Si un campo no es visible o no es razonablemente identificable, déjalo vacío.
Código escaneado actual: ${code || 'sin código'}.
${externalContext ? `Contexto encontrado en fuentes externas (úsalo solo para corroborar; puede contener errores):\n${externalContext}` : ''}
Devuelve EXCLUSIVAMENTE JSON válido con esta forma:
{
  "name":"nombre comercial claro",
  "brand":"marca",
  "model":"modelo",
  "description":"descripción corta y objetiva",
  "sku":"SKU, MPN o part number visible",
  "ean":"EAN/UPC/GTIN visible",
  "category":"categoría genérica",
  "confidence":0.0,
  "attributes":[{"name":"atributo","value":"valor"}]
}
La confianza debe estar entre 0 y 1. Prioriza texto visible en etiqueta, envase, logotipo, modelo, voltaje, medidas, color, capacidad y especificaciones técnicas.`;
}

async function analyzeGemini(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string,
  prompt: string,
): Promise<ProviderDraft | null> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: 1600,
        },
      }),
    },
    28_000,
  );

  const payload = record(await response.json().catch(() => ({})));
  if (!response.ok) {
    const message = clean(record(payload.error).message, 500) || `Gemini HTTP ${response.status}`;
    throw new Error(message);
  }

  const candidate = record(list(payload.candidates)[0]);
  const content = record(candidate.content);
  const text = list(content.parts)
    .map((part) => clean(record(part).text, 10000))
    .filter(Boolean)
    .join('\n');
  return aiDraftFromJson(parseAiJson(text), 'gemini');
}

function openRouterText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => {
      if (typeof part === 'string') return part;
      return clean(record(part).text, 10000);
    })
    .filter(Boolean)
    .join('\n');
}

async function analyzeOpenRouter(
  apiKey: string,
  model: string,
  siteUrl: string,
  appName: string,
  mimeType: string,
  base64: string,
  prompt: string,
): Promise<ProviderDraft | null> {
  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.1,
    max_tokens: 1600,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    }],
  };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (siteUrl) headers['HTTP-Referer'] = siteUrl;
  if (appName) headers['X-Title'] = appName;

  let response = await fetchWithTimeout(
    'https://openrouter.ai/api/v1/chat/completions',
    { method: 'POST', headers, body: JSON.stringify(requestBody) },
    30_000,
  );

  if (!response.ok && response.status === 400) {
    const retryBody = { ...requestBody };
    delete retryBody.response_format;
    response = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      { method: 'POST', headers, body: JSON.stringify(retryBody) },
      30_000,
    );
  }

  const payload = record(await response.json().catch(() => ({})));
  if (!response.ok) {
    const message = clean(record(payload.error).message, 500) || `OpenRouter HTTP ${response.status}`;
    throw new Error(message);
  }

  const choice = record(list(payload.choices)[0]);
  const message = record(choice.message);
  return aiDraftFromJson(parseAiJson(openRouterText(message.content)), 'openrouter');
}

export async function getProductIntelligenceCapabilities(
  tenantId: string,
): Promise<ProductIntelligenceCapabilities> {
  const [ml, gemini, openrouter, serper, cloudinary] = await Promise.all([
    readTenantIntegration(tenantId, 'mercadolibre', ['access_token']),
    readTenantIntegration(tenantId, 'gemini', ['api_key']),
    readTenantIntegration(tenantId, 'openrouter', ['api_key']),
    readTenantIntegration(tenantId, 'serper', ['api_key']),
    readTenantIntegration(tenantId, 'cloudinary', ['cloud_name', 'api_key', 'api_secret']),
  ]);

  return {
    upcitemdb: true,
    mercadolibre: ml.ready,
    gemini: gemini.ready,
    openrouter: openrouter.ready,
    serper: serper.ready,
    ai: gemini.ready || openrouter.ready,
    webSearch: ml.ready || serper.ready,
    cloudinary: cloudinary.ready,
  };
}

export async function identifyProductByCode(tenantId: string, code: string) {
  const normalized = code.trim().slice(0, 512);
  if (!normalized) {
    return {
      found: false,
      candidate: null,
      warnings: ['Falta el código a consultar.'],
      capabilities: await getProductIntelligenceCapabilities(tenantId),
      cached: false,
    };
  }

  const cacheKey = `${tenantId}:${normalized}`;
  const cached = codeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      found: Boolean(cached.candidate),
      candidate: cached.candidate,
      warnings: cached.warnings,
      capabilities: await getProductIntelligenceCapabilities(tenantId),
      cached: true,
    };
  }

  const [mlIntegration, serperIntegration] = await Promise.all([
    readTenantIntegration(tenantId, 'mercadolibre', ['access_token']),
    readTenantIntegration(tenantId, 'serper', ['api_key']),
  ]);
  const exact = isUniversalCode(normalized);

  const upcPromise: Promise<LookupResult> = lookupUpcItemDb(normalized);
  const mlPromise: Promise<LookupResult> = mlIntegration.ready
    ? lookupMercadoLibre(mlIntegration.values.access_token, normalized, exact)
    : Promise.resolve(EMPTY_LOOKUP);
  const [upcResult, mlResult] = await Promise.all([upcPromise, mlPromise]);

  const warnings = [upcResult.warning, mlResult.warning]
    .filter((value): value is string => Boolean(value));
  const drafts = [upcResult.draft, mlResult.draft]
    .filter((value): value is ProviderDraft => Boolean(value));

  if (!drafts.length && serperIntegration.ready) {
    const web = await searchSerper(serperIntegration.values.api_key, `"${normalized}" producto Chile`);
    if (web.warning) warnings.push(web.warning);
    if (web.draft) drafts.push(web.draft);
  }

  const candidate = mergeDrafts(drafts);
  codeCache.set(cacheKey, {
    expiresAt: Date.now() + CODE_CACHE_TTL_MS,
    candidate,
    warnings,
  });

  return {
    found: Boolean(candidate),
    candidate,
    warnings,
    capabilities: await getProductIntelligenceCapabilities(tenantId),
    cached: false,
  };
}

export async function identifyProductFromPhoto(
  tenantId: string,
  input: { code?: string; mimeType: string; base64: string },
) {
  const code = clean(input.code, 512);
  const warnings: string[] = [];
  const [gemini, openrouter, ml, serper] = await Promise.all([
    readTenantIntegration(tenantId, 'gemini', ['api_key']),
    readTenantIntegration(tenantId, 'openrouter', ['api_key']),
    readTenantIntegration(tenantId, 'mercadolibre', ['access_token']),
    readTenantIntegration(tenantId, 'serper', ['api_key']),
  ]);

  let onlineCandidate: ProductIntelligenceCandidate | null = null;
  let webContext = '';
  if (code) {
    const online = await identifyProductByCode(tenantId, code);
    onlineCandidate = online.candidate;
    warnings.push(...online.warnings);
    if (onlineCandidate) {
      webContext = [
        onlineCandidate.name,
        onlineCandidate.brand,
        onlineCandidate.model,
        onlineCandidate.description,
      ].filter(Boolean).join(' · ');
    }
  }

  const prompt = buildVisionPrompt(code, webContext);
  let aiDraft: ProviderDraft | null = null;
  let aiProvider: 'gemini' | 'openrouter' | null = null;

  if (gemini.ready) {
    try {
      const model = gemini.values.modelo || gemini.values.model || 'gemini-2.5-flash';
      aiDraft = await analyzeGemini(
        gemini.values.api_key,
        model,
        input.mimeType,
        input.base64,
        prompt,
      );
      if (aiDraft) aiProvider = 'gemini';
    } catch (error) {
      warnings.push(`Gemini no pudo analizar la foto: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  if (!aiDraft && openrouter.ready) {
    try {
      const model = openrouter.values.modelo || openrouter.values.model || 'google/gemini-2.5-flash';
      aiDraft = await analyzeOpenRouter(
        openrouter.values.api_key,
        model,
        openrouter.values.site_url || 'https://www.solucionesfabrick.com',
        openrouter.values.app_name || 'Soluciones Fabrick Inventario',
        input.mimeType,
        input.base64,
        prompt,
      );
      if (aiDraft) aiProvider = 'openrouter';
    } catch (error) {
      warnings.push(`OpenRouter no pudo analizar la foto: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  if (!aiDraft) {
    return {
      ok: false as const,
      code: 'AI_NOT_AVAILABLE',
      error: gemini.ready || openrouter.ready
        ? 'Los proveedores de IA configurados no pudieron analizar esta fotografía.'
        : 'Configura Gemini u OpenRouter en Integraciones para analizar fotografías.',
      warnings,
      candidate: onlineCandidate,
      capabilities: await getProductIntelligenceCapabilities(tenantId),
    };
  }

  const drafts: ProviderDraft[] = [aiDraft];
  if (onlineCandidate) {
    drafts.push({
      provider: onlineCandidate.sources[0]?.provider ?? 'upcitemdb',
      name: onlineCandidate.name,
      brand: onlineCandidate.brand,
      model: onlineCandidate.model,
      description: onlineCandidate.description,
      sku: onlineCandidate.sku,
      ean: onlineCandidate.ean,
      category: onlineCandidate.category,
      referenceImageUrl: onlineCandidate.referenceImageUrl,
      attributes: onlineCandidate.attributes,
      confidence: onlineCandidate.confidence,
      sources: onlineCandidate.sources,
    });
  }

  const query = [
    clean(aiDraft.brand, 160),
    clean(aiDraft.model, 160),
    clean(aiDraft.name, 240),
  ].filter(Boolean).join(' ').trim();

  if (query) {
    const mlPromise: Promise<LookupResult> = ml.ready
      ? lookupMercadoLibre(ml.values.access_token, query, false)
      : Promise.resolve(EMPTY_LOOKUP);
    const webPromise: Promise<LookupResult> = serper.ready
      ? searchSerper(serper.values.api_key, `${query} Chile`)
      : Promise.resolve(EMPTY_LOOKUP);
    const [mlResult, webResult] = await Promise.all([mlPromise, webPromise]);

    if (mlResult.warning) warnings.push(mlResult.warning);
    if (webResult.warning) warnings.push(webResult.warning);
    if (mlResult.draft) drafts.push(mlResult.draft);
    if (webResult.draft) drafts.push(webResult.draft);
  }

  const candidate = mergeDrafts(drafts);
  if (candidate) {
    const aiName = clean(aiDraft.name, 240);
    const aiBrand = clean(aiDraft.brand, 160);
    const aiModel = clean(aiDraft.model, 160);
    const aiDescription = clean(aiDraft.description, 2200);
    const aiSku = clean(aiDraft.sku, 128);
    const aiEan = clean(aiDraft.ean, 64);
    const aiCategory = clean(aiDraft.category, 180);
    if (aiName) candidate.name = aiName;
    if (aiBrand) candidate.brand = aiBrand;
    if (aiModel) candidate.model = aiModel;
    if (aiDescription) candidate.description = aiDescription;
    if (aiSku) candidate.sku = aiSku;
    if (aiEan) candidate.ean = aiEan;
    if (aiCategory) candidate.category = aiCategory;
  }

  return {
    ok: true as const,
    provider: aiProvider,
    candidate,
    warnings,
    capabilities: await getProductIntelligenceCapabilities(tenantId),
  };
}
