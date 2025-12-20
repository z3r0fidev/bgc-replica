import { test, expect } from '@playwright/test';

test.describe('Chat Rooms', () => {
  test('user can browse rooms and join one', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page.locator('h1')).toContainText('Chat Rooms');
  });
});
