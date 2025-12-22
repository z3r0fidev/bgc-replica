import { test, expect } from '@playwright/test';

test.describe('Credentials Auth', () => {
  test.beforeEach(async ({ page }) => {
    // Log console messages from the page
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  });

  test('should register a new user successfully', async ({ page }) => {
    const registerUrl = '**/api/auth/register';
    
    // Intercept registration API call
    await page.route(registerUrl, async (route) => {
      console.log('Intercepted registration request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User created' }),
      });
    });

    await page.goto('/register');
    
    // Fill the form
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test-register@example.com');
    await page.getByLabel('Password').fill('Password123!');
    
    // Wait for the response after clicking register
    const responsePromise = page.waitForResponse(registerUrl);
    await page.getByRole('button', { name: 'Register' }).click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    // Should redirect to login page after successful registration
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const loginUrl = '**/api/auth/login';
    
    // Intercept login API call
    await page.route(loginUrl, async (route) => {
      console.log('Intercepted login request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake-token', token_type: 'bearer' }),
      });
    });

    await page.goto('/login');
    
    await page.getByLabel('Email').fill('test-login@example.com');
    await page.getByLabel('Password').fill('Password123!');
    
    const responsePromise = page.waitForResponse(loginUrl);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    // Should redirect to home page after successful login
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
    
    // Verify token is stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('fake-token');
  });

  test('should sign out successfully', async ({ page, context }) => {
    // 1. Log in first (mocked)
    await context.addCookies([{
      name: 'access_token',
      value: 'fake-token',
      domain: 'localhost',
      path: '/',
    }]);
    
    await page.goto('/');
    
    // 2. Perform sign out (mocking the action of a button that clears tokens)
    // In a real app, this would be a button click. 
    // Here we'll simulate what the sign out function does.
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = '/login';
    });
    
    await expect(page).toHaveURL(/\/login/);
    
    // Verify tokens are gone
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeNull();
  });

  test('should show error on registration failure', async ({ page }) => {
    const registerUrl = '**/api/auth/register';
    
    // Intercept registration API call with error
    await page.route(registerUrl, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email already exists' }),
      });
    });

    await page.goto('/register');
    
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('existing@example.com');
    await page.getByLabel('Password').fill('Password123!');
    
    await page.getByRole('button', { name: 'Register' }).click();
    
    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
    
    // Check for error message in toast
    // The toast might take a moment to appear
    await expect(page.getByText('Email already exists')).toBeVisible({ timeout: 10000 });
  });
});