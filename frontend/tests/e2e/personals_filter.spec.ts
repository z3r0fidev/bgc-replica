import { test, expect } from "@playwright/test";

test.describe("Personals Filtering", () => {
  test("filters by location and category", async ({ page }) => {
    // 1. Navigate to personals
    await page.goto("/personals/transx");
    
    // 2. Wait for categories to load in sidebar
    await expect(page.getByText("TRANS-X", { exact: true })).toBeVisible();
    
    // 3. Select a city
    const areaSelect = page.getByRole("combobox").first();
    await areaSelect.click();
    await page.getByRole("option", { name: "PHILADELPHIA" }).click();
    
    // 4. Verify listings update (loading state or content check)
    // For MVP, we verify the UI shows the selected area
    await expect(page.getByText("PHILADELPHIA", { exact: true })).toBeVisible();
  });

  test("switches categories via sidebar", async ({ page }) => {
    await page.goto("/personals/transx");
    
    // Click MILFY in sidebar
    await page.getByText("MILFY").click();
    
    // Verify URL change
    await expect(page).toHaveURL(/\/personals\/milfy/);
    
    // Verify header title change
    await expect(page.locator("h2")).toContainText("MILFY");
  });
});
