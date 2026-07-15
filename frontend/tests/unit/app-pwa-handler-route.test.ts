import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/pwa-handler/route";

describe("pwa-handler route", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redirects to '/' when there is no url param", async () => {
    const request = new NextRequest("http://localhost/pwa-handler");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("redirects to /users/:id for a profile deep link", async () => {
    const request = new NextRequest(
      "http://localhost/pwa-handler?url=" +
        encodeURIComponent("web+bgclive://profile/123")
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost/users/123");
  });

  it("redirects to /forums/thread/:id for a thread deep link", async () => {
    const request = new NextRequest(
      "http://localhost/pwa-handler?url=" +
        encodeURIComponent("web+bgclive://thread/456")
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost/forums/thread/456"
    );
  });

  it("falls back to '/' for an unrecognized path", async () => {
    const request = new NextRequest(
      "http://localhost/pwa-handler?url=" +
        encodeURIComponent("web+bgclive://unknown/789")
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("falls back to '/' and logs the error when the url param is unparseable", async () => {
    const request = new NextRequest(
      "http://localhost/pwa-handler?url=" +
        encodeURIComponent("not a valid url::::")
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(console.error).toHaveBeenCalled();
  });
});
