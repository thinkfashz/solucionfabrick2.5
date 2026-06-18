export type ProductImportSource = 'json' | 'csv' | 'table' | 'google_sheets';
export type ProductImportMode = 'insert' | 'upsert';

export interface ParsedImportProduct {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  stock?: number | null;
  image_url?: string | null;
  category_id?: string | null;
  tagline?: string | null;
  activo?: boolean;
  featured?: boolean;
  delivery_days?: number | null;
  discount_percentage?: number | null;
  source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
  supplier_price?: number | null;
  supplier_currency?: string | null;
  shipping_mode?: string | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
}

export interface ProductImportParseResult {
  products: ParsedImportProduct[];
  errors: Array<{ row: number; message: string }>;
}

const FIELD_ALIASES: Record<string, keyof ParsedImportProduct> = {
  id: 'id', sku: 'id', product_id: 'id', producto_id: 'id',
  name: 'name', nombre: 'name', producto: 'name', product: 'name', titulo: 'name', title: 'name',
  description: 'description', descripcion: 'description', detalle: 'description', descripcion_larga: 'description',
  price: 'price', precio: 'price', valor: 'price', precio_venta: 'price', venta: 'price',
  stock: 'stock', cantidad: 'stock', inventario: 'stock',
  image: 'image_url', img: 'image_url', imagen: 'image_url', image_url: 'image_url', imagen_url: 'image_url', url_imagen: 'image_url',
  category: 'category_id', categoria: 'category_id', category_id: 'category_id',
  tagline: 'tagline', subtitulo: 'tagline', slogan: 'tagline',
  active: 'activo', activo: 'activo', visible: 'activo',
  featured: 'featured', destacado: 'featured',
  delivery_days: 'delivery_days', dias_envio: 'delivery_days', entrega_dias: 'delivery_days',
  discount: 'discount_percentage', descuento: 'discount_percentage', discount_percentage: 'discount_percentage',
  source: 'source', origen: 'source', source_url: 'source_url', url_proveedor: 'source_url', proveedor_url: 'source_url',
  source_id: 'source_id', id_proveedor: 'source_id', supplier_price: 'supplier_price', precio_proveedor: 'supplier_price', costo: 'supplier_price', costo_compra: 'supplier_price',
  supplier_currency: 'supplier_currency', moneda_proveedor: 'supplier_currency',
  shipping_mode: 'shipping_mode', modo_envio: 'shipping_mode', shipping_fee: 'shipping_fee', envio: 'shipping_fee', costo_envio: 'shipping_fee', tarifa_envio: 'shipping_fee',
  shipping_weight_kg: 'shipping_weight_kg', peso_kg: 'shipping_weight_kg', shipping_dimensions: 'shipping_dimensions', dimensiones_envio: 'shipping_dimensions',
};

function normalizeHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

function parseMoney(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'si', 'sí', 'true', 'activo', 'yes', 'y', 'visible'].includes(raw);
}

function cleanText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { cells.push(current.trim()); current = ''; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(content: string) {
  const first = content.split(/\r?\n/).find((line) => line.trim()) || '';
  const tabs = (first.match(/\t/g) || []).length;
  const semis = (first.match(/;/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  if (tabs >= semis && tabs >= commas) return '\t';
  if (semis > commas) return ';';
  return ',';
}

export function parseDelimitedProducts(content: string): ProductImportParseResult {
  const delimiter = detectDelimiter(content);
  const rows = content.split(/\r?\n/).filter((line) => line.trim()).map((line) => splitDelimitedLine(line, delimiter));
  if (rows.length < 2) return { products: [], errors: [{ row: 0, message: 'La tabla debe tener encabezados y al menos una fila.' }] };
  const headers = rows[0].map((h) => FIELD_ALIASES[normalizeHeader(h)] || normalizeHeader(h));
  const objects = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, idx) => [header, row[idx] ?? ''])));
  return normalizeImportRows(objects);
}

export function parseJsonProducts(content: string): ProductImportParseResult {
  try {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.products) ? parsed.products : Array.isArray(parsed?.items) ? parsed.items : [];
    if (!rows.length) return { products: [], errors: [{ row: 0, message: 'El JSON debe ser un array o tener products/items.' }] };
    return normalizeImportRows(rows);
  } catch (err) {
    return { products: [], errors: [{ row: 0, message: err instanceof Error ? err.message : 'JSON inválido.' }] };
  }
}

export function normalizeImportRows(rows: unknown[]): ProductImportParseResult {
  const products: ParsedImportProduct[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  rows.forEach((raw, index) => {
    const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const alias = FIELD_ALIASES[normalizeHeader(key)] || normalizeHeader(key);
      mapped[alias] = value;
    }
    const name = cleanText(mapped.name);
    const price = parseMoney(mapped.price);
    if (!name) { errors.push({ row: index + 2, message: 'Falta nombre del producto.' }); return; }
    if (price <= 0) { errors.push({ row: index + 2, message: `Precio inválido para ${name}.` }); return; }
    products.push({
      id: cleanText(mapped.id) || undefined,
      name,
      description: cleanText(mapped.description),
      price,
      stock: parseNumber(mapped.stock) == null ? null : Math.round(parseNumber(mapped.stock) || 0),
      image_url: cleanText(mapped.image_url),
      category_id: cleanText(mapped.category_id),
      tagline: cleanText(mapped.tagline),
      activo: parseBool(mapped.activo, true),
      featured: parseBool(mapped.featured, false),
      delivery_days: parseNumber(mapped.delivery_days) == null ? null : Math.round(parseNumber(mapped.delivery_days) || 0),
      discount_percentage: parseNumber(mapped.discount_percentage),
      source: cleanText(mapped.source),
      source_url: cleanText(mapped.source_url),
      source_id: cleanText(mapped.source_id),
      supplier_price: parseMoney(mapped.supplier_price) || null,
      supplier_currency: cleanText(mapped.supplier_currency),
      shipping_mode: cleanText(mapped.shipping_mode),
      shipping_fee: parseMoney(mapped.shipping_fee) || null,
      shipping_weight_kg: parseNumber(mapped.shipping_weight_kg),
      shipping_dimensions: cleanText(mapped.shipping_dimensions),
    });
  });
  return { products, errors };
}

export function googleSheetCsvUrl(url: string) {
  const raw = url.trim();
  if (!raw) throw new Error('URL de Google Sheets requerida.');
  if (/output=csv|format=csv/.test(raw)) return raw;
  const id = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) throw new Error('No pude detectar el ID del Google Sheet. Comparte el link público de la hoja.');
  const gid = raw.match(/[?&]gid=(\d+)/)?.[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}
