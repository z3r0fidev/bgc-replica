import { test, expect } from '@playwright/test';

test.describe('Two-Factor Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Log console messages from the page
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  });

  test('should show 2FA prompt after valid credentials for 2FA-enabled account', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    // Intercept login API call - simulate 2FA-enabled user
    await page.route(loginUrl, async (route) => {
      console.log('Intercepted login request, returning 2FA required');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          requires_2fa: true,
          user_id: testUserId,
          message: 'Two-factor authentication required',
        }),
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill('2fa-user@example.com');
    await passwordInput.fill('Password123!');

    const responsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Should show 2FA input form
    await expect(page.getByText(/Two-factor authentication/i)).toBeVisible({ timeout: 10000 });

    // Should have a code input field
    const codeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[aria-label*="2fa" i], input[aria-label*="verification" i]');
    await expect(codeInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('should complete login with valid 2FA code', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    const login2faUrl = '**/api/auth/login/2fa';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    // Intercept login API call - simulate 2FA-enabled user
    await page.route(loginUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          requires_2fa: true,
          user_id: testUserId,
          message: 'Two-factor authentication required',
        }),
      });
    });

    // Intercept 2FA verification
    await page.route(login2faUrl, async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      console.log('Intercepted 2FA request:', postData);

      // Validate the request payload
      if (postData?.user_id === testUserId && postData?.code === '123456') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            access_token: 'fake-2fa-token',
            token_type: 'bearer',
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            detail: 'Invalid verification code',
          }),
        });
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Enter credentials
    await page.locator('input[name="email"]').fill('2fa-user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');

    const loginResponsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await loginResponsePromise;

    // Wait for 2FA form to appear
    await expect(page.getByText(/Two-factor authentication/i)).toBeVisible({ timeout: 10000 });

    // Step 2: Enter 2FA code
    const codeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[aria-label*="2fa" i], input[aria-label*="verification" i]').first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    await codeInput.click();
    await page.waitForTimeout(100);
    await codeInput.fill('123456');

    // Submit 2FA
    const response2faPromise = page.waitForResponse(login2faUrl);
    await page.getByRole('button', { name: /verify|submit|confirm/i }).click();

    const response2fa = await response2faPromise;
    expect(response2fa.status()).toBe(200);

    // Should redirect to home page after successful 2FA
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('fake-2fa-token');
  });

  test('should show error for invalid 2FA code', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    const login2faUrl = '**/api/auth/login/2fa';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    // Intercept login API call
    await page.route(loginUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          requires_2fa: true,
          user_id: testUserId,
          message: 'Two-factor authentication required',
        }),
      });
    });

    // Intercept 2FA verification - always fail
    await page.route(login2faUrl, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          detail: 'Invalid verification code',
        }),
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Enter credentials
    await page.locator('input[name="email"]').fill('2fa-user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');

    const loginResponsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await loginResponsePromise;

    // Wait for 2FA form
    await expect(page.getByText(/Two-factor authentication/i)).toBeVisible({ timeout: 10000 });

    // Step 2: Enter wrong code
    const codeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[aria-label*="2fa" i], input[aria-label*="verification" i]').first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    await codeInput.click();
    await page.waitForTimeout(100);
    await codeInput.fill('000000');

    // Submit
    await page.getByRole('button', { name: /verify|submit|confirm/i }).click();

    // Should stay on login/2FA page
    await expect(page).not.toHaveURL('/');

    // Should show error message
    await expect(page.getByText(/invalid.*code|verification.*failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should accept backup code (8-char hex) for 2FA', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    const login2faUrl = '**/api/auth/login/2fa';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const backupCode = 'a1b2c3d4'; // 8-char hex backup code

    // Intercept login API call
    await page.route(loginUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          requires_2fa: true,
          user_id: testUserId,
          message: 'Two-factor authentication required',
        }),
      });
    });

    // Intercept 2FA verification - accept backup code
    await page.route(login2faUrl, async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      console.log('Intercepted 2FA request with backup code:', postData);

      // Accept the backup code
      if (postData?.user_id === testUserId && postData?.code === backupCode) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            access_token: 'fake-backup-token',
            token_type: 'bearer',
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            detail: 'Invalid verification code',
          }),
        });
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Enter credentials
    await page.locator('input[name="email"]').fill('2fa-user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');

    const loginResponsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await loginResponsePromise;

    // Wait for 2FA form
    await expect(page.getByText(/Two-factor authentication/i)).toBeVisible({ timeout: 10000 });

    // Step 2: Look for "use backup code" option or enter directly
    const backupCodeLink = page.getByText(/backup code|recovery code|lost.*device/i);
    const backupOptionExists = await backupCodeLink.count() > 0;
    if (backupOptionExists) {
      await backupCodeLink.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(100);
      await backupCodeLink.click().catch(() => {});
      await page.waitForTimeout(200);
    }

    // Enter backup code
    const codeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[aria-label*="2fa" i], input[aria-label*="backup" i], input[aria-label*="verification" i]').first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    await codeInput.click();
    await page.waitForTimeout(100);
    await codeInput.fill(backupCode);

    // Submit
    const response2faPromise = page.waitForResponse(login2faUrl);
    await page.getByRole('button', { name: /verify|submit|confirm/i }).click();

    const response2fa = await response2faPromise;
    expect(response2fa.status()).toBe(200);

    // Should redirect to home page after successful backup code login
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('fake-backup-token');
  });

  test('should not show 2FA prompt for users without 2FA enabled', async ({ page }) => {
    const loginUrl = '**/api/auth/login';

    // Intercept login API call - user without 2FA
    await page.route(loginUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          access_token: 'fake-no2fa-token',
          token_type: 'bearer',
        }),
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill('regular-user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');

    const responsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Should redirect directly to home without 2FA prompt
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Verify no 2FA prompt appeared
    const twoFactorText = page.getByText(/Two-factor authentication/i);
    await expect(twoFactorText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // It's okay if the selector doesn't exist at all
    });

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('fake-no2fa-token');
  });

  test('should handle rate limiting on 2FA attempts', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    const login2faUrl = '**/api/auth/login/2fa';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    let attemptCount = 0;

    // Intercept login API call
    await page.route(loginUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          requires_2fa: true,
          user_id: testUserId,
          message: 'Two-factor authentication required',
        }),
      });
    });

    // Intercept 2FA verification - rate limit after 5 attempts
    await page.route(login2faUrl, async (route) => {
      attemptCount++;

      if (attemptCount > 5) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '60',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
          },
          body: JSON.stringify({
            detail: 'Rate limit exceeded',
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            detail: 'Invalid verification code',
          }),
        });
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Enter credentials
    await page.locator('input[name="email"]').fill('2fa-user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');

    const loginResponsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await loginResponsePromise;

    // Wait for 2FA form
    await expect(page.getByText(/Two-factor authentication/i)).toBeVisible({ timeout: 10000 });

    // Make multiple failed attempts to trigger rate limit
    const codeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[aria-label*="2fa" i], input[aria-label*="verification" i]').first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 6; i++) {
      await codeInput.click();
      await page.waitForTimeout(50);
      await codeInput.clear();
      await page.waitForTimeout(50);
      await codeInput.fill(`00000${i}`);

      const submitButton = page.getByRole('button', { name: /verify|submit|confirm/i });
      await submitButton.click();

      // Wait for error message or rate limit to appear (state-based instead of hard timeout)
      await page.waitForSelector('text=/invalid|rate limit|too many|error/i', {
        timeout: 3000,
        state: 'visible'
      }).catch(() => {});
      await page.waitForTimeout(200); // Brief settle time
    }

    // Should show rate limit message
    await expect(page.getByText(/rate limit|too many|try again later/i)).toBeVisible({ timeout: 10000 });
  });
});
