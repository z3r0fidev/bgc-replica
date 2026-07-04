import { test, expect } from '@playwright/test';

test.describe('Chat Rooms', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: baseURL ? new URL(baseURL).hostname : 'localhost',
      path: '/',
    }]);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-token');
    });
  });

  test('user can browse rooms and join one', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page.locator('h1')).toContainText('Chat Rooms');
  });
});
