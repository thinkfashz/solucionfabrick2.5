import { describe, it, expect } from 'vitest';
import { SECTION_KINDS } from '@/lib/homeSectionKinds';

describe('SECTION_KINDS', () => {
  it('contains the canonical CMS section kinds', () => {
    // The set is a public contract with the CMS bus and DB whitelist; bumping
    // it requires a SQL migration. Hard-code the expected members so a silent
    // edit fails CI.
    expect([...SECTION_KINDS].sort()).toEqual(
      ['banner', 'cta', 'custom', 'galeria', 'hero', 'productos', 'servicios', 'tienda', 'trayectoria'].sort(),
    );
  });

  it('has no duplicates', () => {
    expect(new Set(SECTION_KINDS).size).toBe(SECTION_KINDS.length);
  });

  it('is a non-empty readonly tuple of lower-case slugs', () => {
    expect(SECTION_KINDS.length).toBeGreaterThan(0);
    for (const k of SECTION_KINDS) {
      expect(k).toMatch(/^[a-z]+$/);
    }
  });
});
