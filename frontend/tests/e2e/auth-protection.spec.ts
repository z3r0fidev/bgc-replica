import { test, expect } from '@playwright/test';

test.describe('Auth Protection', () => {
  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/profile/edit');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('from=%2Fprofile%2Fedit');
  });

  test('should allow access to protected routes when authenticated', async ({ page, context }) => {
    // Manually set the access_token cookie to simulate being logged in
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: 'localhost',
      path: '/',
    }]);

    // Try to access a protected route
    await page.goto('/profile/edit');
    
    // Should NOT be redirected to login (even if it's a 404 or empty page, the URL should be correct)
    await expect(page).toHaveURL(/\/profile\/edit/);
    await expect(page).not.toHaveURL(/\/login/);
  });
});
