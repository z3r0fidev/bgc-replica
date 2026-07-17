import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { GET, POST } from "../../src/app/api/csp-report/route";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// `@types/node` declares NODE_ENV as readonly (to discourage mutating it in
// application code), but it's a plain mutable env var at runtime - cast to
// satisfy the type checker for this test-only helper, mirroring the same
// pattern used in tests/unit/lib-prisma.test.ts.
const mutableEnv = process.env as { NODE_ENV?: string };

describe("csp-report route", () => {
  const originalNodeEnv = mutableEnv.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    mutableEnv.NODE_ENV = originalNodeEnv;
    vi.mocked(Sentry.captureMessage).mockClear();
  });

  it("POST returns 200 with {status:'received'} for a valid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      body: JSON.stringify({
        "csp-report": { "violated-directive": "script-src" },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "received" });
  });

  it("POST returns 400 for an unparseable body", async () => {
    const request = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      body: "not json{{{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid report format" });
  });

  it("GET returns 405", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body).toEqual({ error: "POST method required for CSP reports" });
  });

  it("forwards the report to Sentry when NODE_ENV is production", async () => {
    mutableEnv.NODE_ENV = "production";
    const report = { "csp-report": { "violated-directive": "style-src-attr" } };
    const request = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      body: JSON.stringify(report),
    });

    await POST(request);

    expect(Sentry.captureMessage).toHaveBeenCalledWith("CSP Violation", {
      level: "warning",
      extra: report,
    });
  });

  it("does not forward to Sentry when NODE_ENV is not production", async () => {
    mutableEnv.NODE_ENV = "test";
    const request = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      body: JSON.stringify({
        "csp-report": { "violated-directive": "script-src" },
      }),
    });

    await POST(request);

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
