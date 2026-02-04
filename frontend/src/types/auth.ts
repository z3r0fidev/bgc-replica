export interface VerificationStatus {
  email_verified: boolean;
  verified_at: string | null;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

// Two-Factor Authentication Types

export interface TOTPSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
  provisioning_uri: string;
}

export interface TOTPStatusResponse {
  enabled: boolean;
  backup_codes_remaining: number | null;
}

export interface TOTPEnableResponse {
  success: boolean;
  message: string;
}

export interface BackupCodesResponse {
  backup_codes: string[];
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  requires_2fa?: boolean;
  user_id?: string;
  message?: string;
}
