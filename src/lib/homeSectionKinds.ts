/**
 * Whitelisted `kind` values for `home_sections`. Lives in its own module
 * (not a route file) because Next.js route handlers can only export the HTTP
 * verbs and a small list of config exports.
 */
export const SECTION_KINDS = [
  'banner',
  'cta',
  'hero',
  'servicios',
  'productos',
  'trayectoria',
  'tienda',
  'galeria',
  'custom',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];
