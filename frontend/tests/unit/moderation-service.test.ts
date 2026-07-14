import { describe, it, expect, vi, afterEach } from "vitest";
import { moderationService } from "@/services/moderationService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("moderationService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getQueue", () => {
    it("fetches the base queue URL with no params", async () => {
      const fetchMock = mockFetchOnce([]);

      await moderationService.getQueue();

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/queue", {
        credentials: "include",
      });
    });

    it("builds query params from provided filters", async () => {
      const fetchMock = mockFetchOnce([]);

      await moderationService.getQueue({
        status: "PENDING",
        content_type: "POST",
        limit: 10,
        offset: 5,
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("status_filter=PENDING");
      expect(calledUrl).toContain("content_type=POST");
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("throws a specific message on 403", async () => {
      mockFetchOnce({}, false, 403);

      await expect(moderationService.getQueue()).rejects.toThrow("Admin access required");
    });

    it("throws a generic message for other errors", async () => {
      mockFetchOnce({}, false, 500);

      await expect(moderationService.getQueue()).rejects.toThrow(
        "Failed to fetch moderation queue"
      );
    });
  });

  describe("getQueueCount", () => {
    it("fetches with credentials included", async () => {
      const body = { pending_count: 3 };
      const fetchMock = mockFetchOnce(body);

      const result = await moderationService.getQueueCount();

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/queue/count", {
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(moderationService.getQueueCount()).rejects.toThrow(
        "Failed to fetch queue count"
      );
    });
  });

  describe("getStats", () => {
    it("fetches with credentials included", async () => {
      const fetchMock = mockFetchOnce({ pending_count: 0 });

      await moderationService.getStats();

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/stats", {
        credentials: "include",
      });
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(moderationService.getStats()).rejects.toThrow(
        "Failed to fetch moderation stats"
      );
    });
  });

  describe("getReportDetail", () => {
    it("fetches the report by id", async () => {
      const fetchMock = mockFetchOnce({ id: "report-1" });

      await moderationService.getReportDetail("report-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/report/report-1", {
        credentials: "include",
      });
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 404);

      await expect(moderationService.getReportDetail("report-1")).rejects.toThrow(
        "Failed to fetch report details"
      );
    });
  });

  describe("resolveReport", () => {
    it("posts the action as JSON with credentials included", async () => {
      const body = { status: "RESOLVED", report_id: "report-1" };
      const fetchMock = mockFetchOnce(body);

      const result = await moderationService.resolveReport("report-1", "dismiss");

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/resolve/report-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "dismiss" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 400);

      await expect(
        moderationService.resolveReport("report-1", "ban_user")
      ).rejects.toThrow("custom error");
    });
  });

  describe("bulkResolve", () => {
    it("posts report_ids and action as JSON with credentials included", async () => {
      const body = { resolved_count: 2 };
      const fetchMock = mockFetchOnce(body);

      const result = await moderationService.bulkResolve(["r1", "r2"], "dismiss");

      expect(fetchMock).toHaveBeenCalledWith("/api/moderation/bulk-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ report_ids: ["r1", "r2"], action: "dismiss" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 400);

      await expect(moderationService.bulkResolve(["r1"], "dismiss")).rejects.toThrow(
        "custom error"
      );
    });
  });
});
