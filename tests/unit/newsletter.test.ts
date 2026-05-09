import { describe, expect, it, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NEWSLETTER_SECRET = 'test-secret-fabrick';
});

describe('newsletter unsubscribe tokens', () => {
  it('verifies a token generated for the same email', async () => {
    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import('../../src/lib/newsletter');
    const token = generateUnsubscribeToken('hola@fabrick.cl');
    expect(token).toMatch(/^[a-f0-9]{32}$/);
    expect(verifyUnsubscribeToken('hola@fabrick.cl', token)).toBe(true);
    // Email normalization (case + whitespace)
    expect(verifyUnsubscribeToken('  HOLA@fabrick.cl  ', token)).toBe(true);
  });

  it('rejects token from a different email', async () => {
    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import('../../src/lib/newsletter');
    const token = generateUnsubscribeToken('alice@fabrick.cl');
    expect(verifyUnsubscribeToken('bob@fabrick.cl', token)).toBe(false);
  });

  it('rejects malformed tokens', async () => {
    const { verifyUnsubscribeToken } = await import('../../src/lib/newsletter');
    expect(verifyUnsubscribeToken('a@b.cl', '')).toBe(false);
    expect(verifyUnsubscribeToken('a@b.cl', 'short')).toBe(false);
    expect(verifyUnsubscribeToken('a@b.cl', 'x'.repeat(32))).toBe(false);
  });
});

describe('newsletter email validation', () => {
  it('isValidEmail', async () => {
    const { isValidEmail } = await import('../../src/lib/newsletter');
    expect(isValidEmail('a@b.cl')).toBe(true);
    expect(isValidEmail('  A@B.CL  ')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});
