import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");

    // Check page title
    await expect(page).toHaveTitle(/BGC/);

    // Check login form elements exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page loads correctly", async ({ page }) => {
    await page.goto("/register");

    // Check registration form elements
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account|sign up|register/i })
    ).toBeVisible();
  });

  test("forgot password page loads correctly", async ({ page }) => {
    await page.goto("/forgot-password");

    // Check forgot password form
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|reset|submit/i })
    ).toBeVisible();
  });

  test("verify email page shows check email message without token", async ({
    page,
  }) => {
    await page.goto("/verify-email");

    // Should show "Check Your Email" message when no token
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test("verify email page shows error with invalid token", async ({ page }) => {
    await page.goto("/verify-email?token=invalid-token-123");

    // Wait for verification attempt
    await page.waitForTimeout(2000);

    // Should show error for invalid token
    await expect(
      page.getByRole("heading", { name: /verification failed/i })
    ).toBeVisible();
  });

  test("login page shows 2FA input after valid credentials", async () => {
    // This test requires a user with 2FA enabled
    // Skipping actual 2FA flow in E2E for now
    test.skip();
  });
});
