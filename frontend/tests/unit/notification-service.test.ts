import { describe, it, expect, vi, afterEach } from "vitest";
import { notificationService } from "@/services/notificationService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("notificationService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getPreferences", () => {
    it("fetches with credentials included", async () => {
      const body = { preferences: {} };
      const fetchMock = mockFetchOnce(body);

      const result = await notificationService.getPreferences();

      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/preferences", {
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(notificationService.getPreferences()).rejects.toThrow(
        "Failed to fetch notification preferences"
      );
    });
  });

  describe("updatePreferences", () => {
    it("sends a PUT with the update body and credentials included", async () => {
      const body = { preferences: { email_messages: false } };
      const fetchMock = mockFetchOnce(body);
      const updates = { email_messages: false };

      const result = await notificationService.updatePreferences(updates);

      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(
        notificationService.updatePreferences({ email_messages: false })
      ).rejects.toThrow("Failed to update notification preferences");
    });
  });

  describe("resetPreferences", () => {
    it("posts to the reset endpoint with credentials included", async () => {
      const body = { preferences: {} };
      const fetchMock = mockFetchOnce(body);

      const result = await notificationService.resetPreferences();

      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/preferences/reset", {
        method: "POST",
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(notificationService.resetPreferences()).rejects.toThrow(
        "Failed to reset notification preferences"
      );
    });
  });

  describe("toggleAllEmail", () => {
    it("includes the enabled flag as a query param", async () => {
      const body = { status: "ok", message: "done", preferences: {} };
      const fetchMock = mockFetchOnce(body);

      await notificationService.toggleAllEmail(true);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/preferences/email-all?enabled=true",
        { method: "PUT", credentials: "include" }
      );
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(notificationService.toggleAllEmail(false)).rejects.toThrow(
        "Failed to toggle email notifications"
      );
    });
  });
});
