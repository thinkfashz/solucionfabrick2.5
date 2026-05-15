import { describe, it, expect } from 'vitest';
import { v, parse } from '@/lib/validate';

describe('parse — happy path', () => {
  it('accepts a valid object and strips unknown fields', () => {
    const schema = { name: v.string({ required: true }), age: v.number() };
    const result = parse(schema, { name: 'Ana', age: 30, extra: 'ignored' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ name: 'Ana', age: 30 });
    expect('extra' in result.data).toBe(false);
  });

  it('omits optional absent fields from data', () => {
    const schema = { a: v.string({ required: true }), b: v.number() };
    const result = parse(schema, { a: 'hello' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect('b' in result.data).toBe(false);
  });

  it('trims strings by default', () => {
    const result = parse({ s: v.string() }, { s: '  hello  ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.s).toBe('hello');
  });

  it('coerces number-as-string', () => {
    const result = parse({ n: v.number() }, { n: '42' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.n).toBe(42);
  });

  it('accepts boolean string coercion', () => {
    const r1 = parse({ b: v.boolean() }, { b: 'true' });
    const r2 = parse({ b: v.boolean() }, { b: 'false' });
    expect(r1.ok && (r1 as { ok: true; data: Record<string, unknown> }).data.b).toBe(true);
    expect(r2.ok && (r2 as { ok: true; data: Record<string, unknown> }).data.b).toBe(false);
  });

  it('validates nested object via shape', () => {
    const schema = {
      cliente: v.object({
        required: true,
        shape: { nombre: v.string({ required: true }), email: v.email({ required: true }) },
      }),
    };
    const result = parse(schema, { cliente: { nombre: 'Luis', email: 'luis@test.com' } });
    expect(result.ok).toBe(true);
  });

  it('validates array items', () => {
    const schema = { ids: v.array({ required: true, of: v.string({ min: 1 }) }) };
    const result = parse(schema, { ids: ['a', 'b', 'c'] });
    expect(result.ok).toBe(true);
  });
});

describe('parse — string validations', () => {
  it('rejects missing required string', () => {
    const result = parse({ name: v.string({ required: true }) }, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('"name"');
  });

  it('enforces min length', () => {
    const result = parse({ s: v.string({ min: 5 }) }, { s: 'hi' });
    expect(result.ok).toBe(false);
  });

  it('enforces max length', () => {
    const result = parse({ s: v.string({ max: 3 }) }, { s: 'toolong' });
    expect(result.ok).toBe(false);
  });

  it('validates email format', () => {
    expect(parse({ e: v.email() }, { e: 'notanemail' }).ok).toBe(false);
    expect(parse({ e: v.email() }, { e: 'a@b.com' }).ok).toBe(true);
  });

  it('validates URL format', () => {
    expect(parse({ u: v.url() }, { u: 'not-a-url' }).ok).toBe(false);
    expect(parse({ u: v.url() }, { u: 'https://example.com' }).ok).toBe(true);
  });

  it('validates enum membership', () => {
    const schema = { status: v.enum(['active', 'inactive'] as const) };
    expect(parse(schema, { status: 'other' }).ok).toBe(false);
    expect(parse(schema, { status: 'active' }).ok).toBe(true);
  });
});

describe('parse — number validations', () => {
  it('rejects non-numeric value', () => {
    expect(parse({ n: v.number({ required: true }) }, { n: 'abc' }).ok).toBe(false);
  });

  it('enforces min/max', () => {
    expect(parse({ n: v.number({ min: 0 }) }, { n: -1 }).ok).toBe(false);
    expect(parse({ n: v.number({ max: 10 }) }, { n: 11 }).ok).toBe(false);
    expect(parse({ n: v.number({ min: 0, max: 10 }) }, { n: 5 }).ok).toBe(true);
  });

  it('enforces integer constraint', () => {
    expect(parse({ n: v.number({ integer: true }) }, { n: 1.5 }).ok).toBe(false);
    expect(parse({ n: v.number({ integer: true }) }, { n: 2 }).ok).toBe(true);
  });
});

describe('parse — structural errors', () => {
  it('rejects non-object input', () => {
    expect(parse({}, 'string').ok).toBe(false);
    expect(parse({}, 42).ok).toBe(false);
    expect(parse({}, null).ok).toBe(false);
    expect(parse({}, []).ok).toBe(false);
  });

  it('collects multiple errors at once', () => {
    const schema = {
      a: v.string({ required: true }),
      b: v.number({ required: true }),
    };
    const result = parse(schema, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBe(2);
  });

  it('rejects array item with wrong type', () => {
    const schema = { ids: v.array({ of: v.number() }) };
    const result = parse(schema, { ids: ['not', 'numbers'] });
    expect(result.ok).toBe(false);
  });

  it('rejects array exceeding maxItems', () => {
    const schema = { items: v.array({ maxItems: 2 }) };
    expect(parse(schema, { items: [1, 2, 3] }).ok).toBe(false);
  });
});
