import { test, expect } from "@playwright/test";

test.describe("Profile Privacy Rules", () => {
  const mockProfile = {
    id: "test-user-id",
    display_name: "Test User",
    pronouns: "They/Them",
    birthdate: "1990-01-01",
    gender_identity: "Non-binary",
    relationship_status: "Single",
    looking_for: ["Friendship", "Networking"],
    occupation: "Engineer",
    industry: "Technology",
    education_level: "Bachelors Degree",
    university: "Test University",
    social_links: {
      instagram_url: "https://instagram.com/testuser",
    },
    privacy_settings: {
      pronouns: "PRIVATE",
      occupation: "FRIENDS_ONLY",
    },
    bio: "Test bio",
    last_active: new Date().toISOString(),
    user: { id: "test-user-id", name: "Test User" },
  };

  test.beforeEach(async ({ page, context, baseURL }) => {
    // proxy.ts middleware reads the access_token cookie server-side, so
    // localStorage alone never satisfies auth checks on protected routes.
    await context.addCookies([
      {
        name: "access_token",
        value: "fake-token",
        domain: baseURL ? new URL(baseURL).hostname : "localhost",
        path: "/",
      },
    ]);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "fake-token");
    });
  });

  test("should load profile edit page with 5 tabs", async ({ page }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.goto("/profile/edit");

    // Verify all 5 tabs are present
    await expect(page.getByRole("tab", { name: /basics/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /identity/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /lifestyle/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /work/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /social/i })).toBeVisible();
  });

  test("should show all fields to profile owner", async ({ page }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.goto("/profile/edit");

    // Navigate to Identity tab
    await page.getByRole("tab", { name: /identity/i }).click();

    // Owner should see their display name
    const displayNameInput = page.locator('input[name="display_name"]');
    await expect(displayNameInput).toHaveValue("Test User");
  });

  test("should switch between tabs and show correct content", async ({
    page,
  }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.goto("/profile/edit");

    // Test Identity tab
    await page.getByRole("tab", { name: /identity/i }).click();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/pronouns/i)).toBeVisible();

    // Test Lifestyle tab
    await page.getByRole("tab", { name: /lifestyle/i }).click();
    await expect(page.getByLabel(/relationship status/i)).toBeVisible();
    await expect(page.getByText(/looking for/i)).toBeVisible();

    // Test Professional tab (labeled "Work" in the UI)
    await page.getByRole("tab", { name: /work/i }).click();
    await expect(page.getByLabel(/occupation/i)).toBeVisible();
    await expect(page.getByLabel(/industry/i)).toBeVisible();

    // Test Social Links tab
    await page.getByRole("tab", { name: /social/i }).click();
    await expect(page.getByLabel(/instagram/i)).toBeVisible();
  });

  test("should show profile completion meter", async ({ page }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.goto("/profile/edit");

    // Check completion meter is visible
    await expect(page.getByText(/profile completion/i)).toBeVisible();
  });

  test("should save profile updates", async ({ page }) => {
    let savedData: Record<string, unknown> = {};

    await page.route("**/api/profiles/me", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProfile),
        });
      } else if (request.method() === "PATCH") {
        savedData = JSON.parse(request.postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...mockProfile, ...savedData }),
        });
      }
    });

    await page.route("**/api/profiles/me/privacy", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", privacy_settings: {} }),
      });
    });

    await page.goto("/profile/edit");

    // Update bio field (lives on the Basics tab)
    await page.getByRole("tab", { name: /basics/i }).click();
    const bioField = page.getByLabel(/about me/i);
    await bioField.fill("Updated bio text");

    // Submit form
    await page.getByRole("button", { name: /save changes/i }).click();

    // Verify data was saved
    await page.waitForResponse("**/api/profiles/me");
    expect(savedData.bio).toBe("Updated bio text");
  });

  test("should validate social link URLs", async ({ page }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.goto("/profile/edit");

    // Navigate to Social Links tab
    await page.getByRole("tab", { name: /social/i }).click();

    // Enter invalid Instagram URL
    const instagramInput = page.getByLabel(/instagram/i);
    await instagramInput.fill("not-a-valid-url");

    // Submit form
    await page.getByRole("button", { name: /save changes/i }).click();

    // Should show validation error
    await expect(
      page.getByText(/must be a valid instagram url/i)
    ).toBeVisible();
  });

  test("should allow selecting multiple looking_for options", async ({
    page,
  }) => {
    await page.route("**/api/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockProfile, looking_for: [] }),
      });
    });

    await page.goto("/profile/edit");

    // Navigate to Lifestyle tab
    await page.getByRole("tab", { name: /lifestyle/i }).click();

    // Select multiple options
    await page.getByLabel("Friendship").check();
    await page.getByLabel("Networking").check();
    await page.getByLabel("Dating").check();

    // Verify checkboxes are checked
    await expect(page.getByLabel("Friendship")).toBeChecked();
    await expect(page.getByLabel("Networking")).toBeChecked();
    await expect(page.getByLabel("Dating")).toBeChecked();
  });
});
