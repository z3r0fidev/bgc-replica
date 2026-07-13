import * as Sentry from "@sentry/nextjs";
import {
  AdminUserListResponse,
  AdminUserDetail,
  UserSearchParams,
  SuspendUserRequest,
  BanUserRequest,
  AdminActionLogResponse,
  AdminStatsOverview,
  AnalyticsOverview,
  SystemHealth,
  WarningListResponse,
  IssueWarningRequest,
  IssueWarningResponse,
  RevokeWarningRequest,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const adminService = {
  // Stats
  async getStats(): Promise<AdminStatsOverview> {
    return Sentry.startSpan(
      { name: "GET /api/admin/stats", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/admin/stats`, {
          headers: getAuthHeaders(),
        });
        return handleResponse<AdminStatsOverview>(response);
      }
    );
  },

  // Users
  async getUsers(params: UserSearchParams = {}): Promise<AdminUserListResponse> {
    return Sentry.startSpan(
      { name: "GET /api/admin/users", op: "http.client" },
      async () => {
        const searchParams = new URLSearchParams();
        if (params.query) searchParams.set("query", params.query);
        if (params.is_active !== undefined)
          searchParams.set("is_active", String(params.is_active));
        if (params.is_superuser !== undefined)
          searchParams.set("is_superuser", String(params.is_superuser));
        if (params.is_suspended !== undefined)
          searchParams.set("is_suspended", String(params.is_suspended));
        if (params.is_banned !== undefined)
          searchParams.set("is_banned", String(params.is_banned));
        if (params.sort_by) searchParams.set("sort_by", params.sort_by);
        if (params.sort_order) searchParams.set("sort_order", params.sort_order);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));

        const url = `${API_URL}/api/admin/users?${searchParams.toString()}`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        return handleResponse<AdminUserListResponse>(response);
      }
    );
  },

  async getUser(userId: string): Promise<AdminUserDetail> {
    return Sentry.startSpan(
      { name: `GET /api/admin/users/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse<AdminUserDetail>(response);
      }
    );
  },

  async updateUser(
    userId: string,
    data: { name?: string; is_active?: boolean; is_superuser?: boolean }
  ): Promise<AdminUserDetail> {
    return Sentry.startSpan(
      { name: `PATCH /api/admin/users/${userId}`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse<AdminUserDetail>(response);
      }
    );
  },

  async suspendUser(
    userId: string,
    data: SuspendUserRequest
  ): Promise<{ message: string; suspended_until: string }> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/suspend`, op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/suspend`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        return handleResponse(response);
      }
    );
  },

  async banUser(userId: string, data: BanUserRequest): Promise<{ message: string }> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/ban`, op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(response);
      }
    );
  },

  async restoreUser(userId: string): Promise<{ message: string }> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/restore`, op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/restore`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          }
        );
        return handleResponse(response);
      }
    );
  },

  async makeAdmin(userId: string): Promise<{ message: string }> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/make-admin`, op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/make-admin`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          }
        );
        return handleResponse(response);
      }
    );
  },

  async revokeAdmin(userId: string): Promise<{ message: string }> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/revoke-admin`, op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/revoke-admin`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          }
        );
        return handleResponse(response);
      }
    );
  },

  // Warnings
  async getUserWarnings(
    userId: string,
    params: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<WarningListResponse> {
    return Sentry.startSpan(
      { name: `GET /api/admin/users/${userId}/warnings`, op: "http.client" },
      async () => {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set("status", params.status);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));

        const url = `${API_URL}/api/admin/users/${userId}/warnings?${searchParams.toString()}`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        return handleResponse<WarningListResponse>(response);
      }
    );
  },

  async issueWarning(
    userId: string,
    data: IssueWarningRequest
  ): Promise<IssueWarningResponse> {
    return Sentry.startSpan(
      { name: `POST /api/admin/users/${userId}/warnings`, op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/warnings`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        return handleResponse<IssueWarningResponse>(response);
      }
    );
  },

  async revokeWarning(
    userId: string,
    warningId: string,
    data: RevokeWarningRequest
  ): Promise<{ message: string }> {
    return Sentry.startSpan(
      {
        name: `POST /api/admin/users/${userId}/warnings/${warningId}/revoke`,
        op: "http.client",
      },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/users/${userId}/warnings/${warningId}/revoke`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        return handleResponse(response);
      }
    );
  },

  // Action Logs
  async getActionLogs(params: {
    action?: string;
    admin_id?: string;
    target_user_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AdminActionLogResponse> {
    return Sentry.startSpan(
      { name: "GET /api/admin/action-logs", op: "http.client" },
      async () => {
        const searchParams = new URLSearchParams();
        if (params.action) searchParams.set("action", params.action);
        if (params.admin_id) searchParams.set("admin_id", params.admin_id);
        if (params.target_user_id)
          searchParams.set("target_user_id", params.target_user_id);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));

        const url = `${API_URL}/api/admin/action-logs?${searchParams.toString()}`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        return handleResponse<AdminActionLogResponse>(response);
      }
    );
  },

  // Analytics (Phase 2)
  async getAnalyticsOverview(days: number = 30): Promise<AnalyticsOverview> {
    return Sentry.startSpan(
      { name: "GET /api/admin/analytics/overview", op: "http.client" },
      async () => {
        const response = await fetch(
          `${API_URL}/api/admin/analytics/overview?days=${days}`,
          {
            headers: getAuthHeaders(),
          }
        );
        return handleResponse<AnalyticsOverview>(response);
      }
    );
  },

  // System Health (Phase 3)
  async getSystemHealth(): Promise<SystemHealth> {
    return Sentry.startSpan(
      { name: "GET /api/admin/health", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/admin/health`, {
          headers: getAuthHeaders(),
        });
        return handleResponse<SystemHealth>(response);
      }
    );
  },
};
