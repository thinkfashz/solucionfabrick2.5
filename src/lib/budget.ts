import 'server-only';
import { insforge } from './insforge';
import { getAdminInsforge } from './adminApi';
import { computeTotals, type QuoteLine, type Totals } from './budgetMath';

/**
 * Server-side data layer for the Cotizador (`materials` + `quotes` tables in
 * InsForge). Every reader is wrapped in try/catch and returns a safe default
 * so a DB outage never breaks the public site; mutations propagate errors to
 * the route handler so the client gets a real status code.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface MaterialRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  price: number;
  image_url: string | null;
  active: boolean;
  stock: number | null;
  position: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialInput {
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  price: number;
  image_url?: string | null;
  active?: boolean;
  stock?: number | null;
  position?: number | null;
}

export interface QuoteRow {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  region: string | null;
  notes: string | null;
  lines: QuoteLine[];
  totals: Totals;
  status: string;
  shipping_cost: number;
  installation_cost: number;
  iva_rate: number;
  total: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SaveBudgetInput {
  lines: QuoteLine[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    region?: string;
    notes?: string;
  };
  shippingCost?: number;
  installationCost?: number;
  ivaRate?: number;
  /** Optional InsForge user id (when the customer is logged in). */
  userId?: string | null;
}

const TABLE_HINT = 'Crea las tablas materials/quotes en /admin/setup.';

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/** Returns the full catalog (admin view: includes inactive). */
export async function getMaterials(): Promise<MaterialRow[]> {
  try {
    const { data, error } = await insforge.database
      .from('materials')
      .select(
        'id, name, description, category, unit, price, image_url, active, stock, position, created_at, updated_at',
      )
      .order('position', { ascending: true })
      .order('name', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as MaterialRow[]).map(normalizeMaterial);
  } catch {
    return [];
  }
}

/** Returns only active materials (public cotizador view). */
export async function getActiveMaterials(): Promise<MaterialRow[]> {
  try {
    const { data, error } = await insforge.database
      .from('materials')
      .select(
        'id, name, description, category, unit, price, image_url, active, stock, position, created_at, updated_at',
      )
      .eq('active', true)
      .order('position', { ascending: true })
      .order('name', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as MaterialRow[]).map(normalizeMaterial);
  } catch {
    return [];
  }
}

/** Returns a single quote by id, or null. */
export async function getQuoteById(id: string): Promise<QuoteRow | null> {
  if (!isUuidLike(id)) return null;
  try {
    const { data, error } = await insforge.database
      .from('quotes')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return normalizeQuote(data[0] as QuoteRow);
  } catch {
    return null;
  }
}

