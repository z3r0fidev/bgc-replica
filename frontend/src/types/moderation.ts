export interface ReporterInfo {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface ReportedUserInfo {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface ReportDetail {
  id: string;
  reporter: ReporterInfo;
  content_type: "USER" | "THREAD" | "POST" | "STATUS";
  content_id: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  created_at: string;
  reviewed_by: string | null;
  reported_user: ReportedUserInfo | null;
  content_preview: string | null;
}

export interface ModerationStats {
  pending_count: number;
  resolved_today: number;
  total_reports: number;
  reports_by_type: Record<string, number>;
  reports_by_reason: Record<string, number>;
}

export type ResolveAction = "dismiss" | "warn_user" | "delete_content" | "ban_user";

export interface ResolveResponse {
  status: string;
  report_id: string;
  action: string;
  new_status: string;
}
