import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";

// `@types/node` declares NODE_ENV as readonly, but it's a plain mutable env
// var at runtime - cast to satisfy the type checker, matching the pattern
// used in tests/unit/lib-prisma.test.ts and app-csp-report-route.test.ts.
const mutableEnv = process.env as { NODE_ENV?: string };

function makeRequest(path: string, options: { cookie?: string; authHeader?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.authHeader) headers.Authorization = options.authHeader;
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("proxy", () => {
  const originalNodeEnv = mutableEnv.NODE_ENV;

  afterEach(() => {
    mutableEnv.NODE_ENV = originalNodeEnv;
  });

  describe("auth-redirect logic (unchanged from before the CSP work)", () => {
    it("redirects unauthenticated requests to protected routes to /login with a from param", () => {
      const response = proxy(makeRequest("/settings/security"));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("from")).toBe("/settings/security");
    });

    it("allows authenticated requests to protected routes through", () => {
      const response = proxy(makeRequest("/feed", { cookie: "access_token=fake-token" }));

      expect(response.status).not.toBe(307);
      expect(response.headers.get("location")).toBeNull();
    });

    it("accepts a Bearer Authorization header as an alternative to the cookie", () => {
      const response = proxy(makeRequest("/feed", { authHeader: "Bearer fake-token" }));

      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects authenticated users away from /login back to /", () => {
      const response = proxy(makeRequest("/login", { cookie: "access_token=fake-token" }));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/");
    });

    it("redirects authenticated users away from /register back to /", () => {
      const response = proxy(makeRequest("/register", { cookie: "access_token=fake-token" }));

      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/");
    });

    it("leaves unauthenticated requests to public routes alone", () => {
      const response = proxy(makeRequest("/"));

      expect(response.status).not.toBe(307);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("CSP headers", () => {
    it("sets both the enforcing and report-only CSP headers on a pass-through response", () => {
      const response = proxy(makeRequest("/"));

      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeTruthy();
    });

    it("sets both CSP headers on redirect responses too", () => {
      const response = proxy(makeRequest("/settings/security"));

      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeTruthy();
    });

    it("uses a fresh nonce per request, embedded consistently in both headers", () => {
      const response = proxy(makeRequest("/"));
      const enforced = response.headers.get("Content-Security-Policy")!;
      const reportOnly = response.headers.get("Content-Security-Policy-Report-Only")!;

      const nonceMatch = enforced.match(/'nonce-([^']+)'/);
      expect(nonceMatch).not.toBeNull();
      const nonce = nonceMatch![1];

      // The same nonce is reused for script-src (enforced) and
      // style-src-elem (report-only), per the Issue #68 plan.
      expect(reportOnly).toContain(`'nonce-${nonce}'`);

      const response2 = proxy(makeRequest("/"));
      const nonce2 = response2.headers.get("Content-Security-Policy")!.match(/'nonce-([^']+)'/)![1];
      expect(nonce2).not.toBe(nonce);
    });

    it("production script-src has no unsafe-inline or unsafe-eval", () => {
      mutableEnv.NODE_ENV = "production";
      const response = proxy(makeRequest("/"));
      const enforced = response.headers.get("Content-Security-Policy")!;
      const scriptSrc = enforced.split(";").find((d) => d.trim().startsWith("script-src"))!;

      expect(scriptSrc).not.toContain("unsafe-inline");
      expect(scriptSrc).not.toContain("unsafe-eval");
      expect(scriptSrc).toContain("'strict-dynamic'");
    });

    it("dev script-src includes unsafe-eval (React's documented dev-mode requirement)", () => {
      mutableEnv.NODE_ENV = "development";
      const response = proxy(makeRequest("/"));
      const enforced = response.headers.get("Content-Security-Policy")!;
      const scriptSrc = enforced.split(";").find((d) => d.trim().startsWith("script-src"))!;

      expect(scriptSrc).toContain("'unsafe-eval'");
    });

    it("style-src remains permissive in the enforcing policy (Phase 2 not landed yet)", () => {
      const response = proxy(makeRequest("/"));
      const enforced = response.headers.get("Content-Security-Policy")!;

      expect(enforced).toContain(`style-src 'self' 'unsafe-inline'`);
      expect(enforced).not.toContain("style-src-elem");
    });

    it("report-only policy forward-tests the Phase 2 style-src split", () => {
      const response = proxy(makeRequest("/"));
      const reportOnly = response.headers.get("Content-Security-Policy-Report-Only")!;

      expect(reportOnly).toContain(`style-src-attr 'unsafe-inline'`);
      expect(reportOnly).toMatch(/style-src-elem 'self' 'nonce-[^']+'/);
    });

    it("includes the free security headers added alongside the nonce work", () => {
      const response = proxy(makeRequest("/"));
      const enforced = response.headers.get("Content-Security-Policy")!;

      for (const directive of [
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests",
        "report-uri /api/csp-report",
      ]) {
        expect(enforced).toContain(directive);
      }
    });
  });

  describe("nonce request-header propagation", () => {
    it("sets x-nonce on the forwarded request headers for pass-through responses", () => {
      // NextResponse.next()'s rewritten request headers surface back on the
      // response via the x-middleware-override-headers/x-middleware-request-*
      // convention Next.js uses internally to thread them to the page
      // render - assert via that rather than reaching into internals.
      const response = proxy(makeRequest("/"));
      const overrideHeader = response.headers.get("x-middleware-override-headers");

      expect(overrideHeader).toContain("x-nonce");
      const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");
      expect(forwardedNonce).toBeTruthy();

      const cspNonce = response.headers
        .get("Content-Security-Policy")!
        .match(/'nonce-([^']+)'/)![1];
      expect(forwardedNonce).toBe(cspNonce);
    });
  });
});
