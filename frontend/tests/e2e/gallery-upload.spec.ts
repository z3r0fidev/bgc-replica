import { test, expect } from '@playwright/test';

test.describe('Gallery Upload', () => {
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

  test('should display gallery page with upload tab', async ({ page }) => {
    // Mock the gallery API
    await page.route('**/api/gallery/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null, total_count: 0 }),
      });
    });

    await page.goto('/gallery');

    // Check gallery tab exists
    const galleryTab = page.getByRole('tab', { name: /gallery/i });
    await expect(galleryTab).toBeVisible();

    // Check upload tab exists
    const uploadTab = page.getByRole('tab', { name: /upload/i });
    await expect(uploadTab).toBeVisible();
  });

  test('should show upload dropzone when clicking upload tab', async ({ page }) => {
    await page.route('**/api/gallery/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null, total_count: 0 }),
      });
    });

    await page.goto('/gallery');

    // Click upload tab
    const uploadTab = page.getByRole('tab', { name: /upload/i });
    await uploadTab.click();

    // Check dropzone is visible
    const dropzone = page.getByText(/drag & drop files/i);
    await expect(dropzone).toBeVisible();
  });

  test('should show privacy selector in upload form', async ({ page }) => {
    await page.route('**/api/gallery/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null, total_count: 0 }),
      });
    });

    await page.goto('/gallery');

    // Click upload tab
    const uploadTab = page.getByRole('tab', { name: /upload/i });
    await uploadTab.click();

    // Check privacy selector exists
    const privacySelector = page.getByText(/upload as/i);
    await expect(privacySelector).toBeVisible();
  });

  test('should display gallery grid with images', async ({ page }) => {
    // Mock gallery with images
    await page.route('**/api/gallery/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'media-1',
              type: 'IMAGE',
              url: 'https://example.com/image1.jpg',
              thumbnail_url: 'https://example.com/thumb1.jpg',
              privacy: 'PUBLIC',
              view_count: 10,
              created_at: new Date().toISOString(),
            },
            {
              id: 'media-2',
              type: 'VIDEO',
              url: 'https://example.com/video1.mp4',
              thumbnail_url: 'https://example.com/thumb2.jpg',
              privacy: 'PRIVATE',
              duration_seconds: 120,
              view_count: 5,
              created_at: new Date().toISOString(),
            },
          ],
          next_cursor: null,
          total_count: 2,
        }),
      });
    });

    await page.goto('/gallery');

    // Check images are displayed
    const images = page.locator('img[alt="Gallery item"]');
    await expect(images.first()).toBeVisible();
  });

  test('should open lightbox when clicking an image', async ({ page }) => {
    await page.route('**/api/gallery/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'media-1',
              type: 'IMAGE',
              url: 'https://example.com/image1.jpg',
              thumbnail_url: 'https://example.com/thumb1.jpg',
              privacy: 'PUBLIC',
              view_count: 10,
              created_at: new Date().toISOString(),
            },
          ],
          next_cursor: null,
          total_count: 1,
        }),
      });
    });

    await page.goto('/gallery');

    // Click on image
    const image = page.locator('img[alt="Gallery item"]').first();
    await image.click();

    // Check lightbox opens (it covers the screen with dark background)
    const lightbox = page.locator('.fixed.inset-0');
    await expect(lightbox).toBeVisible();
  });

  test('should close lightbox with escape key', async ({ page }) => {
    await page.route('**/api/gallery/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'media-1',
              type: 'IMAGE',
              url: 'https://example.com/image1.jpg',
              thumbnail_url: 'https://example.com/thumb1.jpg',
              privacy: 'PUBLIC',
              view_count: 10,
              created_at: new Date().toISOString(),
            },
          ],
          next_cursor: null,
          total_count: 1,
        }),
      });
    });

    await page.goto('/gallery');

    // Click on image to open lightbox
    const image = page.locator('img[alt="Gallery item"]').first();
    await image.click();

    // Verify lightbox is open
    const lightbox = page.locator('.fixed.inset-0');
    await expect(lightbox).toBeVisible();

    // Press escape to close
    await page.keyboard.press('Escape');

    // Lightbox should be closed
    await expect(lightbox).not.toBeVisible();
  });

  test('should filter gallery by type', async ({ page }) => {
    await page.route('**/api/gallery/*', async (route) => {
      const url = route.request().url();
      if (url.includes('type=IMAGE')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: 'img-1', type: 'IMAGE', url: 'test.jpg', privacy: 'PUBLIC', view_count: 0, created_at: new Date().toISOString() }],
            next_cursor: null,
            total_count: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], next_cursor: null, total_count: 0 }),
        });
      }
    });

    await page.goto('/gallery');

    // Click photos filter tab
    const photosTab = page.getByRole('tab', { name: /photos/i });
    await photosTab.click();

    // Should have made filtered request
  });
});
