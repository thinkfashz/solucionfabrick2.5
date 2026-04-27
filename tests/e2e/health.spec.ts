import { test, expect } from '@playwright/test';

test('health endpoint returns ok payload', async ({ request }) => {
  const res = await request.get('/api/health');
  expect([200, 503]).toContain(res.status());
  const json = await res.json();
  expect(typeof json.ok).toBe('boolean');
  expect(typeof json.timestamp).toBe('string');
  expect(json.checks).toBeDefined();
});
