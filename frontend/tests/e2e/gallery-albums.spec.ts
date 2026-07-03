import { test, expect } from '@playwright/test';

test.describe('Gallery Albums', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    // Set up authenticated session
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

  test('should display albums list page', async ({ page }) => {
    // Mock the albums API
    await page.route('**/api/gallery/albums*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], next_cursor: null }),
        });
      }
    });

    await page.goto('/gallery/albums');

    // Check page title
    const heading = page.getByRole('heading', { name: /my albums/i });
    await expect(heading).toBeVisible();

    // Check new album button
    const newAlbumButton = page.getByRole('button', { name: /new album/i });
    await expect(newAlbumButton).toBeVisible();
  });

  test('should show empty state when no albums', async ({ page }) => {
    await page.route('**/api/gallery/albums*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/gallery/albums');

    // Check empty state message
    const emptyMessage = page.getByText(/no albums yet/i);
    await expect(emptyMessage).toBeVisible();
  });

  test('should display album cards with covers', async ({ page }) => {
    await page.route('**/api/gallery/albums*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'album-1',
              title: 'Summer Vacation',
              description: 'Photos from summer trip',
              cover_url: 'https://example.com/cover1.jpg',
              privacy: 'PUBLIC',
              media_count: 25,
              created_at: new Date().toISOString(),
            },
            {
              id: 'album-2',
              title: 'Family',
              description: null,
              cover_url: null,
              privacy: 'PRIVATE',
              media_count: 10,
              created_at: new Date().toISOString(),
            },
          ],
          next_cursor: null,
        }),
      });
    });

    await page.goto('/gallery/albums');

    // Check album titles
    await expect(page.getByText('Summer Vacation')).toBeVisible();
    await expect(page.getByText('Family')).toBeVisible();

    // Check media count displays
    await expect(page.getByText('25 items')).toBeVisible();
    await expect(page.getByText('10 items')).toBeVisible();
  });

  test('should open create album dialog', async ({ page }) => {
    await page.route('**/api/gallery/albums*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/gallery/albums');

    // Click new album button
    const newAlbumButton = page.getByRole('button', { name: /new album/i });
    await newAlbumButton.click();

    // Check dialog is visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Check form fields
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();

    const descriptionInput = page.getByLabel(/description/i);
    await expect(descriptionInput).toBeVisible();
  });

  test('should navigate to album detail page', async ({ page }) => {
    await page.route('**/api/gallery/albums', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{
            id: 'album-1',
            title: 'Test Album',
            privacy: 'PUBLIC',
            media_count: 5,
            created_at: new Date().toISOString(),
          }],
          next_cursor: null,
        }),
      });
    });

    await page.route('**/api/gallery/albums/album-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'album-1',
          title: 'Test Album',
          privacy: 'PUBLIC',
          media_count: 0,
          media: [],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/gallery/albums');

    // Click on album card
    const albumCard = page.getByText('Test Album');
    await albumCard.click();

    // Should navigate to album detail
    await expect(page).toHaveURL(/\/gallery\/albums\/album-1/);
  });

  test('should display album detail page', async ({ page }) => {
    await page.route('**/api/gallery/albums/album-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'album-1',
          title: 'Beach Photos',
          description: 'Summer 2024 beach trip',
          privacy: 'PUBLIC',
          media_count: 3,
          media: [
            { id: 'm1', type: 'IMAGE', url: 'https://example.com/img1.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
            { id: 'm2', type: 'IMAGE', url: 'https://example.com/img2.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
            { id: 'm3', type: 'IMAGE', url: 'https://example.com/img3.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
          ],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/gallery/albums/album-1');

    // Check title displays
    await expect(page.getByRole('heading', { name: 'Beach Photos' })).toBeVisible();

    // Check description displays
    await expect(page.getByText('Summer 2024 beach trip')).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: /add photos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /share/i })).toBeVisible();
  });

  test('should open share dialog on album detail', async ({ page }) => {
    await page.route('**/api/gallery/albums/album-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'album-1',
          title: 'Shareable Album',
          privacy: 'PUBLIC',
          media_count: 0,
          media: [],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/gallery/albums/album-1');

    // Click share button
    const shareButton = page.getByRole('button', { name: /share/i });
    await shareButton.click();

    // Check share dialog opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Check dialog contains share options
    await expect(page.getByText(/share album/i)).toBeVisible();
    await expect(page.getByText(/expires in/i)).toBeVisible();
  });

  test('should toggle reorder mode in album', async ({ page }) => {
    await page.route('**/api/gallery/albums/album-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'album-1',
          title: 'Test Album',
          privacy: 'PUBLIC',
          media_count: 3,
          media: [
            { id: 'm1', type: 'IMAGE', url: 'https://example.com/img1.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
            { id: 'm2', type: 'IMAGE', url: 'https://example.com/img2.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
            { id: 'm3', type: 'IMAGE', url: 'https://example.com/img3.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
          ],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/gallery/albums/album-1');

    // Click reorder button
    const reorderButton = page.getByRole('button', { name: /reorder/i });
    await reorderButton.click();

    // Check reorder mode is active
    await expect(page.getByText(/drag and drop photos/i)).toBeVisible();

    // Button should now say "Done"
    await expect(page.getByRole('button', { name: /done/i })).toBeVisible();
  });

  test('should access shared album without authentication', async ({ page, context }) => {
    // Clear authentication
    await context.clearCookies();

    await page.route('**/api/gallery/albums/shared/test-token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'album-1',
          title: 'Shared Album',
          description: 'This is a shared album',
          privacy: 'PUBLIC',
          media_count: 2,
          media: [
            { id: 'm1', type: 'IMAGE', url: 'https://example.com/img1.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
            { id: 'm2', type: 'IMAGE', url: 'https://example.com/img2.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() },
          ],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/shared/album/test-token');

    // Check shared album displays
    await expect(
      page.getByRole("heading", { name: "Shared Album" })
    ).toBeVisible();
    await expect(page.getByText("This is a shared album")).toBeVisible();
  });

  test('should show error for expired shared album', async ({ page, context }) => {
    await context.clearCookies();

    await page.route('**/api/gallery/albums/shared/expired-token*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Share link has expired' }),
      });
    });

    await page.goto('/shared/album/expired-token');

    // Check error message displays
    await expect(page.getByText(/album not available/i)).toBeVisible();
  });
});
