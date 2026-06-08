import { VerificationResponse } from "@/types/auth";

const API_BASE = "/api/auth";

export const passwordResetService = {
  async requestReset(email: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_BASE}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Please wait before requesting another password reset");
      }
      const error = await response.json();
      throw new Error(error.detail || "Failed to request password reset");
    }

    return response.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<VerificationResponse> {
    const response = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to reset password");
    }

    return response.json();
  },
};
