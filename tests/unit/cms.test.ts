import { describe, it, expect } from 'vitest';
import { renderCopyright } from '@/lib/cms';
import { slugify, estimateReadingMinutes, renderMarkdown } from '@/lib/markdown';

describe('cms.renderCopyright', () => {
  it('substitutes {year} with the current year', () => {
    const year = String(new Date().getFullYear());
    expect(renderCopyright('© {year} Foo')).toBe(`© ${year} Foo`);
  });

  it('substitutes multiple occurrences', () => {
    const year = String(new Date().getFullYear());
    expect(renderCopyright('{year} · {year}')).toBe(`${year} · ${year}`);
  });

  it('falls back to default template on empty input', () => {
    const out = renderCopyright('');
    const year = String(new Date().getFullYear());
    expect(out).toContain(year);
    expect(out).toContain('Soluciones Fabrick');
  });

  it('returns input unchanged when no placeholder present', () => {
    expect(renderCopyright('Plain text')).toBe('Plain text');
  });
});

describe('markdown.slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo');
  });

  it('strips diacritics', () => {
    expect(slugify('Construcción Áncora')).toBe('construccion-ancora');
  });

  it('drops symbols and trims hyphens', () => {
    expect(slugify('  ¿Hola, mundo? ')).toBe('hola-mundo');
  });

  it('returns empty string for unsluggable input', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('caps slug length to 96 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(96);
  });
});

describe('markdown.estimateReadingMinutes', () => {
  it('returns at least 1 for empty input', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes('   ')).toBe(1);
  });

  it('estimates ~1 min for short text', () => {
    expect(estimateReadingMinutes('hola mundo'.repeat(10))).toBe(1);
  });

  it('scales with word count (~220 wpm)', () => {
    const words = Array.from({ length: 660 }, () => 'word').join(' ');
    expect(estimateReadingMinutes(words)).toBe(3);
  });
});

describe('markdown.renderMarkdown', () => {
  it('renders headings and bold', () => {
    const html = renderMarkdown('# Title\n\n**bold**');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips disallowed scripts', () => {
    const html = renderMarkdown('<script>alert(1)</script>Hola');
    expect(html).not.toContain('<script');
    expect(html).toContain('Hola');
  });

  it('removes inline event handlers', () => {
    const html = renderMarkdown('<a href="x" onclick="evil()">x</a>');
    expect(html).not.toContain('onclick');
  });
});
