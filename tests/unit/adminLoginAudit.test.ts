import { describe, it, expect, beforeEach, vi } from 'vitest';

type Row = {
  ip: string;
  email: string | null;
  outcome: string;
  reason: string | null;
  user_agent: string | null;
};

let inserted: Row[];
let backendBehavior: 'ok' | 'missing-table' | 'transient-error' | 'returned-error';

vi.mock('@/lib/insforge', () => ({
  insforge: {
    database: {
      from: (_t: string) => ({
        insert: (rows: Row[]) => {
          if (backendBehavior === 'transient-error') {
            return Promise.reject(new Error('ECONNRESET'));
          }
          if (backendBehavior === 'missing-table') {
            return Promise.resolve({
              data: null,
              error: { message: "Could not find the table 'public.admin_login_audit' in the schema cache" },
            });
          }
          if (backendBehavior === 'returned-error') {
            return Promise.resolve({
              data: null,
              error: { message: 'permission denied for relation admin_login_audit' },
            });
          }
          inserted.push(...rows);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    },
  },
}));

import { recordLoginAttempt, userAgentFromRequest } from '@/lib/adminLoginAudit';

describe('adminLoginAudit', () => {
  beforeEach(() => {
    inserted = [];
    backendBehavior = 'ok';
  });

  it('inserts a single row with the given outcome', async () => {
    await recordLoginAttempt({
      ip: '1.2.3.4',
      email: 'admin@example.com',
      outcome: 'success',
      reason: 'rol=admin',
      userAgent: 'Mozilla/5.0',
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      ip: '1.2.3.4',
      email: 'admin@example.com',
      outcome: 'success',
      reason: 'rol=admin',
      user_agent: 'Mozilla/5.0',
    });
  });

  it('preserves null for missing email/reason/user_agent rather than coercing to empty strings', async () => {
    await recordLoginAttempt({ ip: '5.5.5.5', outcome: 'rate_limited' });
    expect(inserted[0]).toMatchObject({
      ip: '5.5.5.5',
      email: null,
      reason: null,
      user_agent: null,
    });
  });

  it('caps oversized email/reason/user-agent fields so a hostile client cannot bloat rows', async () => {
    const big = 'A'.repeat(10_000);
    await recordLoginAttempt({
      ip: '9.9.9.9',
      email: big,
      outcome: 'invalid_password',
      reason: big,
      userAgent: big,
    });
    // RFC 5321 max email = 320; reason/UA cap = 500
    expect(inserted[0].email!.length).toBe(320);
    expect(inserted[0].reason!.length).toBe(500);
    expect(inserted[0].user_agent!.length).toBe(500);
  });

  it('falls back to "unknown" if ip is empty/falsy (defense-in-depth, NOT NULL column)', async () => {
    await recordLoginAttempt({ ip: '', outcome: 'error' });
    expect(inserted[0].ip).toBe('unknown');
  });

  it('is a silent no-op when the table does not exist (resolves, never throws)', async () => {
    backendBehavior = 'missing-table';
    await expect(
      recordLoginAttempt({ ip: '1.1.1.1', outcome: 'success' })
    ).resolves.toBeUndefined();
    expect(inserted).toHaveLength(0); // nothing got through
  });

  it('swallows transient DB errors so a logging failure never blocks login', async () => {
    backendBehavior = 'transient-error';
    await expect(
      recordLoginAttempt({ ip: '2.2.2.2', outcome: 'success' })
    ).resolves.toBeUndefined();
  });

  it('swallows DB-returned errors (e.g. permission denied) without throwing', async () => {
    backendBehavior = 'returned-error';
    await expect(
      recordLoginAttempt({ ip: '3.3.3.3', outcome: 'invalid_password' })
    ).resolves.toBeUndefined();
  });

  it('userAgentFromRequest returns null when header missing, not empty string', () => {
    const req = new Request('https://x.test/');
    expect(userAgentFromRequest(req)).toBeNull();
  });

  it('userAgentFromRequest returns the header verbatim when present', () => {
    const req = new Request('https://x.test/', { headers: { 'user-agent': 'curl/8.4.0' } });
    expect(userAgentFromRequest(req)).toBe('curl/8.4.0');
  });
});
