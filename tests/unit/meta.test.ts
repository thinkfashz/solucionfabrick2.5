import { describe, expect, it } from 'vitest';
import { META_API_VERSION, META_GRAPH_URL, normalizeAdAccountId } from '@/lib/meta';

describe('META_API_VERSION / META_GRAPH_URL', () => {
  it('apunta a graph.facebook.com con la versión documentada', () => {
    expect(META_API_VERSION).toMatch(/^v\d+\.\d+$/);
    expect(META_GRAPH_URL).toBe(`https://graph.facebook.com/${META_API_VERSION}`);
  });
});

describe('normalizeAdAccountId', () => {
  it('quita un único prefijo act_', () => {
    expect(normalizeAdAccountId('act_1234567890')).toBe('1234567890');
  });

  it('quita prefijos act_ duplicados', () => {
    expect(normalizeAdAccountId('act_act_act_1234567890')).toBe('1234567890');
  });

  it('es case-insensitive en el prefijo', () => {
    expect(normalizeAdAccountId('ACT_1234567890')).toBe('1234567890');
    expect(normalizeAdAccountId('Act_1234567890')).toBe('1234567890');
  });

  it('hace trim de whitespace', () => {
    expect(normalizeAdAccountId('  act_1234567890  ')).toBe('1234567890');
    expect(normalizeAdAccountId('  1234567890  ')).toBe('1234567890');
  });

  it('deja intacto un id sin prefijo', () => {
    expect(normalizeAdAccountId('1234567890')).toBe('1234567890');
  });

  it('passthrough para undefined', () => {
    expect(normalizeAdAccountId(undefined)).toBeUndefined();
  });

  it('passthrough para string vacío (falsy)', () => {
    expect(normalizeAdAccountId('')).toBe('');
  });

  it('no quita "act" sin underscore (no es prefijo)', () => {
    expect(normalizeAdAccountId('action_123')).toBe('action_123');
  });

  it('compone URL segura `act_${id}` sin doble prefijo', () => {
    const composed = `${META_GRAPH_URL}/act_${normalizeAdAccountId('act_999')}/insights`;
    expect(composed).toBe(`${META_GRAPH_URL}/act_999/insights`);
    expect(composed).not.toContain('act_act_');
  });
});
