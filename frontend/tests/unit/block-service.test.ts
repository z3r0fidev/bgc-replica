import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { blockService } from "@/services/blockService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("blockService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("blockUser", () => {
    it("posts to the block endpoint without an Authorization header when unauthenticated", async () => {
      const body = { success: true, message: "blocked" };
      const fetchMock = mockFetchOnce(body);

      const result = await blockService.blockUser("user-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/block/user-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("includes a Bearer Authorization header when a token is stored", async () => {
      localStorage.setItem("access_token", "jwt-abc");
      const fetchMock = mockFetchOnce({ success: true, message: "blocked" });

      await blockService.blockUser("user-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/block/user-1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-abc",
        },
      });
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Cannot block yourself" }, false, 400);

      await expect(blockService.blockUser("user-1")).rejects.toThrow(
        "Cannot block yourself"
      );
    });
  });

  describe("unblockUser", () => {
    it("sends a DELETE request to the block endpoint", async () => {
      const body = { success: true, message: "unblocked" };
      const fetchMock = mockFetchOnce(body);

      const result = await blockService.unblockUser("user-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/block/user-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 400);

      await expect(blockService.unblockUser("user-1")).rejects.toThrow("custom error");
    });
  });

  describe("getBlockedUsers", () => {
    it("fetches the block list", async () => {
      const body = [{ id: "1", user: { id: "u1", name: null, email: null, image: null }, blocked_at: "2026-01-01" }];
      const fetchMock = mockFetchOnce(body);

      const result = await blockService.getBlockedUsers();

      expect(fetchMock).toHaveBeenCalledWith("/api/block/list", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(blockService.getBlockedUsers()).rejects.toThrow(
        "Failed to fetch blocked users"
      );
    });
  });

  describe("getBlockStatus", () => {
    it("fetches the block status for a user", async () => {
      const body = { is_blocked: false, blocked_by_me: false, blocked_by_them: false };
      const fetchMock = mockFetchOnce(body);

      const result = await blockService.getBlockStatus("user-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/block/status/user-1", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(blockService.getBlockStatus("user-1")).rejects.toThrow(
        "Failed to fetch block status"
      );
    });
  });

  describe("reportUser", () => {
    it("posts the report data as JSON", async () => {
      const fetchMock = mockFetchOnce({});
      const data = { user_id: "user-1", reason: "SPAM" as const };

      await blockService.reportUser(data);

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/report-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Cannot report yourself" }, false, 400);

      await expect(
        blockService.reportUser({ user_id: "user-1", reason: "SPAM" })
      ).rejects.toThrow("Cannot report yourself");
    });
  });
});
