/**
 * Lightweight schema validator — no external dependencies.
 *
 * Usage:
 *   import { v, parse, validationError } from '@/lib/validate';
 *
 *   const schema = {
 *     name:  v.string({ required: true, max: 255 }),
 *     email: v.email({ required: true }),
 *     price: v.number({ min: 0 }),
 *   };
 *
 *   const result = parse(schema, body);
 *   if (!result.ok) return validationError(result.errors);
 *   const { name, email, price } = result.data;
 *
 * Key behaviour:
 *  - Unknown fields are STRIPPED from result.data (prevents raw-body-to-DB injection).
 *  - Optional fields that are absent produce `undefined` in result.data (omitted).
 *  - Returns all errors at once, not just the first.
 */
import { NextResponse } from 'next/server';

// ── Field definition types ────────────────────────────────────────────────────

export interface StringField {
  type: 'string';
  required?: boolean;
  min?: number;
  max?: number;
  email?: boolean;
  url?: boolean;
  enum?: readonly string[];
  trim?: boolean;
}

export interface NumberField {
  type: 'number';
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface BooleanField {
  type: 'boolean';
  required?: boolean;
}

export interface ArrayField {
  type: 'array';
  required?: boolean;
  maxItems?: number;
  of?: FieldDef;
}

export interface ObjectField {
  type: 'object';
  required?: boolean;
  shape?: Schema;
}

export interface AnyField {
  type: 'any';
  required?: boolean;
}

export type FieldDef =
  | StringField
  | NumberField
  | BooleanField
  | ArrayField
  | ObjectField
  | AnyField;

export type Schema = Record<string, FieldDef>;

// ── Result types ──────────────────────────────────────────────────────────────

export type ParseOk  = { ok: true;  data: Record<string, unknown> };
export type ParseErr = { ok: false; errors: string[] };
export type ParseResult = ParseOk | ParseErr;

// ── Field builders (shorthand for defining schemas) ───────────────────────────

export const v = {
  string:  (opts?: Omit<StringField,  'type'>): StringField  => ({ type: 'string',  trim: true, ...opts }),
  number:  (opts?: Omit<NumberField,  'type'>): NumberField  => ({ type: 'number',  ...opts }),
  boolean: (opts?: Omit<BooleanField, 'type'>): BooleanField => ({ type: 'boolean', ...opts }),
  array:   (opts?: Omit<ArrayField,   'type'>): ArrayField   => ({ type: 'array',   ...opts }),
  object:  (opts?: Omit<ObjectField,  'type'>): ObjectField  => ({ type: 'object',  ...opts }),
  any:     (opts?: Omit<AnyField,     'type'>): AnyField     => ({ type: 'any',     ...opts }),
  /** Shorthand for a required string that must pass a loose email regex. */
  email:   (opts?: Omit<StringField,  'type' | 'email'>): StringField => ({ type: 'string', trim: true, email: true, ...opts }),
  /** Shorthand for a required string that must be a valid https:// URL. */
  url:     (opts?: Omit<StringField,  'type' | 'url'>): StringField   => ({ type: 'string', trim: true, url: true, ...opts }),
  /** Shorthand for a string restricted to a fixed set of values. */
  enum:    (values: readonly string[], opts?: Omit<StringField, 'type' | 'enum'>): StringField => ({ type: 'string', enum: values, ...opts }),
};

// ── Core parser ───────────────────────────────────────────────────────────────

/**
 * Validates `input` against `schema`. Returns `{ ok: true, data }` where
 * `data` contains only the fields declared in the schema (unknown keys are
 * stripped). Returns `{ ok: false, errors }` with one message per failing
 * field so the client knows exactly what to fix.
 */
export function parse(schema: Schema, input: unknown): ParseResult {
  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const raw = input as Record<string, unknown>;

  for (const [key, def] of Object.entries(schema)) {
    const value = raw[key];
    const absent = value === undefined || value === null || value === '';

    if (absent) {
      if (def.required) {
        errors.push(`"${key}" es requerido.`);
      }
      // Leave the key absent from data (don't include null/undefined).
      continue;
    }

    const result = validateField(key, value, def);
    if (result.error) {
      errors.push(result.error);
    } else {
      data[key] = result.value;
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, data };
}

// ── Individual field validator ────────────────────────────────────────────────

function validateField(
  key: string,
  value: unknown,
  def: FieldDef,
): { value?: unknown; error?: string } {
  switch (def.type) {
    case 'string': return validateString(key, value, def);
    case 'number': return validateNumber(key, value, def);
    case 'boolean': return validateBoolean(key, value, def);
    case 'array': return validateArray(key, value, def);
    case 'object': return validateObject(key, value, def);
    case 'any': return { value };
    default: return { value };
  }
}

function validateString(key: string, value: unknown, def: StringField) {
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string') return { error: `"${key}" debe ser texto.` };
  const str = def.trim === false ? raw : raw.trim();
  if (def.min !== undefined && str.length < def.min)
    return { error: `"${key}" debe tener al menos ${def.min} caracteres.` };
  if (def.max !== undefined && str.length > def.max)
    return { error: `"${key}" no puede superar ${def.max} caracteres.` };
  if (def.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
    return { error: `"${key}" no es un correo válido.` };
  if (def.url) {
    try { new URL(str); } catch { return { error: `"${key}" no es una URL válida.` }; }
  }
  if (def.enum && !def.enum.includes(str))
    return { error: `"${key}" debe ser uno de: ${def.enum.join(', ')}.` };
  return { value: str };
}

function validateNumber(key: string, value: unknown, def: NumberField) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || isNaN(n)) return { error: `"${key}" debe ser un número.` };
  if (def.integer && !Number.isInteger(n)) return { error: `"${key}" debe ser un entero.` };
  if (def.min !== undefined && n < def.min) return { error: `"${key}" debe ser ≥ ${def.min}.` };
  if (def.max !== undefined && n > def.max) return { error: `"${key}" debe ser ≤ ${def.max}.` };
  return { value: n };
}

function validateBoolean(key: string, value: unknown, _def: BooleanField) {
  if (typeof value === 'boolean') return { value };
  if (value === 'true')  return { value: true };
  if (value === 'false') return { value: false };
  return { error: `"${key}" debe ser true o false.` };
}

function validateArray(key: string, value: unknown, def: ArrayField) {
  if (!Array.isArray(value)) return { error: `"${key}" debe ser un arreglo.` };
  if (def.maxItems !== undefined && value.length > def.maxItems)
    return { error: `"${key}" no puede tener más de ${def.maxItems} elementos.` };
  if (!def.of) return { value };
  const items: unknown[] = [];
  for (let i = 0; i < value.length; i++) {
    const r = validateField(`${key}[${i}]`, value[i], def.of);
    if (r.error) return { error: r.error };
    items.push(r.value);
  }
  return { value: items };
}

function validateObject(key: string, value: unknown, def: ObjectField) {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { error: `"${key}" debe ser un objeto.` };
  if (!def.shape) return { value };
  const nested = parse(def.shape, value);
  if (!nested.ok) return { error: nested.errors[0] };
  return { value: nested.data };
}

// ── Response helper ───────────────────────────────────────────────────────────

/** Standard 422 response listing every validation failure. */
export function validationError(errors: string[]): Response {
  return NextResponse.json(
    { error: 'Datos inválidos.', details: errors },
    { status: 422 },
  ) as unknown as Response;
}
