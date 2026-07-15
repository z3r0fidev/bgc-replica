import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../src/app/api/csp-report/route";

describe("csp-report route", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
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
});
