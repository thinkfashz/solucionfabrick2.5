import { describe, it, expect } from 'vitest';
import { renderMarkdown, estimateReadingMinutes, slugify } from '@/lib/markdown';

describe('renderMarkdown', () => {
  it('renders headings, paragraphs and emphasis', () => {
    const html = renderMarkdown('# Hola\n\n**fuerte** y _itálica_');
    expect(html).toMatch(/<h1[^>]*>Hola<\/h1>/);
    expect(html).toMatch(/<strong>fuerte<\/strong>/);
    expect(html).toMatch(/<em>itálica<\/em>/);
  });

  it('strips <script> tags (DOMPurify)', () => {
    const html = renderMarkdown('texto\n\n<script>alert(1)</script>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/alert\(1\)/);
  });

  it('strips inline event handlers like onerror/onload/onclick', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)" onload="x" onclick="y">');
    expect(html).not.toMatch(/onerror=/i);
    expect(html).not.toMatch(/onload=/i);
    expect(html).not.toMatch(/onclick=/i);
  });

  it('strips <style> blocks', () => {
    const html = renderMarkdown('<style>body{display:none}</style>\n\nhola');
    expect(html).not.toMatch(/<style/i);
    expect(html).toMatch(/hola/);
  });

  it('treats null/undefined input as empty string', () => {
    expect(renderMarkdown(undefined as unknown as string)).toBe('');
    expect(renderMarkdown(null as unknown as string)).toBe('');
  });
});

describe('estimateReadingMinutes', () => {
  it('returns at least 1 even for empty/whitespace input', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes('   \n\n\t')).toBe(1);
    expect(estimateReadingMinutes('una palabra')).toBe(1);
  });

  it('rounds to the nearest minute at ~220 wpm', () => {
    const words = Array.from({ length: 220 }, (_, i) => `w${i}`).join(' ');
    expect(estimateReadingMinutes(words)).toBe(1);
    const longer = Array.from({ length: 660 }, (_, i) => `w${i}`).join(' ');
    expect(estimateReadingMinutes(longer)).toBe(3);
  });

  it('treats null/undefined as empty (1 min floor)', () => {
    expect(estimateReadingMinutes(undefined as unknown as string)).toBe(1);
    expect(estimateReadingMinutes(null as unknown as string)).toBe(1);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates ASCII input', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips diacritics', () => {
    expect(slugify('Camión Único Ñandú')).toBe('camion-unico-nandu');
  });

  it('collapses runs of separators and trims leading/trailing hyphens', () => {
    expect(slugify('  ---hola___mundo!!!  ')).toBe('hola-mundo');
  });

  it('caps the result at 96 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBe(96);
  });

  it('handles null/undefined as empty string', () => {
    expect(slugify(undefined as unknown as string)).toBe('');
    expect(slugify(null as unknown as string)).toBe('');
  });

  it('drops emoji/non-ASCII symbols', () => {
    expect(slugify('hola 🌎 mundo')).toBe('hola-mundo');
  });
});
