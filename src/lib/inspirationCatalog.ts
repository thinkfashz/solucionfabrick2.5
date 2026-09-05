import 'server-only';

import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';

export const DEFAULT_INSPIRATIONS_FOLDER = process.env.CLOUDINARY_PROJECTS_FOLDER || 'fabrick/inspiraciones';
const FALLBACK_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'disghf6xc';

// Internal image libraries may feed public page artwork, but they are not
// browsable inspiration albums. Their files stay deliverable through the CDN
// because the public pages render them directly.
export const PRIVATE_INSPIRATION_ALBUMS = new Set([
  'soluciones-constructivas-fabrick',
]);

export const INSPIRATION_CATEGORIES = [
  { key: 'cocinas', label: 'Ideas de cocina', words: ['cocina', 'kitchen', 'meson', 'mueble-cocina'] },
  { key: 'casas', label: 'Ideas de casas', words: ['casa', 'vivienda', 'fachada', 'home'] },
  { key: 'planos', label: 'Planos de casa', words: ['plano', 'planta', 'layout', 'distribucion'] },
  { key: 'banos', label: 'Ideas de baño', words: ['bano', 'baño', 'bath', 'ducha', 'wc'] },
  { key: 'muebles', label: 'Ideas de muebles', words: ['mueble', 'closet', 'rack', 'vanitorio', 'repisas'] },
  { key: 'piscinas', label: 'Piscinas', words: ['piscina', 'pool'] },
  { key: 'quinchos', label: 'Quinchos', words: ['quincho', 'barbecue', 'parrilla'] },
  { key: 'terrazas', label: 'Terrazas y patios', words: ['terraza', 'deck', 'patio'] },
  { key: 'materiales', label: 'Materiales y terminaciones', words: ['material', 'madera', 'piso', 'ceramica', 'metalcon', 'melamina', 'marmol', 'porcelanato'] },
  { key: 'remodelacion', label: 'Remodelación', words: ['remodel', 'antes', 'despues', 'renova', 'obra'] },
] as const;

export type CloudinaryContext = { custom?: Record<string, string> } | Record<string, string> | string | null | undefined;

export type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  format?: string;
  bytes?: number;
  created_at?: string;
  width?: number;
  height?: number;
  tags?: string[];
  context?: CloudinaryContext;
  folder?: string;
};

export type InspirationMetadataPayload = {
  public_id?: string;
  title?: string;
  description?: string;
  alt?: string;
  category?: string;
  album?: string;
  albumTitle?: string;
  albumDescription?: string;
  hashtags?: string[];
  albumHashtags?: string[];
  albumKeywords?: string[];
  primaryKeyword?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageSearchCaption?: string;
  interestScore?: number;
  interestLabel?: string;
  organizationSummary?: string;
  sortOrder?: number;
  albumCover?: boolean;
};

export type InspirationAsset = {
  id: string;
  public_id: string;
  title: string;
  description: string;
  alt: string;
  category: string;
  album: string;
  album_title: string;
  album_description: string;
  album_hashtags: string[];
  album_keywords: string[];
  album_primary_keyword: string;
  album_seo_title: string;
  album_seo_description: string;
  album_image_caption: string;
  album_interest_score: number;
  album_interest_label: string;
  album_organization: string;
  album_cover: boolean;
  sort_order: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  format: string;
  tags: string[];
  created_at: string;
  folder: string;
  fallback?: boolean;
};

export type InspirationAlbum = {
  key: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  count: number;
  hashtags: string[];
  keywords: string[];
  primaryKeyword: string;
  seoTitle: string;
  seoDescription: string;
  imageSearchCaption: string;
  interestScore: number;
  interestLabel: string;
  organizationSummary: string;
};

export type InspirationCatalog = {
  assets: InspirationAsset[];
  albums: InspirationAlbum[];
  categories: Array<{ key: string; label: string }>;
  source: 'cloudinary' | 'fallback';
  folder: string;
  nextCursor: string | null;
  warning?: string;
  error?: string;
};

export function isPrivateInspirationAlbum(album: string | null | undefined) {
  return PRIVATE_INSPIRATION_ALBUMS.has(cleanSlug(album, ''));
}

