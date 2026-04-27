import 'server-only';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/** Renders Markdown → sanitized HTML using the same pipeline as src/lib/content.ts. */
export function renderMarkdown(md: string): string {
  marked.setOptions({ gfm: true, breaks: false });
  const rendered = marked.parse(md ?? '', { async: false }) as string;
  return DOMPurify.sanitize(rendered, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/** Reading-time estimator (~220 wpm). Mirrors src/lib/content.ts. */
export function estimateReadingMinutes(markdown: string): number {
  const words = (markdown ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Slugify utility: strips diacritics, lowercases, collapses to hyphenated
 * ASCII. Used by the blog editor to derive a slug from the title.
 */
export function slugify(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}
