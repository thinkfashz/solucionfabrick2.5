import { describe, it, expect } from 'vitest';
import { MAX_SOCIAL_IMAGES } from '@/lib/social';

describe('MAX_SOCIAL_IMAGES', () => {
  it('is a positive integer', () => {
    expect(Number.isInteger(MAX_SOCIAL_IMAGES)).toBe(true);
    expect(MAX_SOCIAL_IMAGES).toBeGreaterThan(0);
  });

  it('matches the documented limit', () => {
    expect(MAX_SOCIAL_IMAGES).toBe(10);
  });
});
