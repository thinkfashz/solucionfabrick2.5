import { describe, expect, it } from 'vitest';
import { isMissingOriginColumnError } from '@/app/api/admin/productos/import-from-url/errors';

describe('import-from-url isMissingOriginColumnError', () => {
  it('matches PostgreSQL "column does not exist" for every origin column', () => {
    for (const col of ['source', 'source_url', 'source_id', 'supplier_price', 'supplier_currency']) {
      expect(isMissingOriginColumnError(`column "${col}" does not exist`)).toBe(true);
    }
  });

  it('matches the PostgreSQL SQLSTATE code 42703 alone', () => {
    expect(isMissingOriginColumnError('database error: 42703 undefined_column')).toBe(true);
  });

  it('matches PostgREST schema-cache error (the message in the screenshot)', () => {
    expect(
      isMissingOriginColumnError(
        "Could not find the 'source' column of 'products' in the schema cache",
      ),
    ).toBe(true);
  });

  it('matches PostgREST schema-cache for every origin column variant', () => {
    for (const col of ['source', 'source_url', 'source_id', 'supplier_price', 'supplier_currency']) {
      expect(
        isMissingOriginColumnError(
          `Could not find the '${col}' column of 'products' in the schema cache`,
        ),
      ).toBe(true);
    }
  });

  it('matches PostgREST schema-cache regardless of quote style', () => {
    expect(
      isMissingOriginColumnError(
        'Could not find the "source_url" column of "products" in the schema cache',
      ),
    ).toBe(true);
    expect(
      isMissingOriginColumnError(
        'Could not find the source_id column of products in the schema cache',
      ),
    ).toBe(true);
  });

  it('matches the bare PGRST204 code when the column name is mentioned', () => {
    expect(isMissingOriginColumnError('PGRST204: missing source_url')).toBe(true);
  });

  it('returns false for unrelated database errors', () => {
    expect(isMissingOriginColumnError(null)).toBe(false);
    expect(isMissingOriginColumnError(undefined)).toBe(false);
    expect(isMissingOriginColumnError('')).toBe(false);
    expect(isMissingOriginColumnError('connection refused')).toBe(false);
    expect(isMissingOriginColumnError('column "name" does not exist')).toBe(false);
    expect(
      isMissingOriginColumnError(
        "Could not find the 'price' column of 'products' in the schema cache",
      ),
    ).toBe(false);
    expect(isMissingOriginColumnError('duplicate key value violates unique constraint')).toBe(false);
  });
});
