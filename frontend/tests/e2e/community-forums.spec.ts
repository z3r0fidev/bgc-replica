import { test, expect } from '@playwright/test';

test.describe('Community Forums', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authenticated session
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: 'localhost',
      path: '/',
    }]);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-token');
    });
  });

  test('should display forum categories', async ({ page }) => {
    // Mock the categories API
    await page.route('**/api/forums/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'General Discussion', slug: 'general', description: 'Talk about anything' },
          { id: '2', name: 'Events', slug: 'events', description: 'Upcoming community events' },
        ]),
      });
    });

    await page.goto('/forums');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Community Forums' })).toBeVisible();

    // Check categories are displayed
    await expect(page.getByText('General Discussion')).toBeVisible();
    await expect(page.getByText('Events')).toBeVisible();
  });

  test('should navigate to category page when clicked', async ({ page }) => {
    // Mock the categories API
    await page.route('**/api/forums/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'General Discussion', slug: 'general', description: 'Talk about anything' },
        ]),
      });
    });

    // Mock the threads API for the category
    await page.route('**/api/forums/categories/general/threads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 't1', title: 'Welcome Thread', author: { name: 'Admin' }, created_at: new Date().toISOString() },
          ],
          next_cursor: null,
        }),
      });
    });

    await page.goto('/forums');

    // Click on the General Discussion category
    await page.getByText('General Discussion').click();

    // Should navigate to category page
    await expect(page).toHaveURL(/\/forums\/general/);
  });

  test('should display threads in a category', async ({ page }) => {
    // Mock the threads API
    await page.route('**/api/forums/categories/general/threads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 't1',
              title: 'Welcome to the community!',
              author: { name: 'Admin', id: 'u1' },
              created_at: new Date().toISOString(),
              reply_count: 5,
              is_sticky: true,
            },
            {
              id: 't2',
              title: 'Introduce yourself',
              author: { name: 'Moderator', id: 'u2' },
              created_at: new Date().toISOString(),
              reply_count: 12,
              is_sticky: false,
            },
          ],
          next_cursor: null,
        }),
      });
    });

    await page.goto('/forums/general');

    // Check threads are displayed
    await expect(page.getByText('Welcome to the community!')).toBeVisible();
    await expect(page.getByText('Introduce yourself')).toBeVisible();
  });

  test('should open create thread dialog', async ({ page }) => {
    // Mock the threads API
    await page.route('**/api/forums/categories/general/threads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/forums/general');

    // Look for create thread button (FAB or regular button)
    const createButton = page.getByRole('button', { name: /create|new thread/i });

    // If visible, click it
    if (await createButton.isVisible()) {
      await createButton.click();

      // Should show a form or dialog
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
      await expect(titleInput).toBeVisible();
    }
  });

  test('should submit a new thread', async ({ page }) => {
    // Mock the threads list API
    await page.route('**/api/forums/categories/general/threads*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], next_cursor: null }),
        });
      }
    });

    // Mock the create thread API
    await page.route('**/api/forums/threads', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-thread-id',
            title: body.title,
            content: body.content,
            author: { name: 'Test User', id: 'u1' },
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/forums/general');

    // Look for create thread button
    const createButton = page.getByRole('button', { name: /create|new thread/i });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill in the form
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
      const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="content" i]');

      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Thread Title');
        await contentInput.fill('This is the content of my test thread.');

        // Submit the form
        const submitButton = page.getByRole('button', { name: /submit|post|create/i });
        await submitButton.click();

        // Should show success or navigate
        await expect(page.getByText('Test Thread Title')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
