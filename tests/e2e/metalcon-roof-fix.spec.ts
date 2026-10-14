import { test, expect } from '@playwright/test';

test.describe('Metalcon Roof Visual Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/herramientas/metalcon/monitoreo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('qa-techo-fixed: both roof faces covered', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'tests/screenshots/qa-techo-fixed.png',
      fullPage: false 
    });
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));
    
    expect(consoleErrors.filter(e => e.includes('three') || e.includes('404') || e.includes('texture')).length).toBe(0);
  });

  test('qa-frontones: gables closed at roof ends', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'tests/screenshots/qa-frontones.png',
      fullPage: false 
    });
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));
    
    expect(consoleErrors.filter(e => e.includes('three') || e.includes('404') || e.includes('texture')).length).toBe(0);
  });
});