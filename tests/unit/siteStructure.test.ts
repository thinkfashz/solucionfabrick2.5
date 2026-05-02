import { describe, expect, it } from 'vitest';
import {
  SECTION_DEFAULTS,
  SECTION_KEYS,
  isSectionKey,
  mergeWithDefault,
  pathsForSection,
} from '@/lib/siteStructureTypes';

describe('siteStructureTypes', () => {
  it('exposes the seven section keys', () => {
    expect(SECTION_KEYS).toEqual([
      'global-styles',
      'nav-menu',
      'footer',
      'checkout',
      'producto',
      'error-404',
      'custom-injection',
    ]);
  });

  it('isSectionKey rejects unknown strings and non-strings', () => {
    expect(isSectionKey('nav-menu')).toBe(true);
    expect(isSectionKey('error-404')).toBe(true);
    expect(isSectionKey('not-a-key')).toBe(false);
    expect(isSectionKey(42)).toBe(false);
    expect(isSectionKey(null)).toBe(false);
    expect(isSectionKey(undefined)).toBe(false);
    expect(isSectionKey({})).toBe(false);
  });

  it('mergeWithDefault returns defaults for null/undefined/array', () => {
    expect(mergeWithDefault('error-404', null)).toEqual(SECTION_DEFAULTS['error-404']);
    expect(mergeWithDefault('error-404', undefined)).toEqual(SECTION_DEFAULTS['error-404']);
    expect(mergeWithDefault('error-404', [])).toEqual(SECTION_DEFAULTS['error-404']);
  });

  it('mergeWithDefault overlays partial fields', () => {
    const merged = mergeWithDefault('error-404', { title: 'Custom' });
    expect(merged.title).toBe('Custom');
    expect(merged.subtitle).toBe(SECTION_DEFAULTS['error-404'].subtitle);
    expect(merged.ctaHref).toBe(SECTION_DEFAULTS['error-404'].ctaHref);
  });

  it('mergeWithDefault drops unknown keys silently', () => {
    const merged = mergeWithDefault('error-404', { title: 'x', __proto: 'evil', extraField: 1 });
    expect(merged.title).toBe('x');
    expect((merged as unknown as Record<string, unknown>).extraField).toBeUndefined();
    expect((merged as unknown as Record<string, unknown>).__proto).toBeUndefined();
  });

  it('mergeWithDefault deep-merges nested objects (e.g. nav-menu.brand)', () => {
    const merged = mergeWithDefault('nav-menu', {
      brand: { logoUrl: 'https://cdn.example.com/logo.png' },
    });
    // logoUrl was added, label preserved from defaults.
    expect(merged.brand.logoUrl).toBe('https://cdn.example.com/logo.png');
    expect(merged.brand.label).toBe(SECTION_DEFAULTS['nav-menu'].brand.label);
  });

  it('mergeWithDefault replaces array fields wholesale (not element-wise)', () => {
    const merged = mergeWithDefault('nav-menu', { links: [{ label: 'A', href: '/a' }] });
    expect(merged.links).toEqual([{ label: 'A', href: '/a' }]);
  });

  it('pathsForSection returns at least one path per section', () => {
    for (const key of SECTION_KEYS) {
      const paths = pathsForSection(key);
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    }
  });

  it('custom-injection defaults to disabled', () => {
    expect(SECTION_DEFAULTS['custom-injection'].enabled).toBe(false);
    expect(SECTION_DEFAULTS['custom-injection'].head.html).toBe('');
    expect(SECTION_DEFAULTS['custom-injection'].bodyEnd.js).toBe('');
  });
});
