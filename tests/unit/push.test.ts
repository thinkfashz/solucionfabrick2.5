import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPushEnabled, isValidSubscription, getPublicVapidKey } from '@/lib/push';

const ENV_KEYS = ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'] as const;

describe('push lib', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k]!;
    }
  });

  it('isPushEnabled returns false when no VAPID env vars are set', () => {
    expect(isPushEnabled()).toBe(false);
  });

  it('isPushEnabled returns true only when all three VAPID fields are configured', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub';
    expect(isPushEnabled()).toBe(false);
    process.env.VAPID_PRIVATE_KEY = 'priv';
    expect(isPushEnabled()).toBe(false);
    process.env.VAPID_SUBJECT = 'mailto:ops@example.com';
    expect(isPushEnabled()).toBe(true);
  });

  it('getPublicVapidKey prefers the NEXT_PUBLIC prefix', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-a';
    process.env.VAPID_PUBLIC_KEY = 'public-b';
    expect(getPublicVapidKey()).toBe('public-a');
  });

  it('getPublicVapidKey falls back to VAPID_PUBLIC_KEY', () => {
    process.env.VAPID_PUBLIC_KEY = 'only-b';
    expect(getPublicVapidKey()).toBe('only-b');
  });

  it('isValidSubscription rejects non-objects and missing fields', () => {
    expect(isValidSubscription(null)).toBe(false);
    expect(isValidSubscription('x')).toBe(false);
    expect(isValidSubscription({})).toBe(false);
    expect(isValidSubscription({ endpoint: 'https://x' })).toBe(false);
    expect(isValidSubscription({ endpoint: 'https://x', keys: {} })).toBe(false);
    expect(isValidSubscription({ endpoint: 'https://x', keys: { p256dh: 'a' } })).toBe(false);
  });

  it('isValidSubscription rejects non-HTTPS endpoints', () => {
    expect(
      isValidSubscription({ endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } }),
    ).toBe(false);
  });

  it('isValidSubscription accepts a well-formed PushSubscription JSON', () => {
    expect(
      isValidSubscription({
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'key', auth: 'auth' },
      }),
    ).toBe(true);
  });
});
