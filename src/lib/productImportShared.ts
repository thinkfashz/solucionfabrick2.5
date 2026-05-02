/**
 * Browser-safe slice of the product-import helpers.
 *
 * `@/lib/productImport` is server-only because it imports `cheerio`
 * (heavy) and uses `fetch` against arbitrary upstream stores. This
 * module hosts the pure helpers that the client also needs (currently
 * just `extractMlcId`) so the admin UI can re-export them without
 * pulling cheerio into the browser bundle.
 */

const MLC_ID_REGEX = /MLC[-_\s]?(\d{6,})/i;

/**
 * Extracts the canonical MLC item id (e.g. "MLC123456789") from a URL
 * or text snippet. Accepts both `MLC123…` and `MLC-123…` variants.
 */
export function extractMlcId(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(MLC_ID_REGEX);
  if (!m) return null;
  return `MLC${m[1]}`;
}
