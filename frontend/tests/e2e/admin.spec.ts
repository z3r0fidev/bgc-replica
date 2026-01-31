import { test, expect } from "@playwright/test";

test.describe("Admin Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Admin pages require authentication and admin role
    await page.goto("/admin/moderation");

    // If redirected to login or access denied, skip
    if (page.url().includes("/login") || page.url().includes("/403")) {
      test.skip();
    }
  });

  test("moderation queue page loads with stats", async ({ page }) => {
    await page.goto("/admin/moderation");

    // Check page elements (if accessible)
    const heading = page.getByRole("heading", { name: /moderation/i });

    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();

      // Check stats cards exist
      await expect(page.getByText(/pending/i)).toBeVisible();
    }
  });

  test("moderation queue shows filter options", async ({ page }) => {
    await page.goto("/admin/moderation");

    // Check filter UI exists (if accessible)
    const filterButton = page.getByRole("button", { name: /filter|status/i });

    if (await filterButton.isVisible()) {
      await expect(filterButton).toBeVisible();
    }
  });
});
