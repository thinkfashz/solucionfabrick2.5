import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildWhatsAppLink,
  getWhatsAppNumber,
  DEFAULT_WHATSAPP_MESSAGE,
  WHATSAPP_DISPLAY,
} from '@/lib/whatsapp';

const ENV_KEY = 'NEXT_PUBLIC_WHATSAPP_NUMBER';

describe('getWhatsAppNumber', () => {
  const original = process.env[ENV_KEY];

  beforeEach(() => {
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it('falls back to operative number when env var is unset', () => {
    expect(getWhatsAppNumber()).toBe('56930121625');
  });

  it('reads digits from the env var', () => {
    process.env[ENV_KEY] = '56987654321';
    expect(getWhatsAppNumber()).toBe('56987654321');
  });

  it('strips non-digits (spaces, plus, dashes)', () => {
    process.env[ENV_KEY] = '+56 9 8765-4321';
    expect(getWhatsAppNumber()).toBe('56987654321');
  });
});

describe('buildWhatsAppLink', () => {
  it('uses the default message when no argument is provided', () => {
    const url = buildWhatsAppLink();
    expect(url.startsWith('https://wa.me/')).toBe(true);
    expect(url).toContain(encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE));
  });

  it('URL-encodes the custom message', () => {
    const url = buildWhatsAppLink('Hola, ¿pueden visitarme?');
    expect(url).toContain('%C2%BFpueden'); // ¿
    expect(url).toContain('%20'); // spaces
  });
});

describe('module exports', () => {
  it('exposes a stable display number', () => {
    expect(WHATSAPP_DISPLAY).toMatch(/\+56/);
  });

  it('default message mentions Linares + Maule', () => {
    expect(DEFAULT_WHATSAPP_MESSAGE).toContain('Linares');
    expect(DEFAULT_WHATSAPP_MESSAGE).toContain('Maule');
  });
});
