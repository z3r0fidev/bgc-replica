import {
  TOTPSetupResponse,
  TOTPStatusResponse,
  TOTPEnableResponse,
  BackupCodesResponse,
} from "@/types/auth";

const API_BASE = "/api/2fa";

export const twoFactorService = {
  async getStatus(): Promise<TOTPStatusResponse> {
    const response = await fetch(`${API_BASE}/status`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get 2FA status");
    }

    return response.json();
  },

  async setup(): Promise<TOTPSetupResponse> {
    const response = await fetch(`${API_BASE}/setup`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to setup 2FA");
    }

    return response.json();
  },

  async enable(code: string): Promise<TOTPEnableResponse> {
    const response = await fetch(`${API_BASE}/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to enable 2FA");
    }

    return response.json();
  },

  async disable(code: string): Promise<TOTPEnableResponse> {
    const response = await fetch(`${API_BASE}/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to disable 2FA");
    }

    return response.json();
  },

  async regenerateBackupCodes(code: string): Promise<BackupCodesResponse> {
    const response = await fetch(`${API_BASE}/backup-codes/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to regenerate backup codes");
    }

    return response.json();
  },

  async verifyLogin(userId: string, code: string): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch("/api/auth/login/2fa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Invalid verification code");
    }

    return response.json();
  },
};
