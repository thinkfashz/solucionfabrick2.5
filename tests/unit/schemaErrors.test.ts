import { describe, it, expect } from 'vitest';
import { detectSchemaError, schemaErrorHint } from '@/lib/schemaErrors';

/**
 * Schema-level errors come from two distinct paths and must both be detected
 * so the admin gets an actionable hint instead of an opaque 500. See
 * `src/lib/schemaErrors.ts` for the regex inventory.
 */
describe('detectSchemaError', () => {
  it('parses PostgreSQL "relation does not exist"', () => {
    const out = detectSchemaError('relation "public.blog_posts" does not exist');
    expect(out).toEqual({ missingTable: 'blog_posts' });
  });

  it('parses PostgreSQL "column does not exist"', () => {
    const out = detectSchemaError('column "body_md" does not exist');
    expect(out).toEqual({ missingColumn: { column: 'body_md' } });
  });

  it('parses PostgREST PGRST205 "could not find the table"', () => {
    const out = detectSchemaError(
      "Could not find the table 'public.blog_posts' in the schema cache",
    );
    expect(out).toEqual({ missingTable: 'blog_posts' });
  });

  it('parses PostgREST PGRST204 "could not find the X column of Y"', () => {
    const out = detectSchemaError(
      "Could not find the 'body_md' column of 'blog_posts' in the schema cache",
    );
    expect(out).toEqual({ missingColumn: { column: 'body_md', table: 'blog_posts' } });
  });

  it('returns null for unrelated messages', () => {
    expect(detectSchemaError('duplicate key value violates unique constraint')).toBeNull();
    expect(detectSchemaError('')).toBeNull();
    expect(detectSchemaError(null)).toBeNull();
    expect(detectSchemaError(undefined)).toBeNull();
  });
});

describe('schemaErrorHint', () => {
  it('returns TABLE_MISSING with /admin/setup hint', () => {
    const out = schemaErrorHint({ missingTable: 'blog_posts' });
    expect(out.code).toBe('TABLE_MISSING');
    expect(out.hint).toContain('blog_posts');
    expect(out.hint).toContain('/admin/setup');
  });

  it('returns COLUMN_MISSING with /admin/setup hint', () => {
    const out = schemaErrorHint({ missingColumn: { column: 'body_md', table: 'blog_posts' } });
    expect(out.code).toBe('COLUMN_MISSING');
    expect(out.hint).toContain('body_md');
    expect(out.hint).toContain('blog_posts');
  });

  it('falls back to DB_ERROR when info is empty', () => {
    expect(schemaErrorHint({}).code).toBe('DB_ERROR');
  });
});
