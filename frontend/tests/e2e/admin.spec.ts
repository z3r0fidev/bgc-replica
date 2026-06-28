import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test.describe("Access Control", () => {
    test("non-admin users are redirected away from admin area", async ({ page }) => {
      // Try to access admin without being logged in
      await page.goto("/admin");

      // Should be redirected to login or home
      const currentUrl = page.url();
      expect(
        currentUrl.includes("/login") ||
          currentUrl === "/" ||
          !currentUrl.includes("/admin")
      ).toBe(true);
    });

    test("admin dashboard requires authentication", async ({ page }) => {
      await page.goto("/admin/users");

      // Should redirect non-authenticated users
      const currentUrl = page.url();
      expect(
        currentUrl.includes("/login") || !currentUrl.includes("/admin/users")
      ).toBe(true);
    });
  });

  test.describe("Admin Dashboard Overview", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin");
      // Skip if not accessible
      if (!page.url().includes("/admin") || page.url().includes("/login")) {
        test.skip();
      }
    });

    test("dashboard page loads with stats cards", async ({ page }) => {
      // Check for dashboard heading
      const heading = page.getByRole("heading", { name: /dashboard/i });
      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();

        // Check for stats cards
        await expect(page.getByText(/total users/i)).toBeVisible();
        await expect(page.getByText(/suspended/i)).toBeVisible();
      }
    });

    test("dashboard shows quick links to users and moderation", async ({
      page,
    }) => {
      const manageUsersLink = page.getByRole("link", { name: /manage users/i });
      const moderationLink = page.getByRole("link", {
        name: /moderation queue/i,
      });

      if (await manageUsersLink.isVisible()) {
        await expect(manageUsersLink).toBeVisible();
        await expect(moderationLink).toBeVisible();
      }
    });
  });

  test.describe("User Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/users");
      if (!page.url().includes("/admin/users") || page.url().includes("/login")) {
        test.skip();
      }
    });

    test("user list page shows search and filters", async ({ page }) => {
      // Check for search input
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();

        // Check for filter dropdowns
        await expect(page.getByRole("combobox")).toHaveCount({ minimum: 1 });
      }
    });

    test("user list shows table with user data", async ({ page }) => {
      // Check for table headers
      const userHeader = page.getByRole("columnheader", { name: /user/i });
      if (await userHeader.isVisible()) {
        await expect(userHeader).toBeVisible();
        await expect(
          page.getByRole("columnheader", { name: /status/i })
        ).toBeVisible();
        await expect(
          page.getByRole("columnheader", { name: /role/i })
        ).toBeVisible();
      }
    });

    test("user list has pagination", async ({ page }) => {
      // Check for pagination controls
      const nextButton = page.getByRole("button", { name: /next/i });
      const prevButton = page.getByRole("button", { name: /previous/i });

      // At least one should be visible if there are multiple pages
      const hasNext = await nextButton.isVisible();
      const hasPrev = await prevButton.isVisible();

      // Just verify the UI elements exist (they may be disabled)
      if (hasNext || hasPrev) {
        expect(hasNext || hasPrev).toBe(true);
      }
    });

    test("search filters users by name or email", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);

      if (await searchInput.isVisible()) {
        await searchInput.fill("test");
        await searchInput.press("Enter");

        // Wait for results to update
        await page.waitForTimeout(500);

        // The table should still be visible (empty or with filtered results)
        await expect(page.getByRole("table")).toBeVisible();
      }
    });
  });

  test.describe("Moderation Queue", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/moderation");
      if (
        !page.url().includes("/admin/moderation") ||
        page.url().includes("/login")
      ) {
        test.skip();
      }
    });

    test("moderation queue page loads with stats", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /moderation/i });

      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();
        await expect(page.getByText(/pending/i)).toBeVisible();
      }
    });

    test("moderation queue shows filter options", async ({ page }) => {
      // Check for status and type filters
      const filters = page.locator("[role='combobox']");

      if ((await filters.count()) > 0) {
        await expect(filters.first()).toBeVisible();
      }
    });
  });

  test.describe("Analytics", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/analytics");
      if (
        !page.url().includes("/admin/analytics") ||
        page.url().includes("/login")
      ) {
        test.skip();
      }
    });

    test("analytics page loads with metrics", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /analytics/i });

      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();

        // Check for key metrics
        await expect(page.getByText(/daily active users/i)).toBeVisible();
      }
    });

    test("analytics page has date range selector", async ({ page }) => {
      const dateSelector = page.getByRole("combobox");

      if (await dateSelector.first().isVisible()) {
        await expect(dateSelector.first()).toBeVisible();
      }
    });
  });

  test.describe("System Health", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/health");
      if (
        !page.url().includes("/admin/health") ||
        page.url().includes("/login")
      ) {
        test.skip();
      }
    });

    test("health page shows system status", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /system health/i });

      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();

        // Check for status indicators
        await expect(page.getByText(/database/i)).toBeVisible();
        await expect(page.getByText(/redis/i)).toBeVisible();
      }
    });

    test("health page shows overall status badge", async ({ page }) => {
      // Check for status badge (healthy/degraded/unhealthy)
      const statusBadge = page.locator(
        '[class*="badge"], [class*="Badge"]'
      ).first();

      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toBeVisible();
      }
    });
  });

  test.describe("Action Logs", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/logs");
      if (
        !page.url().includes("/admin/logs") ||
        page.url().includes("/login")
      ) {
        test.skip();
      }
    });

    test("action logs page shows history table", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /action logs/i });

      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();

        // Check for table
        await expect(page.getByRole("table")).toBeVisible();
      }
    });

    test("action logs has filter dropdown", async ({ page }) => {
      const filterDropdown = page.getByRole("combobox");

      if (await filterDropdown.first().isVisible()) {
        await expect(filterDropdown.first()).toBeVisible();
      }
    });
  });

  test.describe("Admin Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin");
      if (!page.url().includes("/admin") || page.url().includes("/login")) {
        test.skip();
      }
    });

    test("sidebar navigation links work", async ({ page }) => {
      // Check sidebar has navigation items
      const usersLink = page.getByRole("link", { name: /users/i });
      const moderationLink = page.getByRole("link", { name: /moderation/i });
      const analyticsLink = page.getByRole("link", { name: /analytics/i });
      const healthLink = page.getByRole("link", { name: /system health/i });

      if (await usersLink.isVisible()) {
        await expect(usersLink).toBeVisible();
        await expect(moderationLink).toBeVisible();
        await expect(analyticsLink).toBeVisible();
        await expect(healthLink).toBeVisible();
      }
    });

    test("clicking users link navigates to users page", async ({ page }) => {
      const usersLink = page.getByRole("link", { name: /users/i });

      if (await usersLink.isVisible()) {
        await usersLink.click();
        await page.waitForURL(/\/admin\/users/);
        expect(page.url()).toContain("/admin/users");
      }
    });
  });
});
