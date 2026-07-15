// @vitest-environment node
//
// This route handler is pure server logic with no DOM dependency, and the
// file-upload test needs the real (undici-backed) FormData/File/Request
// implementations Next.js's NextRequest.formData() expects. jsdom's own
// FormData/File globals are a different implementation and fail undici's
// internal webidl brand checks during multipart parsing, so this file
// deliberately opts out of the suite's default jsdom environment.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { POST } from "../../src/app/share-target/route";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

function mockCookies(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === "access_token" && token ? { name, value: token } : undefined,
  } as never);
}

describe("share-target route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redirects to /login when there is no access_token cookie", async () => {
    mockCookies(undefined);
    const request = new NextRequest("http://localhost/share-target", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?from=%2Fshare-target"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts combined text content to the feed and redirects to /feed", async () => {
    mockCookies("tok-abc");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const formData = new FormData();
    formData.append("title", "Cool link");
    formData.append("text", "check this out");
    formData.append("url", "https://example.com");

    const request = new NextRequest("http://localhost/share-target", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/feed/"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok-abc" }),
      })
    );
    const [, feedOptions] = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(feedOptions?.body as string);
    expect(payload.content).toBe(
      "Cool link\n\ncheck this out\n\nhttps://example.com"
    );

    expect(response.headers.get("location")).toBe("http://localhost/feed");
  });

  it("uploads a file first, then includes the returned image_url in the feed post", async () => {
    mockCookies("tok-abc");
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/img.png" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const file = new File(["binary"], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new NextRequest("http://localhost/share-target", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/gallery/upload"),
      expect.objectContaining({ method: "POST" })
    );
    const [, feedOptions] = fetchMock.mock.calls[1];
    const payload = JSON.parse(feedOptions?.body as string);
    expect(payload.image_url).toBe("https://cdn.example.com/img.png");
    expect(payload.content).toBe("Shared via PWA");
  });

  it("skips the feed POST entirely when there is no content and no file", async () => {
    mockCookies("tok-abc");
    const request = new NextRequest("http://localhost/share-target", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/feed");
  });

  it("still redirects to /feed and logs when the upstream fetch throws", async () => {
    mockCookies("tok-abc");
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));

    const formData = new FormData();
    formData.append("text", "hello");
    const request = new NextRequest("http://localhost/share-target", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost/feed");
    expect(console.error).toHaveBeenCalled();
  });
});
