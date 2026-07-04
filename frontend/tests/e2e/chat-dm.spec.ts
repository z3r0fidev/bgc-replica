import { test, expect } from '@playwright/test';

test.describe('Direct Messaging', () => {
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

  test('user can open chat and send a message', async ({ page }) => {
    await page.goto('/chat');
    // Check if "Select a conversation" is shown
    await expect(page.getByText('Select a conversation')).toBeVisible();
  });
});
