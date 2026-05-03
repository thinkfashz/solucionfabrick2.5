import { describe, expect, it } from 'vitest';
import { serializeSdkError } from '@/lib/adminApi';
import { isMissingTableError } from '@/components/admin/AdminActionGuard';

describe('serializeSdkError', () => {
  it('extracts message + PostgREST code/details/hint', () => {
    const out = serializeSdkError({
      message: 'relation "public.integrations" does not exist',
      code: '42P01',
      details: 'foo',
      hint: 'create the table',
    });
    expect(out.message).toContain('does not exist');
    expect(out.code).toBe('42P01');
    expect(out.details).toBe('foo');
    expect(out.hint).toBe('create the table');
  });

  it('falls back to InsForge `error` and `nextActions` when present', () => {
    const out = serializeSdkError({
      message: 'unauthorized',
      error: 'AUTH_INVALID_API_KEY',
      nextActions: 'Set INSFORGE_API_KEY env var.',
      statusCode: 401,
    });
    expect(out.code).toBe('AUTH_INVALID_API_KEY');
    expect(out.hint).toContain('INSFORGE_API_KEY');
    expect(out.statusCode).toBe(401);
  });

  it('handles non-object errors', () => {
    expect(serializeSdkError('boom').message).toBe('boom');
    expect(serializeSdkError(null).message).toBe('Error desconocido.');
    expect(serializeSdkError(undefined).message).toBe('Error desconocido.');
  });

  it('reads message from Error instances even without enumerable property', () => {
    const out = serializeSdkError(new Error('kaboom'));
    expect(out.message).toBe('kaboom');
  });
});

describe('isMissingTableError', () => {
  it('detects PostgreSQL 42P01 by code', () => {
    expect(isMissingTableError({ code: '42P01' })).toBe(true);
  });

  it('detects "relation … does not exist" message', () => {
    expect(
      isMissingTableError({ error: 'relation "public.integrations" does not exist' }),
    ).toBe(true);
  });

  it('detects PostgREST "Could not find the table" message', () => {
    expect(
      isMissingTableError({ error: "Could not find the table 'public.integrations' in the schema cache" }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isMissingTableError({ error: 'invalid input syntax for type uuid' })).toBe(false);
    expect(isMissingTableError({})).toBe(false);
  });
});
