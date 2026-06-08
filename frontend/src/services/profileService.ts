import * as Sentry from "@sentry/nextjs";
import { Profile, PrivacySettings } from "@/types/profile";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const profileService = {
  async getMyProfile(): Promise<Profile> {
    return Sentry.startSpan(
      { name: "GET /api/profiles/me", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/profiles/me`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        return response.json();
      }
    );
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    return Sentry.startSpan(
      { name: "PATCH /api/profiles/me", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/profiles/me`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to update profile");
        }
        return response.json();
      }
    );
  },

  async updatePrivacySettings(
    settings: PrivacySettings
  ): Promise<{ status: string; privacy_settings: PrivacySettings }> {
    return Sentry.startSpan(
      { name: "PUT /api/profiles/me/privacy", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/profiles/me/privacy`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(settings),
        });
        if (!response.ok) {
          throw new Error("Failed to update privacy settings");
        }
        return response.json();
      }
    );
  },

  async getPublicProfile(userId: string): Promise<Profile> {
    return Sentry.startSpan(
      { name: `GET /api/profiles/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/profiles/${userId}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        return response.json();
      }
    );
  },
};
