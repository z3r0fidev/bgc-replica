import { describe, it, expect, vi, afterEach } from "vitest";
import { forumsService } from "@/services/forums";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("forumsService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getTree", () => {
    it("fetches the forum tree and returns parsed JSON", async () => {
      const tree = [{ id: "1", name: "General", slug: "general", parent_id: null, children: [] }];
      const fetchMock = mockFetchOnce(tree);

      const result = await forumsService.getTree();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/forums/tree")
      );
      expect(result).toEqual(tree);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(forumsService.getTree()).rejects.toThrow("Failed to fetch forum tree");
    });
  });

  describe("getThreads", () => {
    it("builds the URL with category slug and no params", async () => {
      const fetchMock = mockFetchOnce({ items: [], metadata: { has_next: false, count: 0 } });

      await forumsService.getThreads("general");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/forums/categories/general/threads");
    });

    it("includes limit and cursor query params when provided", async () => {
      const fetchMock = mockFetchOnce({ items: [], metadata: { has_next: false, count: 0 } });

      await forumsService.getThreads("general", { limit: 10, cursor: "abc" });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("cursor=abc");
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 404);

      await expect(forumsService.getThreads("general")).rejects.toThrow(
        "Failed to fetch threads"
      );
    });
  });
});
