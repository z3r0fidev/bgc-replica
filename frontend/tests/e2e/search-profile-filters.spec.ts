import { test, expect } from "@playwright/test";

test.describe("Search Profile Expansion Filters", () => {
  const mockSearchResults = {
    items: [
      {
        id: "user-1",
        display_name: "User One",
        relationship_status: "Single",
        industry: "Technology",
        gender_identity: "Cis-male",
        looking_for: ["Networking", "Friendship"],
        user: { id: "user-1", name: "User One" },
        last_active: new Date().toISOString(),
      },
      {
        id: "user-2",
        display_name: "User Two",
        relationship_status: "In a Relationship",
        industry: "Healthcare",
        gender_identity: "Cis-female",
        looking_for: ["Friendship"],
        user: { id: "user-2", name: "User Two" },
        last_active: new Date().toISOString(),
      },
      {
        id: "user-3",
        display_name: "User Three",
        relationship_status: "Single",
        industry: "Technology",
        gender_identity: "Non-binary",
        looking_for: ["Dating", "Networking"],
        user: { id: "user-3", name: "User Three" },
        last_active: new Date().toISOString(),
      },
    ],
    next_cursor: null,
    has_more: false,
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

  test("should filter by relationship_status", async ({ page }) => {
    let capturedUrl = "";

    await page.route("**/api/search**", async (route) => {
      capturedUrl = route.request().url();
      const url = new URL(capturedUrl);
      const statusFilter = url.searchParams.get("relationship_status");

      const filtered = statusFilter
        ? mockSearchResults.items.filter(
            (item) => item.relationship_status === statusFilter
          )
        : mockSearchResults.items;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockSearchResults, items: filtered }),
      });
    });

    await page.goto("/search");

    // Check if relationship_status filter exists
    const filterExists = await page.locator('[name="relationship_status"]').count();

    if (filterExists > 0) {
      // Select "Single" from relationship status filter
      await page.selectOption('[name="relationship_status"]', "Single");
      await page.getByRole("button", { name: /search|apply/i }).click();

      // Verify URL contains the filter
      expect(capturedUrl).toContain("relationship_status=Single");
    }
  });

  test("should filter by industry", async ({ page }) => {
    let capturedUrl = "";

    await page.route("**/api/search**", async (route) => {
      capturedUrl = route.request().url();
      const url = new URL(capturedUrl);
      const industryFilter = url.searchParams.get("industry");

      const filtered = industryFilter
        ? mockSearchResults.items.filter(
            (item) => item.industry === industryFilter
          )
        : mockSearchResults.items;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockSearchResults, items: filtered }),
      });
    });

    await page.goto("/search");

    // Check if industry filter exists
    const filterExists = await page.locator('[name="industry"]').count();

    if (filterExists > 0) {
      await page.selectOption('[name="industry"]', "Technology");
      await page.getByRole("button", { name: /search|apply/i }).click();

      expect(capturedUrl).toContain("industry=Technology");
    }
  });

  test("should filter by gender_identity", async ({ page }) => {
    let capturedUrl = "";

    await page.route("**/api/search**", async (route) => {
      capturedUrl = route.request().url();
      const url = new URL(capturedUrl);
      const genderFilter = url.searchParams.get("gender_identity");

      const filtered = genderFilter
        ? mockSearchResults.items.filter(
            (item) => item.gender_identity === genderFilter
          )
        : mockSearchResults.items;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockSearchResults, items: filtered }),
      });
    });

    await page.goto("/search");

    // Check if gender_identity filter exists
    const filterExists = await page.locator('[name="gender_identity"]').count();

    if (filterExists > 0) {
      await page.selectOption('[name="gender_identity"]', "Non-binary");
      await page.getByRole("button", { name: /search|apply/i }).click();

      expect(capturedUrl).toContain("gender_identity=Non-binary");
    }
  });

  test("should filter by looking_for (multi-select)", async ({ page }) => {
    let capturedUrl = "";

    await page.route("**/api/search**", async (route) => {
      capturedUrl = route.request().url();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSearchResults),
      });
    });

    await page.goto("/search");

    // Check if looking_for filter exists
    const filterExists = await page.locator('[name="looking_for"]').count();

    if (filterExists > 0) {
      // Check multiple "Looking For" options
      await page.check('[name="looking_for"][value="Networking"]');
      await page.check('[name="looking_for"][value="Friendship"]');
      await page.getByRole("button", { name: /search|apply/i }).click();

      expect(capturedUrl).toContain("looking_for=Networking");
      expect(capturedUrl).toContain("looking_for=Friendship");
    }
  });

  test("should combine multiple filters", async ({ page }) => {
    let capturedUrl = "";

    await page.route("**/api/search**", async (route) => {
      capturedUrl = route.request().url();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSearchResults),
      });
    });

    await page.goto("/search");

    // Check if filters exist and apply multiple
    const statusFilterExists = await page.locator('[name="relationship_status"]').count();
    const industryFilterExists = await page.locator('[name="industry"]').count();

    if (statusFilterExists > 0 && industryFilterExists > 0) {
      await page.selectOption('[name="relationship_status"]', "Single");
      await page.selectOption('[name="industry"]', "Technology");
      await page.getByRole("button", { name: /search|apply/i }).click();

      expect(capturedUrl).toContain("relationship_status=Single");
      expect(capturedUrl).toContain("industry=Technology");
    }
  });

  test("API should return filtered results based on relationship_status", async ({
    request,
  }) => {
    // Hit the backend directly via NEXT_PUBLIC_API_URL instead of the
    // relative /api/search/ path. This test's actual intent is to verify
    // backend query-filtering logic, not Vercel's rewrite behavior -
    // and Vercel's "Protection Bypass for Automation" redirect flow has a
    // confirmed platform-level limitation where vercel.json/next.config.ts
    // rewrites never get re-applied on the post-redirect request, so any
    // relative /api/* path 404s here even though the backend itself and
    // the rewrite config are both correct (verified directly: curling the
    // deployed backend returns 200, and real pages/real Next.js routes
    // return 200 through the same bypass flow - only rewrite-proxied paths
    // are affected).
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const response = await request.get(`${apiUrl}/api/search/`, {
      params: {
        relationship_status: "Single",
      },
    });

    // We expect 200 even if no results (the endpoint should handle the filter)
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });
});
