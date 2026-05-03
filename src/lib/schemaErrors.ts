/**
 * Helpers to detect schema-level Postgres errors (missing relation / missing
 * column) that surface from the InsForge SDK as plain `{ message }` strings.
 *
 * The errors come in two flavours depending on whether the request hit
 * PostgreSQL directly or went through PostgREST:
 *   - PostgreSQL direct: `relation "public.blog_posts" does not exist` (42P01)
 *                        `column "body_md" does not exist` (42703)
 *   - PostgREST:         `Could not find the table 'public.blog_posts' in the schema cache` (PGRST205)
 *                        `Could not find the 'body_md' column of 'blog_posts' in the schema cache` (PGRST204)
 *
 * Used by API routes to produce actionable hints ("Falta columna X — corre
 * /admin/setup") instead of a raw 500.
 */

const RELATION_NOT_EXIST_RX = /relation\s+"?([^"\s]+)"?\s+does not exist/i;
const COLUMN_NOT_EXIST_RX = /column\s+"?([^"\s]+)"?\s+does not exist/i;
const PGRST_TABLE_RX = /could not find the table '([^']+)'/i;
const PGRST_COLUMN_RX = /could not find the '([^']+)' column of '([^']+)'/i;

export interface SchemaErrorInfo {
  /** True if the error is "relation does not exist" or PGRST table missing. */
  missingTable?: string;
  /** True if the error is "column does not exist" or PGRST column missing. */
  missingColumn?: { table?: string; column: string };
}

export function detectSchemaError(message: string | undefined | null): SchemaErrorInfo | null {
  if (!message) return null;
  const m1 = message.match(RELATION_NOT_EXIST_RX);
  if (m1) return { missingTable: m1[1].replace(/^public\./, '') };
  const m2 = message.match(COLUMN_NOT_EXIST_RX);
  if (m2) return { missingColumn: { column: m2[1] } };
  const m3 = message.match(PGRST_TABLE_RX);
  if (m3) return { missingTable: m3[1].replace(/^public\./, '') };
  const m4 = message.match(PGRST_COLUMN_RX);
  if (m4) return { missingColumn: { column: m4[1], table: m4[2] } };
  return null;
}

/**
 * Builds an actionable hint message tailored for the admin UI when a schema
 * error is detected. The UI's `AdminActionGuard` reads `code` to decide
 * whether to show a "Reparar tablas ahora" CTA pointing at `/admin/setup`.
 */
export function schemaErrorHint(info: SchemaErrorInfo): { code: string; hint: string } {
  if (info.missingTable) {
    return {
      code: 'TABLE_MISSING',
      hint: `Falta la tabla "${info.missingTable}". Ve a /admin/setup y pulsa "Crear tablas ahora" para aplicar las migraciones.`,
    };
  }
  if (info.missingColumn) {
    const col = info.missingColumn.column;
    const tbl = info.missingColumn.table ? `"${info.missingColumn.table}"` : 'la tabla';
    return {
      code: 'COLUMN_MISSING',
      hint: `Falta la columna "${col}" en ${tbl}. Ve a /admin/setup → "Crear tablas ahora" para correr el bloque de migración correspondiente.`,
    };
  }
  return { code: 'DB_ERROR', hint: '' };
}
