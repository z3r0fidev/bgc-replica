import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * CSP violation detection (Issue #68).
 *
 * Chromium fires a `securitypolicyviolation` DOM event for every directive a
 * page violates, for BOTH the enforcing `Content-Security-Policy` header and
 * the `Content-Security-Policy-Report-Only` header — the event's
 * `disposition` field ("enforce" | "report") tells them apart. This lets one
 * spec answer two different questions from the same page load:
 *   - enforce violations: is the CURRENTLY ENFORCED policy actually clean?
 *     (should already be zero today, since the enforcing policy still allows
 *     'unsafe-inline'/'unsafe-eval' — this is a regression guard.)
 *   - report violations: what would the stricter Report-Only policy catch if
 *     it were enforced? This is the baseline data issue #68 never actually
 *     collected (the report-only header has existed since PR #13 with no
 *     mechanism to observe what it reports).
 *
 * Phase 0 (initial version): asserted enforce-violations were zero (trivially
 * true, the enforcing policy still allowed unsafe-inline/unsafe-eval) and
 * logged report-violations without failing on them, to collect the first
 * real baseline data this project ever had.
 *
 * Phase 1 (script-src nonce rollout, src/proxy.ts + src/app/layout.tsx):
 * enforce-violations now gate script-src for real (see
 * ALLOWED_ENFORCED_VIOLATIONS below for the one documented, investigated
 * exception). style-src is still permissive - Phase 2 splits it into
 * style-src-elem/style-src-attr, at which point report-violations should
 * start getting the same enforce-only-with-documented-exceptions treatment.
 */

interface CspViolation {
  disposition: 'enforce' | 'report';
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string;
  lineNumber: number;
}

async function collectCspViolations(page: Page): Promise<CspViolation[]> {
  const violations: CspViolation[] = [];

  await page.exposeFunction('__onCspViolation', (v: CspViolation) => {
    violations.push(v);
  });

  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      // @ts-expect-error -- exposed via page.exposeFunction, not typed in the page context
      window.__onCspViolation({
        disposition: e.disposition,
        violatedDirective: e.violatedDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
      });
    });
  });

  return violations;
}

async function loginAs(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([
    {
      name: 'access_token',
      value: 'fake-token',
      domain: baseURL ? new URL(baseURL).hostname : 'localhost',
      path: '/',
    },
  ]);
}

function summarize(violations: CspViolation[]): string {
  if (violations.length === 0) return '(none)';
  const byDirective = new Map<string, number>();
  for (const v of violations) {
    byDirective.set(v.violatedDirective, (byDirective.get(v.violatedDirective) ?? 0) + 1);
  }
  return [...byDirective.entries()]
    .map(([directive, count]) => `${directive}: ${count}`)
    .join(', ');
}

/**
 * Known, investigated, accepted script-src violations - each entry here
 * must have a comment explaining WHY it's safe to allow, not just what it
 * is. This is not a place to silence inconvenient failures.
 */
const ALLOWED_ENFORCED_VIOLATIONS: Array<(v: CspViolation) => boolean> = [
  // A third-party dependency bundled into react-hook-form/zod's chunk on
  // /login and /profile/edit does `try { Function("") } catch { ... }` as a
  // feature-detection probe for eval availability (visible directly in the
  // built chunk at the reported column: confirmed via `curl` + manual
  // inspection, not guessed). The try/catch means it already has a working
  // fallback for when eval is unavailable for ANY reason (CSP, a sandboxed
  // iframe, a strict runtime like Cloudflare Workers, which the same code
  // explicitly special-cases) - blocking it via CSP does not break page
  // functionality, confirmed by both pages loading and rendering correctly
  // with this violation present. Exact upstream package not pinned down
  // (grepping node_modules for the distinctive Cloudflare+Function("")
  // pattern found no exact match, likely due to minification differences
  // between the published package and this repo's Turbopack-bundled
  // output) - if this needs to be revisited, the code is directly visible
  // by fetching the chunk at the violation's sourceFile/lineNumber/columnNumber.
  (v) => v.violatedDirective === 'script-src' && v.blockedURI === 'eval',
];

/** Asserts the currently-ENFORCED policy is clean (modulo the documented
 * allowlist above), and reports (without failing) what the stricter
 * Report-Only policy would additionally catch. */
async function assertNoEnforcedViolations(violations: CspViolation[], route: string) {
  const enforced = violations
    .filter((v) => v.disposition === 'enforce')
    .filter((v) => !ALLOWED_ENFORCED_VIOLATIONS.some((isAllowed) => isAllowed(v)));
  const reportOnly = violations.filter((v) => v.disposition === 'report');

  test.info().annotations.push({
    type: 'csp-report-only-baseline',
    description: `${route} — report-only violations: ${summarize(reportOnly)}`,
  });

  expect(enforced, `${route} violated the currently-ENFORCED CSP: ${summarize(enforced)}`).toEqual(
    []
  );
}

// Authenticated pages keep long-lived background activity (Socket.io
// polling/websocket handshakes, Sentry Replay's continuous rrweb capture)
// that can prevent the 'load' event from ever firing. CSP violations fire
// on DOM insertion, well before 'load' - domcontentloaded is sufficient and
// avoids the navigation timing out on that background activity.
const GOTO_OPTS = { waitUntil: 'domcontentloaded' as const };
const SETTLE_MS = 1500;

test.describe('CSP violations', () => {
  test('public landing page (/)', async ({ page }) => {
    const violations = await collectCspViolations(page);
    await page.goto('/', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/');
  });

  test('login page (/login)', async ({ page }) => {
    const violations = await collectCspViolations(page);
    await page.goto('/login', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/login');
  });

  test('authenticated feed (/feed)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/feed', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/feed');
  });

  test('settings form page (/settings/security)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/settings/security', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/settings/security');
  });

  test('profile edit form (/profile/edit)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/profile/edit', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/profile/edit');
  });

  test('gallery — react-virtual (/gallery)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/gallery', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/gallery');
  });

  test('chat — virtualization + Radix (/chat)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/chat', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/chat');
  });

  test('forums — tree nav (/forums)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/forums', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/forums');
  });

  test('users — Radix dropdowns (/users)', async ({ page, context, baseURL }) => {
    await loginAs(context, baseURL);
    const violations = await collectCspViolations(page);
    await page.goto('/users', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/users');
  });

  test('offline / PWA shell (/offline)', async ({ page }) => {
    const violations = await collectCspViolations(page);
    await page.goto('/offline', GOTO_OPTS);
    await page.waitForTimeout(SETTLE_MS);
    await assertNoEnforcedViolations(violations, '/offline');
  });
});
