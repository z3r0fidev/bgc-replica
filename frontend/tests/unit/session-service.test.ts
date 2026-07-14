import { describe, it, expect, vi, afterEach } from "vitest";
import { sessionService } from "@/services/sessionService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("sessionService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listSessions", () => {
    it("fetches with credentials included and returns parsed JSON", async () => {
      const body = { sessions: [], total: 0 };
      const fetchMock = mockFetchOnce(body);

      const result = await sessionService.listSessions();

      expect(fetchMock).toHaveBeenCalledWith("/api/sessions", { credentials: "include" });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(sessionService.listSessions()).rejects.toThrow("Failed to fetch sessions");
    });
  });

  describe("revokeSession", () => {
    it("sends a DELETE request to the session's URL", async () => {
      const body = { success: true, message: "ok", revoked_count: 1 };
      const fetchMock = mockFetchOnce(body);

      const result = await sessionService.revokeSession("sess-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/sess-1", {
        method: "DELETE",
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Session not found or cannot revoke current session" }, false, 400);

      await expect(sessionService.revokeSession("sess-1")).rejects.toThrow(
        "Session not found or cannot revoke current session"
      );
    });

    it("falls back to a generic message when the error body has no detail", async () => {
      mockFetchOnce({}, false, 500);

      await expect(sessionService.revokeSession("sess-1")).rejects.toThrow(
        "Failed to revoke session"
      );
    });
  });

  describe("revokeAllSessions", () => {
    it("sends a DELETE request to the base sessions URL", async () => {
      const body = { success: true, message: "ok", revoked_count: 3 };
      const fetchMock = mockFetchOnce(body);

      const result = await sessionService.revokeAllSessions();

      expect(fetchMock).toHaveBeenCalledWith("/api/sessions", {
        method: "DELETE",
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 500);

      await expect(sessionService.revokeAllSessions()).rejects.toThrow("custom error");
    });
  });
});
