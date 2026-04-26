/**
 * Pure utility for splitting `scripts/create-tables.sql` into individually-
 * executable blocks. Extracted from the API route handler so it can be
 * unit-tested without booting Next.js.
 *
 * The SQL file is annotated with marker comments:
 *
 *   -- TABLA: products
 *   CREATE TABLE IF NOT EXISTS public.products ( ... );
 *
 *   -- SEED: categories (default)
 *   INSERT INTO public.categories ...;
 *
 * Each block is executed separately so the API can report individual
 * success/failure per table and continue on errors.
 */
export interface SqlBlock {
  name: string;
  query: string;
}

export function parseSqlBlocks(sql: string): SqlBlock[] {
  const blocks: SqlBlock[] = [];
  const lines = sql.split(/\r?\n/);
  let current: { name: string; buf: string[] } | null = null;

  const flush = () => {
    if (current) {
      const query = current.buf.join('\n').trim();
      if (query.length > 0) {
        blocks.push({ name: current.name, query });
      }
    }
  };

  for (const line of lines) {
    const headerMatch = line.match(/^--\s*(TABLA|SEED):\s*(.+?)\s*$/i);
    if (headerMatch) {
      flush();
      const kind = headerMatch[1].toLowerCase();
      const label = headerMatch[2].trim();
      // Normalise the block name: for "TABLA: posts (blog)" -> "posts".
      const name =
        kind === 'tabla'
          ? label.replace(/\s*\(.*\)\s*$/, '').trim()
          : `seed:${label.replace(/\s*\(.*\)\s*$/, '').trim()}`;
      current = { name, buf: [] };
      continue;
    }
    if (current) current.buf.push(line);
  }
  flush();
  return blocks;
}
