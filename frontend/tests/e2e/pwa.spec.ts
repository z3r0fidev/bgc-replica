import { test, expect } from '@playwright/test';

test('manifest.json has correct properties', async ({ page }) => {
  const response = await page.goto('/manifest.json');
  expect(response?.status()).toBe(200);
  const manifest = await response?.json();
  expect(manifest.name).toBe('BGCLive Replica');
  expect(manifest.short_name).toBe('BGCLive');
  expect(manifest.display).toBe('standalone');
});

test('landing page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Welcome to the Community');
  await expect(page.locator('header')).toContainText('BGCLive');
});
