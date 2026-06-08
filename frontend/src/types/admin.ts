export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  is_active: boolean;
  is_superuser: boolean;
  suspended_at: string | null;
  suspended_until: string | null;
  banned_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  email_verified: string | null;
  suspension_reason: string | null;
  ban_reason: string | null;
  totp_enabled: boolean;
  notification_preferences: Record<string, unknown> | null;
  updated_at: string;
  profile_display_name: string | null;
  profile_location_city: string | null;
  profile_location_state: string | null;
  profile_is_verified: boolean;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserSearchParams {
  query?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_suspended?: boolean;
  is_banned?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SuspendUserRequest {
  reason: string;
  duration_hours?: number;
}

export interface BanUserRequest {
  reason: string;
}

export interface AdminActionLogItem {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  target_user_id: string | null;
  target_user_name: string | null;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminActionLogResponse {
  items: AdminActionLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminStatsOverview {
  total_users: number;
  active_users: number;
  suspended_users: number;
  banned_users: number;
  admin_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

export interface AnalyticsUserGrowth {
  date: string;
  count: number;
}

export interface AnalyticsEngagement {
  date: string;
  posts: number;
  comments: number;
}

export interface AnalyticsOverview {
  user_growth: AnalyticsUserGrowth[];
  engagement: AnalyticsEngagement[];
  total_posts: number;
  total_comments: number;
  total_threads: number;
  total_forum_posts: number;
  verified_profiles: number;
  dau: number;
  wau: number;
  mau: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  database: {
    status: "up" | "down";
    connections: number;
    pool_size: number;
    cache_hit_ratio: number;
  };
  redis: {
    status: "up" | "down";
    memory_used: string;
    ops_per_sec: number;
    connected_clients: number;
  };
  error_count_24h: number;
  uptime_seconds: number;
}
