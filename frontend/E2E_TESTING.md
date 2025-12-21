# Frontend E2E Testing Guide (Playwright)

This guide outlines the implementation of End-to-End (E2E) testing for the Next.js 16 frontend using Playwright.

## 1. Setup & Installation
Playwright is already partially configured in the project. Ensure all dependencies and browsers are installed.

### Installation
```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

### Configuration (`playwright.config.ts`)
Ensure your config handles the Next.js App Router and local development servers.
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 2. Best Practices
- **Locators**: Use `page.getByRole` or `page.getByTestId` instead of CSS selectors.
- **Authentication**: Use `storageState` to share login sessions between tests to speed up execution.
- **PWA Testing**: Verify service worker registration and manifest existence.

---

## 3. Example Test: Auth Flow
Create `tests/e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("user can sign up and reach dashboard", async ({ page }) => {
  await page.goto("/register");
  await page.fill('input[name="name"]', "Test User");
  await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
  await page.fill('input[name="password"]', "Password123!");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("h1")).toContainText("Welcome");
});
```

---

## 4. Execution
```bash
npx playwright test
# With UI
npx playwright test --ui
```
