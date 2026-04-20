import { describe, it, expect } from 'vitest';
import { buildCsp, generateNonce } from '@/lib/csp';

describe('generateNonce', () => {
  it('returns a base64 string without padding', () => {
    const n = generateNonce();
    expect(n).toMatch(/^[A-Za-z0-9+/]+$/);
    expect(n).not.toMatch(/=/);
    // 16 random bytes → ≥ 22 base64 chars.
    expect(n.length).toBeGreaterThanOrEqual(22);
  });

  it('is unique across invocations', () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) set.add(generateNonce());
    expect(set.size).toBe(50);
  });
});

describe('buildCsp', () => {
  it('embeds the nonce in script-src', () => {
    const csp = buildCsp({ nonce: 'ABC123' });
    expect(csp).toContain("script-src 'self' 'nonce-ABC123' 'strict-dynamic'");
  });

  it("does not include 'unsafe-inline' or 'unsafe-eval' in script-src in production", () => {
    const csp = buildCsp({ nonce: 'n', isDev: false });
    const [, scriptPart] = /script-src ([^;]+);/.exec(csp) ?? [];
    expect(scriptPart).toBeTruthy();
    expect(scriptPart).not.toContain("'unsafe-inline'");
    expect(scriptPart).not.toContain("'unsafe-eval'");
  });

  it('emits hardening directives', () => {
    const csp = buildCsp({ nonce: 'n' });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it("does NOT emit upgrade-insecure-requests in dev", () => {
    const csp = buildCsp({ nonce: 'n', isDev: true });
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it("allows 'unsafe-eval' only in dev", () => {
    expect(buildCsp({ nonce: 'n', isDev: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ nonce: 'n', isDev: false })).not.toContain("'unsafe-eval'");
  });

  it('allowlists trusted third parties', () => {
    const csp = buildCsp({ nonce: 'n' });
    expect(csp).toContain('challenges.cloudflare.com');
    expect(csp).toContain('mercadopago.com');
    expect(csp).toContain('insforge.app');
    expect(csp).toContain('fonts.googleapis.com');
  });
});
