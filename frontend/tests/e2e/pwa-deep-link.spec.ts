import { test, expect } from '@playwright/test';

test.describe('PWA Deep-linking', () => {
  test('redirects from pwa-handler to profile page', async ({ page }) => {
    const testId = '123e4567-e89b-12d3-a456-426614174000';
    const protocolUrl = `web+bgclive://profile/${testId}`;
    
    await page.goto(`/pwa-handler?url=${encodeURIComponent(protocolUrl)}`);
    
    // Check if redirected to the correct internal URL
    await expect(page).toHaveURL(new RegExp(`/users/${testId}`));
  });

  test('redirects from pwa-handler to forum thread', async ({ page }) => {
    const testId = '123e4567-e89b-12d3-a456-426614174001';
    const protocolUrl = `web+bgclive://thread/${testId}`;
    
    await page.goto(`/pwa-handler?url=${encodeURIComponent(protocolUrl)}`);
    
    await expect(page).toHaveURL(new RegExp(`/forums/thread/${testId}`));
  });
});
