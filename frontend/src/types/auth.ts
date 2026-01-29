export interface VerificationStatus {
  email_verified: boolean;
  verified_at: string | null;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
}
