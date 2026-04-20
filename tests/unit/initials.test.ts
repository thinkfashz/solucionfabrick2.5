import { describe, it, expect } from 'vitest';
import { getInitials } from '@/lib/initials';

describe('getInitials', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });

  it('combines first letter of first two words', () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
    expect(getInitials('María Elena González')).toBe('ME');
  });

  it('splits at the @ sign for emails', () => {
    expect(getInitials('juan@example.com')).toBe('JE');
    expect(getInitials('maria.perez@foo.bar')).toBe('MF');
  });

  it('falls back to first two letters for single word', () => {
    expect(getInitials('Fabrick')).toBe('FA');
    expect(getInitials('x')).toBe('X');
  });

  it('uppercases the result', () => {
    expect(getInitials('juan pérez')).toBe('JP');
    expect(getInitials('ana')).toBe('AN');
  });
});
