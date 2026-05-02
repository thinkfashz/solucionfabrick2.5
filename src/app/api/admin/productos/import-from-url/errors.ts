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
  if (/42703/.test(raw)) return true;
  const colPattern = ORIGIN_COLUMNS.join('|');
  // PostgreSQL: `column "source_url" does not exist`
  if (new RegExp(`column\\s+["'\`]?(?:${colPattern})["'\`]?\\s+does\\s+not\\s+exist`, 'i').test(raw)) {
    return true;
  }
  // PostgREST schema-cache flavour. Quotes vary by client (single,
  // double, backtick, none), so we accept any of them.
  if (/could not find/.test(raw) && /schema cache/.test(raw)) {
    if (new RegExp(`["'\`]?(?:${colPattern})["'\`]?`, 'i').test(raw)) return true;
  }
  // PostgREST sometimes emits the bare error code.
  if (/pgrst204/.test(raw) && new RegExp(`(?:${colPattern})`, 'i').test(raw)) {
    return true;
  }
  return false;
}
