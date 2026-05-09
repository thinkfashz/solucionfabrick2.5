import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  INTEGRATIONS_ENV_MAP,
  envForProvider,
  listIntegrationProviders,
  readEnvFromMap,
} from '@/lib/integrationsEnvMap';

/** Snapshot env-var aliases referenced by the map and clear them per-test. */
const ALL_ALIASES = Array.from(
  new Set(
    Object.values(INTEGRATIONS_ENV_MAP).flatMap((fields) =>
      Object.values(fields).flatMap((aliases) => aliases as readonly string[]),
    ),
  ),
);

describe('integrationsEnvMap', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ALL_ALIASES) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe('readEnvFromMap', () => {
    it('returns undefined when neither alias is set', () => {
      expect(readEnvFromMap('meta', 'access_token')).toBeUndefined();
    });

    it('returns the first alias that resolves with non-empty trimmed value', () => {
      process.env.META_ACCESS_TOKEN = '  EAA-token  ';
      const hit = readEnvFromMap('meta', 'access_token');
      expect(hit).toEqual({ value: 'EAA-token', envVar: 'META_ACCESS_TOKEN' });
    });

    it('falls back to a later alias when the preferred one is empty/whitespace', () => {
      process.env.META_FACEBOOK_PAGE_ID = '   ';
      process.env.META_PAGE_ID = '12345';
      const hit = readEnvFromMap('meta', 'page_id');
      expect(hit).toEqual({ value: '12345', envVar: 'META_PAGE_ID' });
    });

    it('prefers the first alias when both are set', () => {
      process.env.META_FACEBOOK_PAGE_ID = '111';
      process.env.META_PAGE_ID = '222';
      const hit = readEnvFromMap('meta', 'page_id');
      expect(hit).toEqual({ value: '111', envVar: 'META_FACEBOOK_PAGE_ID' });
    });

    it('returns undefined for unknown provider/field combinations', () => {
      expect(readEnvFromMap('meta', 'does_not_exist')).toBeUndefined();
      expect(readEnvFromMap('does_not_exist', 'access_token')).toBeUndefined();
    });

    it('returns undefined for fields declared with an empty alias list', () => {
      // google has no env aliases consumed by runtime helpers — by design.
      expect(readEnvFromMap('google', 'client_id')).toBeUndefined();
    });
  });

  describe('envForProvider', () => {
    it('returns {} when no alias is set', () => {
      expect(envForProvider('meta')).toEqual({});
    });

    it('returns only the fields whose env var is set, with the alias name', () => {
      process.env.VERCEL_API_TOKEN = 'tok';
      process.env.VERCEL_TEAM_ID = '   '; // whitespace = unset
      const out = envForProvider('vercel');
      expect(out).toEqual({ api_token: { envVar: 'VERCEL_API_TOKEN' } });
    });

    it('reports the resolving alias when multiple are declared', () => {
      process.env.META_PAGE_ID = '999';
      const out = envForProvider('meta');
      expect(out.page_id).toEqual({ envVar: 'META_PAGE_ID' });
    });

    it('returns {} for providers not in the map (defensive)', () => {
      expect(envForProvider('unknown_provider')).toEqual({});
    });

    it('does NOT include the field value (never echoes secrets)', () => {
      process.env.META_ACCESS_TOKEN = 'super-secret-token';
      const out = envForProvider('meta');
      const json = JSON.stringify(out);
      expect(json).not.toContain('super-secret-token');
      expect(json).toContain('META_ACCESS_TOKEN');
    });
  });

  describe('listIntegrationProviders', () => {
    it('lists every provider declared in the map', () => {
      const providers = listIntegrationProviders();
      expect(providers).toContain('meta');
      expect(providers).toContain('vercel');
      expect(providers).toContain('cloudinary');
    });
  });

  describe('map invariants', () => {
    it('declares only string array aliases (no empty strings or undefineds)', () => {
      for (const [provider, fields] of Object.entries(INTEGRATIONS_ENV_MAP)) {
        for (const [field, aliases] of Object.entries(fields)) {
          expect(Array.isArray(aliases), `${provider}.${field}`).toBe(true);
          for (const alias of aliases as readonly string[]) {
            expect(typeof alias, `${provider}.${field}`).toBe('string');
            expect(alias.length, `${provider}.${field}`).toBeGreaterThan(0);
          }
        }
      }
    });

    it('uses unique alias names per field (no duplicates)', () => {
      for (const [provider, fields] of Object.entries(INTEGRATIONS_ENV_MAP)) {
        for (const [field, aliases] of Object.entries(fields)) {
          const arr = aliases as readonly string[];
          expect(new Set(arr).size, `${provider}.${field}`).toBe(arr.length);
        }
      }
    });
  });
});
