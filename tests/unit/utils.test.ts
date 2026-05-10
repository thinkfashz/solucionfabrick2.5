import { describe, it, expect } from 'vitest';
import { cn, buildProductMetaDescription } from '@/lib/utils';

describe('cn', () => {
  it('joins simple class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('supports clsx-style conditionals (object/array)', () => {
    expect(cn(['a', { b: true, c: false }], 'd')).toBe('a b d');
  });
});

describe('buildProductMetaDescription', () => {
  it('uses "Compra" by default', () => {
    const out = buildProductMetaDescription('Plancha OSB');
    expect(out.startsWith('Compra Plancha OSB en Soluciones Fabrick.')).toBe(true);
    expect(out).toContain('Región del Maule');
  });

  it('honors a custom verb', () => {
    const out = buildProductMetaDescription('Volcanita ST 15mm', 'Descubre');
    expect(out.startsWith('Descubre Volcanita ST 15mm en Soluciones Fabrick.')).toBe(true);
  });
});
