import { describe, it, expect, vi, afterEach } from "vitest";
import { passwordResetService } from "@/services/passwordResetService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("passwordResetService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("requestReset", () => {
    it("posts the email as JSON", async () => {
      const body = { success: true, message: "sent" };
      const fetchMock = mockFetchOnce(body);

      const result = await passwordResetService.requestReset("user@example.com");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      });
      expect(result).toEqual(body);
    });

    it("throws a specific message on 429", async () => {
      mockFetchOnce({}, false, 429);

      await expect(
        passwordResetService.requestReset("user@example.com")
      ).rejects.toThrow("Please wait before requesting another password reset");
    });

    it("throws the server-provided detail message for other errors", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 500);

      await expect(
        passwordResetService.requestReset("user@example.com")
      ).rejects.toThrow("custom error");
    });
  });

  describe("resetPassword", () => {
    it("posts the token and new_password (snake_case) as JSON", async () => {
      const body = { success: true, message: "Password reset" };
      const fetchMock = mockFetchOnce(body);

      const result = await passwordResetService.resetPassword("tok-123", "NewPass123!");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "tok-123", new_password: "NewPass123!" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Invalid or expired reset token" }, false, 400);

      await expect(
        passwordResetService.resetPassword("bad", "NewPass123!")
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });
});
