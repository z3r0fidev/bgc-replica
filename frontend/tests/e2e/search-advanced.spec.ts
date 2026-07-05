import { test, expect } from '@playwright/test';

test.describe('Advanced Search', () => {
  // Default mock response for search API
  // Note: profile.user.name is used for display (see users/page.tsx:406)
  const mockSearchResponse = {
    items: [
      {
        id: '1',
        user: { id: '1', name: 'Test User' },
        height: "5'10",
        location_city: 'Atlanta',
        ethnicity: 'Black',
        position: 'Top'
      }
    ],
    metadata: { has_next: false, count: 1 }
  };

  test.beforeEach(async ({ page, context, baseURL }) => {
    // Authenticate the user for each test
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: baseURL ? new URL(baseURL).hostname : 'localhost',
      path: '/',
    }]);
    // Also set in localStorage for client-side checks
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-token');
    });
  });

  test('should apply filters and update results', async ({ page }) => {
    // Use pattern without trailing slashes to match cross-origin requests
    const searchUrl = '**/api/search**';

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
        body: JSON.stringify(mockSearchResponse),
      });
    });

    await page.goto('/users');
    // Wait for page hydration to complete (important for WebKit)
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to be fully loaded and hydrated
    await expect(page.getByRole('button', { name: /Apply Filters/i })).toBeVisible();

    // Select Ethnicity: Black
    // Find the combobox by locating its trigger text "All Ethnicities"
    const ethnicityTrigger = page.getByText('All Ethnicities');
    await expect(ethnicityTrigger).toBeVisible({ timeout: 10000 });
    await ethnicityTrigger.click();

    // Wait for Radix portal animation to complete (200ms animation + buffer)
    await page.waitForTimeout(300);

    // Wait for dropdown to appear (Radix uses a Portal) and select
    const blackOption = page.getByRole('option', { name: 'Black', exact: true });
    await expect(blackOption).toBeVisible({ timeout: 5000 });
    await blackOption.click();

    // Wait for dropdown to close and animation to settle
    await page.waitForTimeout(200);

    // Wait for the select to close - the trigger should now show "Black"
    await expect(page.getByText('Black').first()).toBeVisible({ timeout: 5000 });

    // Select Position: Top
    // Find the combobox by locating its trigger text "All Positions"
    const positionTrigger = page.getByText('All Positions');
    await expect(positionTrigger).toBeVisible({ timeout: 5000 });
    await positionTrigger.click();

    // Wait for portal animation
    await page.waitForTimeout(300);

    const topOption = page.getByRole('option', { name: 'Top', exact: true });
    await expect(topOption).toBeVisible({ timeout: 5000 });
    await topOption.click();

    // Wait for dropdown to close
    await page.waitForTimeout(200);

    // Wait for the select to show "Top" (using first() to avoid ambiguity)
    await expect(page.locator('[data-slot="select-value"]').filter({ hasText: 'Top' })).toBeVisible({ timeout: 5000 });

    // Click Apply Filters
    const responsePromise = page.waitForResponse(searchUrl);
    await page.getByRole('button', { name: /Apply Filters/i }).click();

    await responsePromise;

    // Verify result is displayed
    await expect(page.getByText('Atlanta')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should handle "Use My Location" functionality', async ({ page, context }) => {
    // Mock search API to prevent real backend calls
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSearchResponse),
      });
    });

    // Grant geolocation permissions
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.7490, longitude: -84.3880 });

    await page.goto('/users');
    // Wait for page hydration (important for WebKit)
    await page.waitForLoadState('domcontentloaded');

    // Wait for GPS button to be ready
    const gpsButton = page.getByRole('button', { name: /Use My Location/i });
    await expect(gpsButton).toBeEnabled({ timeout: 10000 });

    // Click GPS button
    await gpsButton.click();

    // Wait for geolocation API call to complete (WebKit may be slower)
    await page.waitForTimeout(500);

    // Verify visual feedback
    // Find the location input (which has the placeholder) and check its value
    await expect(page.getByPlaceholder('Or Search by City...')).toHaveValue('My Current Location', { timeout: 5000 });

    // Verify toast notification
    await expect(page.getByText('Location acquired!')).toBeVisible({ timeout: 5000 });
  });
});
