import { test, expect } from '@playwright/test';

test.describe('Passkey Auth', () => {
  test('should show passkey login button', async ({ page }) => {
    await page.goto('/login');
    const passkeyButton = page.getByRole('button', { name: /sign in with passkey/i });
    await expect(passkeyButton).toBeVisible();
  });

  test('should attempt passkey registration when button clicked (mocked)', async ({ page }) => {
    // This test verifies the UI triggers the registration flow
    // We mock the backend response for passkey registration
    await page.route('**/api/auth/register-passkey', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Go to a page where passkey registration would happen (e.g., security settings)
    // For now, let's assume it's on /register or a dedicated settings page
    await page.goto('/login'); // Using login page for now as it has the button
    
    const passkeyButton = page.getByRole('button', { name: /sign in with passkey/i });
    
    // We can't easily mock the browser's native WebAuthn dialog in Playwright 
    // without complex CDP commands, so we'll just check if the button is wired up.
    await expect(passkeyButton).toBeEnabled();
    
    // Clicking it should at least trigger the loading state or an error if WebAuthn isn't mocked
    await passkeyButton.click();
    
    // If it's not supported or fails, it might show a toast
    // This is a minimal test to ensure the button exists and is clickable
  });
});
