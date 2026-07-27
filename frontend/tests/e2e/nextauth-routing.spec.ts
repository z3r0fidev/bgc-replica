import { test, expect } from '@playwright/test';

/**
 * Regression test for Issue #144: NextAuth's own /api/auth/* routes (src/app/api/auth/[...nextauth]/route.ts)
 * were being shadowed by the generic `/api/:path*` -> backend rewrite in next.config.ts.
 *
 * That rewrite was returned as a plain array, which Next.js treats as its implicit
 * "afterFiles" phase - checked before dynamic routes are resolved. Since the NextAuth
 * route is a dynamic catch-all, every request to it matched the rewrite first and got
 * proxied to the FastAPI backend (which has no /api/auth/* routes), 404ing Google OAuth
 * and Passkey sign-in in production. Fixed by moving the rewrite to the `fallback` phase,
 * which only runs after Next has tried and failed to resolve its own routes.
 *
 * The existing auth-google.spec.ts/auth-passkey.spec.ts specs only assert that a request
 * to /api/auth/signin/* was *made* (page.waitForRequest) - they don't inspect the
 * response, so they passed even while this bug was live. This spec makes a real,
 * unmocked request and asserts on the actual response shape, so a regression back to
 * the shadowed/404ing state fails loudly.
 */

test.describe('NextAuth routing', () => {
  test('/api/auth/providers resolves to NextAuth, not the backend proxy', async ({ request }) => {
    const response = await request.get('/api/auth/providers');

    // The backend has no /api/auth/* routes, so if this rewrite-shadowing bug
    // regresses, the request gets proxied there and 404s with FastAPI's
    // {"detail": "Not Found"} shape instead of resolving here.
    expect(response.status()).toBe(200);

    const body = await response.json();
    // A real NextAuth response is a map of configured providers, e.g.
    // { credentials: { id: "credentials", type: "credentials", ... }, ... }.
    // FastAPI's 404 body only ever has a "detail" key - assert the inverse shape
    // rather than a specific provider list, since which providers are configured
    // varies by environment (a preview deploy may lack Google OAuth secrets).
    expect(body).not.toHaveProperty('detail');
    expect(typeof body).toBe('object');
  });

  test('/api/auth/csrf resolves to NextAuth, not the backend proxy', async ({ request }) => {
    const response = await request.get('/api/auth/csrf');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('csrfToken');
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });

  test('a genuinely backend-only /api/* path still proxies to the backend', async ({ request }) => {
    // Sanity check for the fix itself: the `fallback` rewrite phase must still
    // proxy paths that aren't real Next.js routes, or this "fix" would just
    // trade one outage for another (breaking every other /api/* call).
    const response = await request.get('/api/search/');

    // FastAPI's own response (200 with results, or a validation/redirect status) -
    // anything but Next's 404 page, which is what "no rewrite occurred at all"
    // would produce instead.
    expect(response.status()).not.toBe(404);
  });
});
