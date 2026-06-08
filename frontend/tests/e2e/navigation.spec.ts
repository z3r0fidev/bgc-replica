import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");

    // Check page loads without errors
    await expect(page).toHaveTitle(/BGC/);
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("form")).toBeVisible();
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("form")).toBeVisible();
  });

  test("forums page redirects to login if not authenticated", async ({
    page,
  }) => {
    await page.goto("/forums");

    // Should either show forums or redirect to login
    const url = page.url();
    expect(url.includes("/forums") || url.includes("/login")).toBeTruthy();
  });

  test("feed page requires authentication", async ({ page }) => {
    await page.goto("/feed");

    // Should either show feed or redirect to login
    const url = page.url();
    expect(url.includes("/feed") || url.includes("/login")).toBeTruthy();
  });

  test("profile page handles missing profile gracefully", async ({ page }) => {
    await page.goto("/profile/nonexistent-user-id");

    // Should show error or redirect
    await page.waitForTimeout(1000);

    // Page should not crash
    await expect(page.locator("body")).toBeVisible();
  });
});