/** Lists quotes belonging to a given user (most recent first). */
export async function listQuotesForUser(userId: string): Promise<QuoteRow[]> {
  if (!userId) return [];
  try {
    const { data, error } = await insforge.database
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !Array.isArray(data)) return [];
    return (data as QuoteRow[]).map(normalizeQuote);
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

/** Persists a new quote. Computes totals server-side to avoid client tampering. */
export async function saveBudget(input: SaveBudgetInput): Promise<QuoteRow> {
  const lines = sanitizeLines(input.lines);
  if (lines.length === 0) throw budgetError('Tu presupuesto está vacío.', 'EMPTY_CART', 400);

  const totals = computeTotals(lines, {
    ivaRate: input.ivaRate,
    shippingCost: input.shippingCost,
    installationCost: input.installationCost,
  });

  const row = {
    user_id: input.userId ?? null,
    customer_name: input.customer?.name?.trim() || null,
    customer_email: input.customer?.email?.trim().toLowerCase() || null,
    customer_phone: input.customer?.phone?.trim() || null,
    region: input.customer?.region?.trim() || null,
    notes: input.customer?.notes?.trim() || null,
    lines,
    totals,
    status: 'open' as const,
    shipping_cost: totals.shippingCost,
    installation_cost: totals.installationCost,
    iva_rate: totals.ivaRate,
    total: totals.total,
  };

  const client = getAdminInsforge();
  const { data, error } = await client.database.from('quotes').insert([row]).select('*');
  if (error) throw budgetError(error.message || 'No se pudo guardar.', 'DB_ERROR', 500);
  const created = Array.isArray(data) ? (data[0] as QuoteRow | undefined) : undefined;
  if (!created) throw budgetError('No se devolvió la cotización guardada.', 'DB_NO_ROW', 500);
  return normalizeQuote(created);
}

/* -------------------------------------------------------------------------- */
/*  Admin material CRUD                                                       */
/* -------------------------------------------------------------------------- */

export async function createMaterial(input: MaterialInput): Promise<MaterialRow> {
  const sanitized = sanitizeMaterialInput(input);
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('materials')
    .insert([sanitized])
    .select('*');
  if (error) throw budgetError(error.message, 'DB_ERROR', 500, TABLE_HINT);
  const row = Array.isArray(data) ? (data[0] as MaterialRow | undefined) : undefined;
  if (!row) throw budgetError('No se devolvió el material creado.', 'DB_NO_ROW', 500);
  return normalizeMaterial(row);
}

export async function updateMaterial(
  id: string,
  patch: Partial<MaterialInput>,
): Promise<MaterialRow> {
  if (!isUuidLike(id)) throw budgetError('ID inválido.', 'VALIDATION', 400);
  const sanitized = sanitizeMaterialInput(patch, { partial: true });
  if (Object.keys(sanitized).length === 0) {
    throw budgetError('Nada que actualizar.', 'VALIDATION', 400);
  }
  // Touch updated_at server-side.
  (sanitized as Record<string, unknown>).updated_at = new Date().toISOString();

  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('materials')
    .update(sanitized)
    .eq('id', id)
    .select('*');
  if (error) throw budgetError(error.message, 'DB_ERROR', 500, TABLE_HINT);
  const row = Array.isArray(data) ? (data[0] as MaterialRow | undefined) : undefined;
  if (!row) throw budgetError('Material no encontrado.', 'NOT_FOUND', 404);
  return normalizeMaterial(row);
}

export async function deleteMaterial(id: string): Promise<void> {
  if (!isUuidLike(id)) throw budgetError('ID inválido.', 'VALIDATION', 400);
  const client = getAdminInsforge();
  const { error } = await client.database.from('materials').delete().eq('id', id);
  if (error) throw budgetError(error.message, 'DB_ERROR', 500, TABLE_HINT);
}

/* -------------------------------------------------------------------------- */
/*  Errors                                                                    */
/* -------------------------------------------------------------------------- */

export class BudgetError extends Error {
  code: string;
  status: number;
  hint?: string;
  constructor(message: string, code: string, status: number, hint?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}

function budgetError(message: string, code: string, status: number, hint?: string) {
  return new BudgetError(message, code, status, hint);
}

/* -------------------------------------------------------------------------- */
/*  Sanitizers                                                                */
/* -------------------------------------------------------------------------- */

const ALLOWED_CATEGORIES = new Set([
  'obra-gruesa',
  'terminaciones',
  'especialidades',
  'servicios',
  'electricidad',
  'gasfiteria',
  'climatizacion',
  'conectividad',
  'seguridad',
]);

const ALLOWED_UNITS = new Set([
  'm2',
  'ml',
  'unidad',
  'kit',
  'global',
  'instalacion',
  'equipo',
  'proyecto',
]);

function sanitizeMaterialInput(
  input: Partial<MaterialInput>,
  opts: { partial?: boolean } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if ('name' in input) {
    const name = String(input.name ?? '').trim();
    if (!opts.partial && !name) throw budgetError('El nombre es obligatorio.', 'VALIDATION', 400);
    if (name) out.name = name;
  } else if (!opts.partial) {
    throw budgetError('El nombre es obligatorio.', 'VALIDATION', 400);
  }

  if ('description' in input) out.description = stringOrNull(input.description);

  if ('category' in input) {
    const cat = String(input.category ?? '').trim().toLowerCase();
    if (cat && !ALLOWED_CATEGORIES.has(cat)) {
      throw budgetError(`Categoría no permitida: ${cat}`, 'VALIDATION', 400);
    }
    if (cat) out.category = cat;
  }

  if ('unit' in input) {
    const unit = String(input.unit ?? '').trim().toLowerCase();
    if (unit && !ALLOWED_UNITS.has(unit)) {
      throw budgetError(`Unidad no permitida: ${unit}`, 'VALIDATION', 400);
    }
    if (unit) out.unit = unit;
  }

  if ('price' in input) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      throw budgetError('Precio inválido.', 'VALIDATION', 400);
    }
    out.price = Math.round(price);
  }

  if ('image_url' in input) out.image_url = stringOrNull(input.image_url);
  if ('active' in input) out.active = Boolean(input.active);
  if ('stock' in input) {
    const v = input.stock as unknown;
    out.stock =
      v === null || v === undefined || v === ''
        ? null
        : Math.max(0, Math.floor(Number(v) || 0));
  }
  if ('position' in input) {
    const v = Number(input.position);
    out.position = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }

  return out;
}

function sanitizeLines(input: unknown): QuoteLine[] {
  if (!Array.isArray(input)) return [];
  const lines: QuoteLine[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const materialId = String(r.materialId ?? r.id ?? '').trim();
    const name = String(r.name ?? '').trim();
    const unitPrice = Number(r.unitPrice ?? r.price ?? 0);
    const quantity = Math.floor(Number(r.quantity ?? r.qty ?? 0));
    if (!materialId || !name) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    lines.push({
      materialId,
      name,
      category: r.category ? String(r.category) : undefined,
      unit: r.unit ? String(r.unit) : undefined,
      unitPrice: Math.round(unitPrice),
      quantity,
      imageUrl: r.imageUrl ? String(r.imageUrl) : undefined,
    });
  }
  return lines;
}

function stringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function isUuidLike(s: unknown): s is string {
  // RFC4122 UUID shape: 8-4-4-4-12 hex chars.
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

/* -------------------------------------------------------------------------- */
/*  Normalizers (defensive — DB may return numeric as string)                 */
/* -------------------------------------------------------------------------- */

function normalizeMaterial(r: MaterialRow): MaterialRow {
  return {
    ...r,
    price: Number(r.price) || 0,
    stock: r.stock === null || r.stock === undefined ? null : Number(r.stock),
    position: r.position === null || r.position === undefined ? null : Number(r.position),
    active: Boolean(r.active),
  };
}

function normalizeQuote(r: QuoteRow): QuoteRow {
  return {
    ...r,
    lines: Array.isArray(r.lines) ? (r.lines as QuoteLine[]) : [],
    totals: typeof r.totals === 'object' && r.totals !== null ? (r.totals as Totals) : ({} as Totals),
    shipping_cost: Number(r.shipping_cost) || 0,
    installation_cost: Number(r.installation_cost) || 0,
    iva_rate: Number(r.iva_rate) || 0.19,
    total: Number(r.total) || 0,
  };
}
