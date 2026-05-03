import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  parseMetaMessages,
  verifyMetaHandshake,
  verifyMetaSignature,
  timingSafeEqualHex,
} from '@/lib/socialWebhook';

const ORIGINAL_ENV = { ...process.env };

describe('socialWebhook', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('timingSafeEqualHex', () => {
    it('returns true for identical hex strings', () => {
      expect(timingSafeEqualHex('deadbeef', 'deadbeef')).toBe(true);
    });
    it('returns false for different hex strings', () => {
      expect(timingSafeEqualHex('deadbeef', 'deadbeee')).toBe(false);
    });
    it('returns false for length mismatch', () => {
      expect(timingSafeEqualHex('dead', 'deadbeef')).toBe(false);
    });
  });

  describe('verifyMetaSignature', () => {
    it('returns false when META_APP_SECRET is unset', () => {
      delete process.env.META_APP_SECRET;
      expect(verifyMetaSignature('{}', 'sha256=abc')).toBe(false);
    });

    it('returns false when header missing', () => {
      process.env.META_APP_SECRET = 'shh';
      expect(verifyMetaSignature('{}', null)).toBe(false);
    });

    it('returns false on bad prefix', () => {
      process.env.META_APP_SECRET = 'shh';
      expect(verifyMetaSignature('{}', 'md5=abc')).toBe(false);
    });

    it('accepts a correct signature and rejects a wrong one', () => {
      process.env.META_APP_SECRET = 'super-secret';
      const body = JSON.stringify({ entry: [{ id: 'page' }] });
      const expected = crypto.createHmac('sha256', 'super-secret').update(body, 'utf8').digest('hex');
      expect(verifyMetaSignature(body, `sha256=${expected}`)).toBe(true);
      expect(verifyMetaSignature(body, `sha256=${'0'.repeat(expected.length)}`)).toBe(false);
    });

    it('rejects when the body is tampered with', () => {
      process.env.META_APP_SECRET = 'super-secret';
      const original = JSON.stringify({ entry: [{ id: 'page' }] });
      const expected = crypto.createHmac('sha256', 'super-secret').update(original, 'utf8').digest('hex');
      const tampered = JSON.stringify({ entry: [{ id: 'evil' }] });
      expect(verifyMetaSignature(tampered, `sha256=${expected}`)).toBe(false);
    });
  });

  describe('verifyMetaHandshake', () => {
    it('returns null when verify token mismatches', () => {
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'good';
      const params = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'bad',
        'hub.challenge': 'c1',
      });
      expect(verifyMetaHandshake(params)).toBeNull();
    });

    it('returns the challenge when token matches', () => {
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'good';
      const params = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'good',
        'hub.challenge': 'c1',
      });
      expect(verifyMetaHandshake(params)).toBe('c1');
    });

    it('returns null when the env var is not set', () => {
      delete process.env.META_WEBHOOK_VERIFY_TOKEN;
      const params = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': '',
        'hub.challenge': 'c1',
      });
      expect(verifyMetaHandshake(params)).toBeNull();
    });
  });

  describe('parseMetaMessages', () => {
    it('returns [] for invalid payloads', () => {
      expect(parseMetaMessages(null, 'instagram')).toEqual([]);
      expect(parseMetaMessages({}, 'instagram')).toEqual([]);
      expect(parseMetaMessages({ entry: 'oops' }, 'instagram')).toEqual([]);
    });

    it('extracts a Messenger DM into the normalised shape', () => {
      const payload = {
        entry: [
          {
            id: 'PAGE_ID',
            messaging: [
              {
                sender: { id: 'USER_ID' },
                recipient: { id: 'PAGE_ID' },
                timestamp: 1700000000000,
                message: { mid: 'mid_1', text: 'hola' },
              },
            ],
          },
        ],
      };
      const out = parseMetaMessages(payload, 'facebook');
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
        provider: 'facebook',
        external_id: 'mid_1',
        thread_id: 'USER_ID',
        sender: 'USER_ID',
        text: 'hola',
      });
    });

    it('skips echo messages so we don\'t loop our own outgoing replies', () => {
      const payload = {
        entry: [
          {
            messaging: [
              {
                sender: { id: 'PAGE_ID' },
                recipient: { id: 'USER_ID' },
                message: { mid: 'mid_echo', text: 'reply', is_echo: true },
              },
            ],
          },
        ],
      };
      expect(parseMetaMessages(payload, 'facebook')).toEqual([]);
    });
  });
});
