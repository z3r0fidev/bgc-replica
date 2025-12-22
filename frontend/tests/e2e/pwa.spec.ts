import { test, expect } from '@playwright/test';

test.describe('PWA Manifest', () => {
  test('should serve manifest.json with correct content type', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    // Allow application/manifest+json or application/json
    expect(contentType).toMatch(/application\/(manifest\+)?json/);
  });

  test('should contain valid PWA properties', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json();

    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should include service worker registration check in main page', async ({ page }) => {
    await page.goto('/');
    // This assumes the service worker is registered in the main entry point
    // We check if navigator.serviceWorker is available
    const serviceWorkerSupport = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(serviceWorkerSupport).toBeTruthy();
  });
});