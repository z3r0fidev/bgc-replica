import { describe, it, expect, vi, afterEach } from "vitest";
import { verificationService } from "@/services/verificationService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("verificationService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("verifyEmail", () => {
    it("posts the token as JSON", async () => {
      const body = { success: true, message: "Email verified successfully" };
      const fetchMock = mockFetchOnce(body);

      const result = await verificationService.verifyEmail("tok-123");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "tok-123" }),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "Invalid or expired verification token" }, false, 400);

      await expect(verificationService.verifyEmail("bad")).rejects.toThrow(
        "Invalid or expired verification token"
      );
    });
  });

  describe("resendVerification", () => {
    it("posts the email as JSON", async () => {
      const body = { success: true, message: "sent" };
      const fetchMock = mockFetchOnce(body);

      await verificationService.resendVerification("user@example.com");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      });
    });

    it("throws a specific message on 429 without reading the body as detail", async () => {
      mockFetchOnce({ detail: "ignored" }, false, 429);

      await expect(
        verificationService.resendVerification("user@example.com")
      ).rejects.toThrow("Please wait before requesting another verification email");
    });

    it("throws the server-provided detail message for other errors", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 500);

      await expect(
        verificationService.resendVerification("user@example.com")
      ).rejects.toThrow("custom error");
    });
  });

  describe("getVerificationStatus", () => {
    it("fetches with credentials included", async () => {
      const body = { email_verified: true, verified_at: "2026-01-01T00:00:00Z" };
      const fetchMock = mockFetchOnce(body);

      const result = await verificationService.getVerificationStatus();

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/verification-status", {
        credentials: "include",
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(verificationService.getVerificationStatus()).rejects.toThrow(
        "Failed to get verification status"
      );
    });
  });
});