export function publicInspirationCatalog(catalog: InspirationCatalog): InspirationCatalog {
  const assets = catalog.assets.filter((asset) => !isPrivateInspirationAlbum(asset.album));
  return {
    ...catalog,
    assets,
    albums: catalog.albums.filter((album) => !isPrivateInspirationAlbum(album.key)),
  };
}

export function cleanFolder(input: string | null | undefined) {
  const value = (input || DEFAULT_INSPIRATIONS_FOLDER)
    .replace(/[^a-zA-Z0-9_/-]/g, '')
    .replace(/\/{2,}/g, '/')
    .slice(0, 160);
  return value || DEFAULT_INSPIRATIONS_FOLDER;
}

export function cleanSlug(input: unknown, fallback = 'general') {
  const value = String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return value || fallback;
}

export function cleanText(input: FormDataEntryValue | string | null | undefined, max = 500) {
  return String(input || '').trim().replace(/[|]/g, ' ').slice(0, max);
}

export function cleanNumber(value: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, Math.floor(number))) : fallback;
}

function cloudinaryTransform(url: string, transform: string) {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function contextRecord(context: CloudinaryContext): Record<string, string> {
  if (!context || typeof context === 'string') return {};
  if ('custom' in context && context.custom && typeof context.custom === 'object') return context.custom;
  return context as Record<string, string>;
}

function inferCategory(resource: CloudinaryResource, context = contextRecord(resource.context)) {
  if (context.category) return cleanSlug(context.category, 'ideas');
  const haystack = normalize([resource.public_id, resource.folder || '', ...(resource.tags || []), ...Object.values(context)].join(' '));
  return INSPIRATION_CATEGORIES.find((category) => category.words.some((word) => haystack.includes(normalize(word))))?.key || 'ideas';
}

function titleFromPublicId(publicId: string) {
  const last = publicId.split('/').pop() || publicId;
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 100);
}

function albumFromResource(resource: CloudinaryResource, context: Record<string, string>) {
  if (context.album) return cleanSlug(context.album);
  const pieces = resource.public_id.split('/');
  const marker = pieces.indexOf('inspiraciones');
  return cleanSlug(marker >= 0 ? pieces[marker + 1] : pieces.at(-2), 'general');
}

