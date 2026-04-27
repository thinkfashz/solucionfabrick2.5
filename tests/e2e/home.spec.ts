import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('renders without CSP/script errors', async ({ page }) => {
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /Content Security Policy|nonce/.test(msg.text())) {
        cspViolations.push(msg.text());
      }
    });

    const response = await page.goto('/');
    expect(response?.ok(), 'home should respond 2xx').toBeTruthy();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);

    expect(cspViolations, cspViolations.join('\n')).toHaveLength(0);
  });

  test('exposes manifest', async ({ page }) => {
    const manifest = await page.request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    const json = await manifest.json();
    expect(json.name).toBeTruthy();
    expect(Array.isArray(json.icons)).toBeTruthy();
  });
});
