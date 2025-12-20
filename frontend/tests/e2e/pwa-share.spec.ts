import { test, expect } from '@playwright/test';

test.describe('PWA Share Target', () => {
  test('share-target manifest entry is present', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();
    
    expect(manifest.share_target).toBeDefined();
    expect(manifest.share_target.action).toBe('/api/feed/share');
    expect(manifest.share_target.method).toBe('POST');
  });
});
