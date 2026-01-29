export interface BlockedUser {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  blocked_at: string;
}

export interface BlockStatus {
  is_blocked: boolean;
  blocked_by_me: boolean;
  blocked_by_them: boolean;
}

export interface BlockResponse {
  success: boolean;
  message: string;
}

export type ReportReason =
  | "HARASSMENT"
  | "SPAM"
  | "INAPPROPRIATE"
  | "FAKE_PROFILE"
  | "OTHER";

export interface UserReportData {
  user_id: string;
  reason: ReportReason;
  details?: string;
}
