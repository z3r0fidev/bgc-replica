import {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationPreferencesResponse,
} from "@/types/notification";

const API_BASE = "/api/notifications";

export const notificationService = {
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await fetch(`${API_BASE}/preferences`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notification preferences");
    }

    return response.json();
  },

  async updatePreferences(
    updates: NotificationPreferencesUpdate
  ): Promise<NotificationPreferencesResponse> {
    const response = await fetch(`${API_BASE}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update notification preferences");
    }

    return response.json();
  },

  async resetPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await fetch(`${API_BASE}/preferences/reset`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to reset notification preferences");
    }

    return response.json();
  },

  async toggleAllEmail(
    enabled: boolean
  ): Promise<{ status: string; message: string; preferences: NotificationPreferences }> {
    const response = await fetch(`${API_BASE}/preferences/email-all?enabled=${enabled}`, {
      method: "PUT",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to toggle email notifications");
    }

    return response.json();
  },
};
