import { test, expect } from '@playwright/test';

test.describe('PWA installability', () => {
  test('manifest declares standalone display and required icons', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const m = await res.json();

    expect(m.display).toBe('standalone');
    expect(m.start_url).toBeTruthy();
    expect(m.theme_color).toBeTruthy();
    expect(m.background_color).toBeTruthy();

    const sizes = (m.icons as Array<{ sizes: string; purpose?: string }>).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

    const hasMaskable = (m.icons as Array<{ purpose?: string }>).some((i) =>
      (i.purpose ?? '').includes('maskable'),
    );
    expect(hasMaskable).toBeTruthy();
  });

  test('service worker is reachable', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect([200, 304]).toContain(res.status());
    const body = await res.text();
    // Sanity: must look like a service worker.
    expect(body).toMatch(/self\.addEventListener|workbox|caches/);
  });
});
