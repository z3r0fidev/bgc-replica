import { test, expect } from '@playwright/test';

test.describe('Advanced Search', () => {
  test.beforeEach(async ({ page, context }) => {
    // Authenticate the user for each test
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: 'localhost',
      path: '/',
    }]);
  });

  test('should apply filters and update results', async ({ page }) => {
    const searchUrl = '**/api/search/**';
    
    // Intercept search API call
    await page.route(searchUrl, async (route) => {
      const url = new URL(route.request().url());
      // Verify query params are being passed
      expect(url.searchParams.get('ethnicity')).toBe('Black');
      expect(url.searchParams.get('position')).toBe('Top');
      
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
    await page.waitForLoadState('networkidle');

    // Open filters and select options
    
    // Select Ethnicity: Black
    // Robust selector: Find the container with the label "Ethnicity", then find the combobox inside it.
    await page.locator('div').filter({ has: page.getByText('Ethnicity') }).getByRole('combobox').click();
    await page.getByRole('option', { name: 'Black', exact: true }).click();

    // Select Position: Top
    await page.locator('div').filter({ has: page.getByText('Position') }).getByRole('combobox').click();
    await page.getByRole('option', { name: 'Top', exact: true }).click();

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
    await page.waitForLoadState('networkidle');

    // Click GPS button
    await page.getByRole('button', { name: /Use My Location/i }).click();

    // Verify visual feedback
    // Find the location input (which has the placeholder) and check its value
    await expect(page.getByPlaceholder('Or Search by City...')).toHaveValue('My Current Location');
    
    // Verify toast notification
    await expect(page.getByText('Location acquired!')).toBeVisible();
  });
});
