/**
 * Pure helpers for `POST /api/admin/productos/import-from-url`.
 *
 * Kept in a separate module from `route.ts` because Next.js App Router
 * forbids exporting anything other than route-handler verbs and the
 * known config flags (`runtime`, `dynamic`, …) from a `route.ts` file.
 */

/**
 * Origin columns added by the `products-migrate` block in
 * `scripts/create-tables.sql`. Used by `isMissingOriginColumnError` to
 * detect "you forgot to run the migration" errors regardless of which
 * layer (PostgreSQL vs. PostgREST) raised them.
 */
const ORIGIN_COLUMNS = [
  'source',
  'source_url',
  'source_id',
  'supplier_price',
  'supplier_currency',
] as const;

// Precompiled patterns. Built once at module load so the hot path of
// `isMissingOriginColumnError` only runs `RegExp.prototype.test`.
const COLUMN_GROUP = ORIGIN_COLUMNS.join('|');
const PG_42703_PATTERN = /42703/;
const PG_COLUMN_DOES_NOT_EXIST_PATTERN = new RegExp(
  `column\\s+["'\`]?(?:${COLUMN_GROUP})["'\`]?\\s+does\\s+not\\s+exist`,
  'i',
);
const POSTGREST_COULD_NOT_FIND_PATTERN = /could not find/;
const POSTGREST_SCHEMA_CACHE_PATTERN = /schema cache/;
const POSTGREST_QUOTED_COLUMN_PATTERN = new RegExp(
  `["'\`]?(?:${COLUMN_GROUP})["'\`]?`,
  'i',
);
const POSTGREST_PGRST204_PATTERN = /pgrst204/;
const POSTGREST_BARE_COLUMN_PATTERN = new RegExp(`(?:${COLUMN_GROUP})`, 'i');

/**
 * Returns true when `message` looks like a database error caused by the
 * `products` table missing one of the origin columns. Handles both:
 *
 *   - PostgreSQL native: `column "source" does not exist` (SQLSTATE 42703)
 *   - PostgREST:         `Could not find the 'source' column of 'products' in the schema cache` (code PGRST204)
 *
 * The PostgREST flavour is what InsForge surfaces today, so missing
 * this branch sends the admin a raw 500 instead of the actionable
 * "ve a /admin/setup → Crear tablas ahora" hint.
 */
export function isMissingOriginColumnError(message: string | null | undefined): boolean {
  if (!message) return false;
  const raw = message.toLowerCase();
  // PostgreSQL flavour. SQLSTATE 42703 is "undefined_column".
  if (PG_42703_PATTERN.test(raw)) return true;
  if (PG_COLUMN_DOES_NOT_EXIST_PATTERN.test(raw)) return true;
  // PostgREST schema-cache flavour. Quotes vary by client (single,
  // double, backtick, none), so we accept any of them.
  if (
    POSTGREST_COULD_NOT_FIND_PATTERN.test(raw) &&
    POSTGREST_SCHEMA_CACHE_PATTERN.test(raw) &&
    POSTGREST_QUOTED_COLUMN_PATTERN.test(raw)
  ) {
    return true;
  }
  // PostgREST sometimes emits the bare error code.
  if (POSTGREST_PGRST204_PATTERN.test(raw) && POSTGREST_BARE_COLUMN_PATTERN.test(raw)) {
    return true;
  }
  return false;
}