export function parseTags(value: string | undefined) {
  return Array.from(new Set(String(value || '')
    .split(/[\s,]+/)
    .map((tag) => cleanSlug(tag.replace(/^#/, ''), ''))
    .filter(Boolean)))
    .slice(0, 24);
}

export function contextString(payload: InspirationMetadataPayload) {
  const entries = {
    title: cleanText(payload.title, 120),
    caption: cleanText(payload.title, 120),
    description: cleanText(payload.description, 900),
    alt: cleanText(payload.alt || payload.title, 180),
    category: cleanSlug(payload.category, 'ideas'),
    album: cleanSlug(payload.album, 'general'),
    album_title: cleanText(payload.albumTitle || String(payload.album || ''), 120),
    album_description: cleanText(payload.albumDescription, 900),
    album_hashtags: (payload.albumHashtags || []).map((tag) => cleanSlug(String(tag).replace(/^#/, ''), '')).filter(Boolean).slice(0, 24).join(','),
    album_keywords: (payload.albumKeywords || []).map((tag) => cleanText(String(tag), 80)).filter(Boolean).slice(0, 18).join(','),
    album_primary_keyword: cleanText(payload.primaryKeyword, 100),
    album_seo_title: cleanText(payload.seoTitle, 70),
    album_seo_description: cleanText(payload.seoDescription, 180),
    album_image_caption: cleanText(payload.imageSearchCaption, 240),
    album_interest_score: String(cleanNumber(payload.interestScore, 0, 5)),
    album_interest_label: cleanText(payload.interestLabel, 40),
    album_organization: cleanText(payload.organizationSummary, 500),
    sort_order: String(cleanNumber(payload.sortOrder, 0)),
    album_cover: payload.albumCover ? 'true' : 'false',
  };
  return Object.entries(entries)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

export function tagString(payload: InspirationMetadataPayload) {
  const tags = [
    ...(payload.hashtags || []),
    ...(payload.albumHashtags || []),
    ...(payload.albumKeywords || []),
    payload.primaryKeyword || '',
    cleanSlug(payload.category, ''),
    cleanSlug(payload.album, ''),
  ].map((tag) => cleanSlug(String(tag).replace(/^#/, ''), '')).filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 30).join(',');
}

export function normalizeInspirationAsset(resource: CloudinaryResource): InspirationAsset {
  const context = contextRecord(resource.context);
  const category = inferCategory(resource, context);
  const album = albumFromResource(resource, context);
  const title = context.caption || context.title || context.alt || titleFromPublicId(resource.public_id);
  const albumTitle = context.album_title || album.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  return {
    id: resource.public_id,
    public_id: resource.public_id,
    title,
    description: context.description || '',
    alt: context.alt || title,
    category,
    album,
    album_title: albumTitle,
    album_description: context.album_description || '',
    album_hashtags: parseTags(context.album_hashtags),
    album_keywords: String(context.album_keywords || '').split(',').map((keyword) => keyword.trim()).filter(Boolean).slice(0, 18),
    album_primary_keyword: context.album_primary_keyword || '',
    album_seo_title: context.album_seo_title || '',
    album_seo_description: context.album_seo_description || '',
    album_image_caption: context.album_image_caption || '',
    album_interest_score: cleanNumber(context.album_interest_score, 0, 5),
    album_interest_label: context.album_interest_label || '',
    album_organization: context.album_organization || '',
    album_cover: context.album_cover === 'true',
    sort_order: cleanNumber(context.sort_order, 0),
    url: cloudinaryTransform(resource.secure_url, 'f_auto,q_auto,w_1800'),
    thumb: cloudinaryTransform(resource.secure_url, 'f_auto,q_auto,w_820'),
    width: resource.width || 1200,
    height: resource.height || 900,
    format: resource.format || '',
    tags: resource.tags || [],
    created_at: resource.created_at || '',
    folder: resource.folder || '',
  };
}

export function fallbackInspirationAssets(): InspirationAsset[] {
  const base = `https://res.cloudinary.com/${FALLBACK_CLOUD_NAME}/image/upload`;
  const id = 'fabrick/general/oiol0ydk8yc48f8p6iza';
  return [{
    id,
    public_id: id,
    title: 'Inspiración para transformar tu espacio',
    description: 'Referencia visual para conversar sobre distribución, materiales y terminaciones.',
    alt: 'Inspiración de diseño y remodelación para el hogar en Chile',
    category: 'remodelacion',
    album: 'ideas-generales',
    album_title: 'Ideas generales para remodelar',
    album_description: 'Colección visual para comparar estilo, distribución, materialidad y terminaciones antes de adaptar una idea al espacio real.',
    album_hashtags: ['inspiracion', 'remodelacion', 'solucionesfabrick'],
    album_keywords: ['ideas de remodelación', 'diseño de interiores', 'mejoras para el hogar'],
    album_primary_keyword: 'ideas de remodelación',
    album_seo_title: 'Ideas de remodelación para el hogar | Soluciones Fabrick',
    album_seo_description: 'Explora ideas de remodelación, distribución y terminaciones para planificar una mejora adaptada a tu vivienda.',
    album_image_caption: 'Ideas visuales de remodelación y diseño interior para adaptar a viviendas en Chile.',
    album_interest_score: 4,
    album_interest_label: 'Alto',
    album_organization: 'Orden sugerido desde una vista general hacia los detalles de terminación.',
    album_cover: true,
    sort_order: 0,
    url: `${base}/f_auto,q_auto,w_1400/${id}.png`,
    thumb: `${base}/f_auto,q_auto,w_720/${id}.png`,
    width: 1200,
    height: 900,
    format: 'png',
    tags: ['inspiracion', 'remodelacion'],
    created_at: new Date().toISOString(),
    folder: 'fabrick/general',
    fallback: true,
  }];
}

export function inspirationCategoryOptions() {
  return [{ key: 'ideas', label: 'Todas las ideas' }, ...INSPIRATION_CATEGORIES.map(({ key, label }) => ({ key, label }))];
}

export function buildInspirationAlbums(assets: InspirationAsset[]): InspirationAlbum[] {
  const map = new Map<string, InspirationAlbum>();
  for (const asset of assets) {
    const current = map.get(asset.album);
    const description = asset.album_description || asset.description || 'Álbum visual de ideas para conversar, adaptar y cotizar.';
    const hashtags = asset.album_hashtags.length ? asset.album_hashtags : asset.tags;
    const keywords = asset.album_keywords.length ? asset.album_keywords : hashtags.map((tag) => tag.replace(/-/g, ' '));
    if (current) {
      current.count += 1;
      current.hashtags = Array.from(new Set([...current.hashtags, ...hashtags])).slice(0, 18);
      current.keywords = Array.from(new Set([...current.keywords, ...keywords])).slice(0, 18);
      if (asset.album_cover) current.cover = asset.thumb;
      if (!current.description && description) current.description = description;
      if (!current.primaryKeyword && asset.album_primary_keyword) current.primaryKeyword = asset.album_primary_keyword;
      if (!current.seoTitle && asset.album_seo_title) current.seoTitle = asset.album_seo_title;
      if (!current.seoDescription && asset.album_seo_description) current.seoDescription = asset.album_seo_description;
      if (!current.imageSearchCaption && asset.album_image_caption) current.imageSearchCaption = asset.album_image_caption;
      if (!current.interestScore && asset.album_interest_score) current.interestScore = asset.album_interest_score;
      if (!current.interestLabel && asset.album_interest_label) current.interestLabel = asset.album_interest_label;
      if (!current.organizationSummary && asset.album_organization) current.organizationSummary = asset.album_organization;
    } else {
      map.set(asset.album, {
        key: asset.album,
        title: asset.album_title,
        category: asset.category,
        description,
        cover: asset.thumb,
        count: 1,
        hashtags: [...hashtags].slice(0, 18),
        keywords: [...keywords].slice(0, 18),
        primaryKeyword: asset.album_primary_keyword || keywords[0] || '',
        seoTitle: asset.album_seo_title || '',
        seoDescription: asset.album_seo_description || '',
        imageSearchCaption: asset.album_image_caption || '',
        interestScore: asset.album_interest_score || 0,
        interestLabel: asset.album_interest_label || '',
        organizationSummary: asset.album_organization || '',
      });
    }
  }
  return Array.from(map.values()).sort((left, right) => right.interestScore - left.interestScore || left.title.localeCompare(right.title));
}

export async function loadInspirationCatalog(options: { folder?: string; maxResults?: number; nextCursor?: string } = {}): Promise<InspirationCatalog> {
  const folder = cleanFolder(options.folder);
  const maxResults = Math.min(Math.max(Number(options.maxResults || 100), 12), 100);
  const credentials = await getCloudinaryCredentials({ preferDb: true });

  if (!credentials.ready) {
    const assets = fallbackInspirationAssets();
    return {
      assets,
      albums: buildInspirationAlbums(assets),
      categories: inspirationCategoryOptions(),
      source: 'fallback',
      folder,
      nextCursor: null,
      warning: 'Cloudinary no está configurado. Configura la integración desde admin para gestionar Inspiraciones.',
    };
  }

  try {
    const apiUrl = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/resources/image/upload`);
    apiUrl.searchParams.set('max_results', String(maxResults));
    apiUrl.searchParams.set('prefix', folder);
    apiUrl.searchParams.set('tags', 'true');
    apiUrl.searchParams.set('context', 'true');
    if (options.nextCursor) apiUrl.searchParams.set('next_cursor', options.nextCursor);
    const authorization = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
    const response = await fetch(apiUrl.toString(), { headers: { Authorization: `Basic ${authorization}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Cloudinary API error ${response.status}: ${await response.text().catch(() => '')}`);
    const json = await response.json() as { resources?: CloudinaryResource[]; next_cursor?: string };
    const assets = (json.resources || [])
      .filter((item) => item.secure_url)
      .map(normalizeInspirationAsset)
      .sort((left, right) => left.album.localeCompare(right.album) || left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at));
    const finalAssets = assets.length ? assets : fallbackInspirationAssets();
    return {
      assets: finalAssets,
      albums: buildInspirationAlbums(finalAssets),
      categories: inspirationCategoryOptions(),
      source: assets.length ? 'cloudinary' : 'fallback',
      folder,
      nextCursor: json.next_cursor || null,
    };
  } catch (error) {
    const assets = fallbackInspirationAssets();
    return {
      assets,
      albums: buildInspirationAlbums(assets),
      categories: inspirationCategoryOptions(),
      source: 'fallback',
      folder,
      nextCursor: null,
      error: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.',
    };
  }
}
