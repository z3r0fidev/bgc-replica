import {
  SessionListResponse,
  RevokeSessionResponse,
  RevokeAllSessionsResponse,
} from "@/types/session";

const API_BASE = "/api/sessions";

export const sessionService = {
  async listSessions(): Promise<SessionListResponse> {
    const response = await fetch(API_BASE, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch sessions");
    }

    return response.json();
  },

  async revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
    const response = await fetch(`${API_BASE}/${sessionId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to revoke session");
    }

    return response.json();
  },

  async revokeAllSessions(): Promise<RevokeAllSessionsResponse> {
    const response = await fetch(API_BASE, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to revoke sessions");
    }

    return response.json();
  },
};
