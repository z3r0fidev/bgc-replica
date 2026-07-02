import { test, expect } from '@playwright/test';

test.describe('Social Feed', () => {
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

  test('should display the feed page with post composer', async ({ page }) => {
    // Mock the feed API
    await page.route('**/api/feed/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/feed');

    // Check post composer is visible
    const textarea = page.getByPlaceholder(/what's on your mind/i);
    await expect(textarea).toBeVisible();

    // Check post button exists
    const postButton = page.getByRole('button', { name: /post/i });
    await expect(postButton).toBeVisible();
  });

  test('should display feed posts', async ({ page }) => {
    // Mock the feed API with posts
    await page.route('**/api/feed/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'p1',
              content: 'Hello, this is my first post!',
              author_id: 'u1',
              author: { id: 'u1', name: 'John Doe' },
              created_at: new Date().toISOString(),
              likes_count: 5,
              comments_count: 2,
            },
            {
              id: 'p2',
              content: 'Another great day in the community.',
              author_id: 'u2',
              author: { id: 'u2', name: 'Jane Smith' },
              created_at: new Date().toISOString(),
              likes_count: 10,
              comments_count: 3,
            },
          ],
          next_cursor: null,
        }),
      });
    });

    await page.goto('/feed');

    // Wait for loading to complete
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10000 });

    // Check posts are displayed
    await expect(page.getByText('Hello, this is my first post!')).toBeVisible();
    await expect(page.getByText('Another great day in the community.')).toBeVisible();
  });

  test('should switch between Global and Following tabs', async ({ page }) => {
    // Mock both feed types
    await page.route('**/api/feed/?feed_type=global*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 'g1', content: 'Global post', author_id: 'user1', author: { id: 'user1', name: 'User1' }, created_at: new Date().toISOString() }],
          next_cursor: null,
        }),
      });
    });

    await page.route('**/api/feed/?feed_type=following*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 'f1', content: 'Following post', author_id: 'friend1', author: { id: 'friend1', name: 'Friend' }, created_at: new Date().toISOString() }],
          next_cursor: null,
        }),
      });
    });

    await page.goto('/feed');

    // Check Global tab is active by default
    const globalTab = page.getByRole('tab', { name: /global/i });
    await expect(globalTab).toHaveAttribute('data-state', 'active');

    // Click Following tab
    const followingTab = page.getByRole('tab', { name: /following/i });
    await followingTab.click();

    // Verify Following tab is now active
    await expect(followingTab).toHaveAttribute('data-state', 'active');
  });

  test('should submit a new post', async ({ page }) => {
    // Mock the feed GET API
    await page.route('**/api/feed/?feed_type=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    // Mock the feed POST API
    let postCreated = false;
    await page.route('**/api/feed/', async (route) => {
      if (route.request().method() === 'POST') {
        postCreated = true;
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-post-id',
            content: body.content,
            author_id: 'me',
            author: { id: 'me', name: 'Test User' },
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/feed');

    // Type in the post composer
    const textarea = page.getByPlaceholder(/what's on your mind/i);
    await textarea.fill('This is my test post from E2E!');

    // Click post button
    const postButton = page.getByRole('button', { name: /post/i });
    await postButton.click();

    // Wait for the post to be submitted
    await expect(async () => {
      expect(postCreated).toBe(true);
    }).toPass({ timeout: 5000 });

    // Should show success toast
    await expect(page.getByText(/status updated/i)).toBeVisible({ timeout: 5000 });
  });

  test('should disable post button when textarea is empty', async ({ page }) => {
    // Mock the feed API
    await page.route('**/api/feed/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/feed');

    // Check post button is disabled initially
    const postButton = page.getByRole('button', { name: /post/i });
    await expect(postButton).toBeDisabled();

    // Type something
    const textarea = page.getByPlaceholder(/what's on your mind/i);
    await textarea.fill('Hello!');

    // Button should be enabled
    await expect(postButton).toBeEnabled();

    // Clear the textarea
    await textarea.clear();

    // Button should be disabled again
    await expect(postButton).toBeDisabled();
  });

  test('should show empty state when no posts', async ({ page }) => {
    // Mock empty feed
    await page.route('**/api/feed/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      });
    });

    await page.goto('/feed');

    // Wait for loading to complete
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10000 });

    // Should show empty state message
    await expect(page.getByText(/no activity yet/i)).toBeVisible();
  });
});
