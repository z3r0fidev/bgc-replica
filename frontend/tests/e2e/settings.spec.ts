import { test, expect } from "@playwright/test";

// These tests require authentication
// In a real setup, you'd use Playwright's storageState for auth
test.describe("Settings Pages", () => {
  test.describe.configure({ mode: "serial" });

  // Skip auth-required tests if not logged in
  test.beforeEach(async ({ page }) => {
    // Try to access a protected page
    await page.goto("/settings/notifications");

    // If redirected to login, skip
    if (page.url().includes("/login")) {
      test.skip();
    }
  });

  test("notifications settings page loads", async ({ page }) => {
    await page.goto("/settings/notifications");

    // Check page elements
    await expect(page.getByRole("heading", { name: /notifications/i })).toBeVisible();

    // Check notification categories exist
    await expect(page.getByText(/communication/i)).toBeVisible();
    await expect(page.getByText(/activity/i)).toBeVisible();
    await expect(page.getByText(/marketing/i)).toBeVisible();
  });

  test("security settings page loads with 2FA section", async ({ page }) => {
    await page.goto("/settings/security");

    // Check page elements
    await expect(page.getByRole("heading", { name: /security/i })).toBeVisible();

    // Check 2FA section exists
    await expect(page.getByText(/two-factor|2fa/i)).toBeVisible();
  });

  test("sessions settings page loads", async ({ page }) => {
    await page.goto("/settings/sessions");

    // Check page elements
    await expect(page.getByRole("heading", { name: /active sessions/i })).toBeVisible();

    // Check current session section
    await expect(page.getByText(/current session|this device/i)).toBeVisible();
  });

  test("blocked users page loads", async ({ page }) => {
    await page.goto("/settings/blocked");

    // Check page elements
    await expect(page.getByRole("heading", { name: /blocked users/i })).toBeVisible();
  });
});
