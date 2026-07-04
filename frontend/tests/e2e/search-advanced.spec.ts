import { test, expect } from '@playwright/test';

test.describe('Advanced Search', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    // Authenticate the user for each test
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: baseURL ? new URL(baseURL).hostname : 'localhost',
      path: '/',
    }]);
  });

  test('should apply filters and update results', async ({ page }) => {
    const searchUrl = '**/api/search/**';

    // Intercept search API call. The /users page fires an automatic
    // unfiltered search on mount (before any filter is selected), so this
    // route fires more than once - only assert on query params once the
    // filtered request actually goes out, rather than on every match.
    await page.route(searchUrl, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('ethnicity')) {
        expect(url.searchParams.get('ethnicity')).toBe('Black');
        expect(url.searchParams.get('position')).toBe('Top');
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: '1', name: 'Test User', height: "5'10", location_city: 'Atlanta', ethnicity: 'Black', position: 'Top' }
          ],
          metadata: { has_next: false, count: 1 }
        }),
      });
    });

    await page.goto('/users');

    // Wait for page to be fully loaded and hydrated
    await expect(page.getByRole('button', { name: /Apply Filters/i })).toBeVisible();

    // Select Ethnicity: Black
    // Find the combobox that currently shows "All Ethnicities" (the default value)
    const ethnicityTrigger = page.getByRole('combobox', { name: /All Ethnicities/i });
    await expect(ethnicityTrigger).toBeVisible({ timeout: 10000 });
    await ethnicityTrigger.click();

    // Wait for dropdown to appear (Radix uses a Portal) and select
    const blackOption = page.getByRole('option', { name: 'Black', exact: true });
    await expect(blackOption).toBeVisible({ timeout: 5000 });
    await blackOption.click();

    // Wait for the select to close - the trigger should now show "Black"
    await expect(page.getByRole('combobox', { name: /Black/i })).toBeVisible();

    // Select Position: Top
    // Find the combobox that currently shows "All Positions"
    const positionTrigger = page.getByRole('combobox', { name: /All Positions/i });
    await expect(positionTrigger).toBeVisible({ timeout: 5000 });
    await positionTrigger.click();

    const topOption = page.getByRole('option', { name: 'Top', exact: true });
    await expect(topOption).toBeVisible({ timeout: 5000 });
    await topOption.click();

    // Wait for the select to close
    await expect(page.getByRole('combobox', { name: /^Top$/i })).toBeVisible();

    // Click Apply Filters
    const responsePromise = page.waitForResponse(searchUrl);
    await page.getByRole('button', { name: /Apply Filters/i }).click();

    await responsePromise;

    // Verify result is displayed
    await expect(page.getByText('Atlanta')).toBeVisible();
    await expect(page.getByText('User 1')).toBeVisible();
  });

  test('should handle "Use My Location" functionality', async ({ page, context }) => {
    // Grant geolocation permissions
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.7490, longitude: -84.3880 });

    await page.goto('/users');

    // Click GPS button
    await page.getByRole('button', { name: /Use My Location/i }).click();

    // Verify visual feedback
    // Find the location input (which has the placeholder) and check its value
    await expect(page.getByPlaceholder('Or Search by City...')).toHaveValue('My Current Location');
    
    // Verify toast notification
    await expect(page.getByText('Location acquired!')).toBeVisible();
  });
});
