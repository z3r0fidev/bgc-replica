import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { adminService } from "@/services/adminService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchOnceJsonThrows(ok = false, status = 500) {
  // Simulates a non-JSON error body (e.g. an HTML error page from a proxy).
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("adminService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("shared response handling", () => {
    it("falls back to a generic message when the error body isn't JSON", async () => {
      mockFetchOnceJsonThrows(false, 502);

      await expect(adminService.getStats()).rejects.toThrow("Request failed");
    });

    it("includes a Bearer Authorization header when a token is stored", async () => {
      localStorage.setItem("access_token", "jwt-abc");
      const fetchMock = mockFetchOnce({ total_users: 1 });

      await adminService.getStats();

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer jwt-abc");
    });
  });

  describe("getStats", () => {
    it("fetches the stats endpoint", async () => {
      const body = { total_users: 10 };
      const fetchMock = mockFetchOnce(body);

      const result = await adminService.getStats();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/stats"),
        expect.any(Object)
      );
      expect(result).toEqual(body);
    });
  });

  describe("getUsers", () => {
    it("builds query params only for provided filters", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, limit: 20, offset: 0 });

      await adminService.getUsers({ query: "alice", is_active: true, limit: 10 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("query=alice");
      expect(calledUrl).toContain("is_active=true");
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).not.toContain("is_banned");
    });

    it("omits all filter params when none are provided", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, limit: 20, offset: 0 });

      await adminService.getUsers();

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`${calledUrl.split("?")[0]}?`);
    });

    it("includes is_superuser, is_suspended, is_banned, sort_by, and sort_order when provided", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, limit: 20, offset: 0 });

      await adminService.getUsers({
        is_superuser: true,
        is_suspended: true,
        is_banned: false,
        sort_by: "created_at",
        sort_order: "desc",
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("is_superuser=true");
      expect(calledUrl).toContain("is_suspended=true");
      expect(calledUrl).toContain("is_banned=false");
      expect(calledUrl).toContain("sort_by=created_at");
      expect(calledUrl).toContain("sort_order=desc");
    });
  });

  describe("getUser", () => {
    it("fetches the user by id", async () => {
      const fetchMock = mockFetchOnce({ id: "user-1" });

      await adminService.getUser("user-1");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users/user-1"),
        expect.any(Object)
      );
    });
  });

  describe("updateUser", () => {
    it("sends a PATCH with the update body", async () => {
      const fetchMock = mockFetchOnce({ id: "user-1" });
      const data = { name: "New Name" };

      await adminService.updateUser("user-1", data);

      const call = fetchMock.mock.calls[0];
      expect(call[1].method).toBe("PATCH");
      expect(call[1].body).toBe(JSON.stringify(data));
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Cannot remove your own admin status" }, false, 400);

      await expect(
        adminService.updateUser("user-1", { is_superuser: false })
      ).rejects.toThrow("Cannot remove your own admin status");
    });
  });

  describe("suspendUser", () => {
    it("posts the suspend request body", async () => {
      const fetchMock = mockFetchOnce({ message: "ok", suspended_until: "2026-01-01" });
      const data = { reason: "Spamming", duration_hours: 24 };

      await adminService.suspendUser("user-1", data);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/api/admin/users/user-1/suspend");
      expect(call[1].method).toBe("POST");
      expect(call[1].body).toBe(JSON.stringify(data));
    });
  });

  describe("banUser", () => {
    it("posts the ban request body", async () => {
      const fetchMock = mockFetchOnce({ message: "ok" });
      const data = { reason: "TOS violation" };

      await adminService.banUser("user-1", data);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/api/admin/users/user-1/ban");
      expect(call[1].body).toBe(JSON.stringify(data));
    });
  });

  describe("restoreUser", () => {
    it("posts to the restore endpoint", async () => {
      const fetchMock = mockFetchOnce({ message: "ok" });

      await adminService.restoreUser("user-1");

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/api/admin/users/user-1/restore");
      expect(call[1].method).toBe("POST");
    });
  });

  describe("makeAdmin / revokeAdmin", () => {
    it("posts to the make-admin endpoint", async () => {
      const fetchMock = mockFetchOnce({ message: "ok" });

      await adminService.makeAdmin("user-1");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users/user-1/make-admin"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("posts to the revoke-admin endpoint", async () => {
      const fetchMock = mockFetchOnce({ message: "ok" });

      await adminService.revokeAdmin("user-1");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users/user-1/revoke-admin"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("getUserWarnings", () => {
    it("builds query params from provided filters", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, active_count: 0, threshold: 3, limit: 20, offset: 0 });

      await adminService.getUserWarnings("user-1", {
        status: "ACTIVE",
        limit: 5,
        offset: 10,
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/admin/users/user-1/warnings");
      expect(calledUrl).toContain("status=ACTIVE");
      expect(calledUrl).toContain("limit=5");
      expect(calledUrl).toContain("offset=10");
    });
  });

  describe("issueWarning", () => {
    it("posts the warning request body", async () => {
      const fetchMock = mockFetchOnce({ warning: {}, escalated: false, active_count: 1 });
      const data = { reason: "Inappropriate content", severity: "STANDARD", notify: true };

      await adminService.issueWarning("user-1", data);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/api/admin/users/user-1/warnings");
      expect(call[1].body).toBe(JSON.stringify(data));
    });
  });

  describe("revokeWarning", () => {
    it("posts to the revoke warning endpoint", async () => {
      const fetchMock = mockFetchOnce({ message: "ok" });
      const data = { reason: "Issued in error" };

      await adminService.revokeWarning("user-1", "warn-1", data);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/api/admin/users/user-1/warnings/warn-1/revoke");
      expect(call[1].body).toBe(JSON.stringify(data));
    });
  });

  describe("getActionLogs", () => {
    it("builds query params from provided filters", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, limit: 50, offset: 0 });

      await adminService.getActionLogs({ action: "BAN_USER", admin_id: "admin-1" });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("action=BAN_USER");
      expect(calledUrl).toContain("admin_id=admin-1");
    });

    it("includes target_user_id, limit, and offset when provided", async () => {
      const fetchMock = mockFetchOnce({ items: [], total: 0, limit: 50, offset: 0 });

      await adminService.getActionLogs({
        target_user_id: "user-1",
        limit: 25,
        offset: 5,
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("target_user_id=user-1");
      expect(calledUrl).toContain("limit=25");
      expect(calledUrl).toContain("offset=5");
    });
  });

  describe("getAnalyticsOverview", () => {
    it("defaults to 30 days", async () => {
      const fetchMock = mockFetchOnce({});

      await adminService.getAnalyticsOverview();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("days=30"),
        expect.any(Object)
      );
    });

    it("accepts a custom day count", async () => {
      const fetchMock = mockFetchOnce({});

      await adminService.getAnalyticsOverview(7);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("days=7"),
        expect.any(Object)
      );
    });
  });

  describe("getSystemHealth", () => {
    it("fetches the health endpoint", async () => {
      const body = { status: "healthy" };
      const fetchMock = mockFetchOnce(body);

      const result = await adminService.getSystemHealth();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/health"),
        expect.any(Object)
      );
      expect(result).toEqual(body);
    });
  });
});
