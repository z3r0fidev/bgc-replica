export interface DeviceInfo {
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: "desktop" | "mobile" | "tablet" | null;
}

export interface Session {
  id: string;
  device_info: DeviceInfo | null;
  ip_address: string | null;
  last_active: string | null;
  created_at: string;
  expires: string;
  is_current: boolean;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
  revoked_count: number;
}

export interface RevokeAllSessionsResponse {
  success: boolean;
  message: string;
  revoked_count: number;
}
