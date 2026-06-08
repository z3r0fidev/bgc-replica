import { VerificationResponse, VerificationStatus } from "@/types/auth";

const API_BASE = "/api/auth";

export const verificationService = {
  async verifyEmail(token: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_BASE}/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to verify email");
    }

    return response.json();
  },

  async resendVerification(email: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_BASE}/resend-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Please wait before requesting another verification email");
      }
      const error = await response.json();
      throw new Error(error.detail || "Failed to resend verification");
    }

    return response.json();
  },

  async getVerificationStatus(): Promise<VerificationStatus> {
    const response = await fetch(`${API_BASE}/verification-status`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get verification status");
    }

    return response.json();
  },
};
