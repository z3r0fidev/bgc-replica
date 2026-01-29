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
