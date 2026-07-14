import { describe, it, expect, vi, afterEach } from "vitest";
import { twoFactorService } from "@/services/twoFactorService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("twoFactorService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getStatus", () => {
    it("fetches with credentials included", async () => {
      const body = { enabled: false, backup_codes_remaining: null };
      const fetchMock = mockFetchOnce(body);

      const result = await twoFactorService.getStatus();

      expect(fetchMock).toHaveBeenCalledWith("/api/2fa/status", { credentials: "include" });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(twoFactorService.getStatus()).rejects.toThrow("Failed to get 2FA status");
    });
  });

  describe("setup", () => {
    it("posts with credentials included", async () => {
      const body = {
        secret: "SECRET",
        qr_code: "base64",
        backup_codes: ["a"],
        provisioning_uri: "otpauth://...",
      };
      const fetchMock = mockFetchOnce(body);

      const result = await twoFactorService.setup();

      expect(fetchMock).toHaveBeenCalledWith("/api/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "2FA is already enabled" }, false, 400);

      await expect(twoFactorService.setup()).rejects.toThrow("2FA is already enabled");
    });
  });

  describe("enable", () => {
    it("posts the code as JSON with credentials included", async () => {
      const body = { success: true, message: "enabled" };
      const fetchMock = mockFetchOnce(body);

      await twoFactorService.enable("123456");

      expect(fetchMock).toHaveBeenCalledWith("/api/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: "123456" }),
      });
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Invalid verification code" }, false, 400);

      await expect(twoFactorService.enable("000000")).rejects.toThrow(
        "Invalid verification code"
      );
    });
  });

  describe("disable", () => {
    it("posts the code as JSON with credentials included", async () => {
      const body = { success: true, message: "disabled" };
      const fetchMock = mockFetchOnce(body);

      await twoFactorService.disable("123456");

      expect(fetchMock).toHaveBeenCalledWith("/api/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: "123456" }),
      });
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "2FA is not enabled" }, false, 400);

      await expect(twoFactorService.disable("123456")).rejects.toThrow("2FA is not enabled");
    });
  });

  describe("regenerateBackupCodes", () => {
    it("posts the code as JSON with credentials included", async () => {
      const body = { backup_codes: ["a", "b"] };
      const fetchMock = mockFetchOnce(body);

      const result = await twoFactorService.regenerateBackupCodes("123456");

      expect(fetchMock).toHaveBeenCalledWith("/api/2fa/backup-codes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: "123456" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 400);

      await expect(twoFactorService.regenerateBackupCodes("000000")).rejects.toThrow(
        "custom error"
      );
    });
  });

  describe("verifyLogin", () => {
    it("posts user_id and code without credentials", async () => {
      const body = { access_token: "jwt", token_type: "bearer" };
      const fetchMock = mockFetchOnce(body);

      const result = await twoFactorService.verifyLogin("user-1", "123456");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "user-1", code: "123456" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Invalid verification code" }, false, 401);

      await expect(twoFactorService.verifyLogin("user-1", "000000")).rejects.toThrow(
        "Invalid verification code"
      );
    });
  });
});
