import * as Sentry from "@sentry/nextjs";
import {
  BlockedUser,
  BlockStatus,
  BlockResponse,
  UserReportData,
} from "@/types/block";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const blockService = {
  async blockUser(userId: string): Promise<BlockResponse> {
    return Sentry.startSpan(
      { name: `POST /api/block/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/block/${userId}`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to block user");
        }
        return response.json();
      }
    );
  },

  async unblockUser(userId: string): Promise<BlockResponse> {
    return Sentry.startSpan(
      { name: `DELETE /api/block/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/block/${userId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to unblock user");
        }
        return response.json();
      }
    );
  },

  async getBlockedUsers(): Promise<BlockedUser[]> {
    return Sentry.startSpan(
      { name: "GET /api/block/list", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/block/list`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch blocked users");
        }
        return response.json();
      }
    );
  },

  async getBlockStatus(userId: string): Promise<BlockStatus> {
    return Sentry.startSpan(
      { name: `GET /api/block/status/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/block/status/${userId}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch block status");
        }
        return response.json();
      }
    );
  },

  async reportUser(data: UserReportData): Promise<void> {
    return Sentry.startSpan(
      { name: "POST /api/moderation/report-user", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/moderation/report-user`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to report user");
        }
        return response.json();
      }
    );
  },
};
