import { describe, it, expect } from 'vitest';
import { cloudinaryUrl, cloudinaryLoader, isCloudinaryUrl } from '@/lib/cloudinaryLoader';

const BASE = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
const BASE_NO_EXT = 'https://res.cloudinary.com/demo/image/upload/folder/sample';

describe('isCloudinaryUrl', () => {
  it('detects res.cloudinary.com', () => {
    expect(isCloudinaryUrl(BASE)).toBe(true);
    expect(isCloudinaryUrl('https://res.cloudinary.com/x/image/upload/y.png')).toBe(true);
  });
  it('rejects other origins, data URIs and garbage', () => {
    expect(isCloudinaryUrl('https://images.unsplash.com/photo.jpg')).toBe(false);
    expect(isCloudinaryUrl('data:image/png;base64,AAA')).toBe(false);
    expect(isCloudinaryUrl('')).toBe(false);
    expect(isCloudinaryUrl('not a url')).toBe(false);
  });
});

describe('cloudinaryUrl', () => {
  it('passes through non-Cloudinary URLs unchanged', () => {
    const u = 'https://images.unsplash.com/photo-123?w=800';
    expect(cloudinaryUrl(u, { width: 400 })).toBe(u);
  });

  it('injects f_auto,q_auto when no transforms exist', () => {
    expect(cloudinaryUrl(BASE)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg',
    );
  });

  it('injects width + c_limit + dpr_auto when requested', () => {
    expect(cloudinaryUrl(BASE, { width: 480, dpr: 'auto' })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_480,c_limit,dpr_auto/sample.jpg',
    );
  });

  it('honours numeric quality override', () => {
    expect(cloudinaryUrl(BASE, { width: 800, quality: 75 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_75,w_800,c_limit/sample.jpg',
    );
  });

  it('clamps quality to 1..100', () => {
    expect(cloudinaryUrl(BASE, { quality: 0 })).toContain('q_1');
    expect(cloudinaryUrl(BASE, { quality: 999 })).toContain('q_100');
  });

  it('is idempotent — does not duplicate existing tokens', () => {
    const once = cloudinaryUrl(BASE, { width: 600, dpr: 'auto' });
    const twice = cloudinaryUrl(once, { width: 600, dpr: 'auto' });
    expect(twice).toBe(once);
  });

  it('merges into an existing transformation list instead of stacking', () => {
    const pre = 'https://res.cloudinary.com/demo/image/upload/q_70/sample.jpg';
    const out = cloudinaryUrl(pre, { width: 300 });
    // existing q_70 is preserved, w_300 + c_limit + f_auto added
    expect(out).toBe(
      'https://res.cloudinary.com/demo/image/upload/q_70,f_auto,w_300,c_limit/sample.jpg',
    );
  });

  it('lets an existing q_<n> token win over an explicit quality param', () => {
    // Caller asks for q_30 but URL already pinned q_70 — keep the existing one
    // so admins can lock per-asset quality without us silently overriding it.
    const pre = 'https://res.cloudinary.com/demo/image/upload/q_70/sample.jpg';
    expect(cloudinaryUrl(pre, { quality: 30 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/q_70,f_auto/sample.jpg',
    );
  });

  it('works on URLs without an extension', () => {
    expect(cloudinaryUrl(BASE_NO_EXT, { width: 200 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_200,c_limit/folder/sample',
    );
  });

  it('handles /fetch/ delivery type', () => {
    const u = 'https://res.cloudinary.com/demo/image/fetch/https://example.com/a.jpg';
    expect(cloudinaryUrl(u)).toBe(
      'https://res.cloudinary.com/demo/image/fetch/f_auto,q_auto/https://example.com/a.jpg',
    );
  });

  it('returns garbage strings unchanged', () => {
    expect(cloudinaryUrl('')).toBe('');
    expect(cloudinaryUrl('not a url', { width: 100 })).toBe('not a url');
  });
});

describe('cloudinaryLoader', () => {
  it('produces a next/image-compatible URL with width + dpr_auto', () => {
    expect(cloudinaryLoader({ src: BASE, width: 640 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit,dpr_auto/sample.jpg',
    );
  });
  it('respects an explicit quality', () => {
    expect(cloudinaryLoader({ src: BASE, width: 320, quality: 60 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_60,w_320,c_limit,dpr_auto/sample.jpg',
    );
  });
  it('passes through non-Cloudinary src', () => {
    const u = 'https://images.unsplash.com/photo.jpg';
    expect(cloudinaryLoader({ src: u, width: 400 })).toBe(u);
  });
});
