import {
  ReportDetail,
  ModerationStats,
  ResolveAction,
  ResolveResponse,
} from "@/types/moderation";

const API_BASE = "/api/moderation";

export const moderationService = {
  async getQueue(params?: {
    status?: string;
    content_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<ReportDetail[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status_filter", params.status);
    if (params?.content_type) searchParams.set("content_type", params.content_type);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const url = `${API_BASE}/queue${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Admin access required");
      }
      throw new Error("Failed to fetch moderation queue");
    }

    return response.json();
  },

  async getQueueCount(): Promise<{ pending_count: number }> {
    const response = await fetch(`${API_BASE}/queue/count`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch queue count");
    }

    return response.json();
  },

  async getStats(): Promise<ModerationStats> {
    const response = await fetch(`${API_BASE}/stats`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch moderation stats");
    }

    return response.json();
  },

  async getReportDetail(reportId: string): Promise<ReportDetail> {
    const response = await fetch(`${API_BASE}/report/${reportId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch report details");
    }

    return response.json();
  },

  async resolveReport(
    reportId: string,
    action: ResolveAction
  ): Promise<ResolveResponse> {
    const response = await fetch(`${API_BASE}/resolve/${reportId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to resolve report");
    }

    return response.json();
  },

  async bulkResolve(
    reportIds: string[],
    action: ResolveAction
  ): Promise<{ resolved_count: number }> {
    const response = await fetch(`${API_BASE}/bulk-resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ report_ids: reportIds, action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to bulk resolve reports");
    }

    return response.json();
  },
};
