"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificationService } from "@/services/verificationService";

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ onDismiss }: EmailVerificationBannerProps) {
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !session?.user?.email) {
    return null;
  }

  const handleResend = async () => {
    if (!session?.user?.email) return;

    setIsResending(true);
    setMessage(null);

    try {
      const result = await verificationService.resendVerification(session.user.email);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send verification email");
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <span className="font-medium">Verify your email</span>
                {" - "}
                <span className="text-yellow-700 dark:text-yellow-300">
                  Check your inbox for a verification link to unlock all features.
                </span>
              </p>
              {message && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isResending}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-700 dark:hover:bg-yellow-800/50"
            >
              <Mail className="h-4 w-4 mr-1" />
              {isResending ? "Sending..." : "Resend"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:text-yellow-200 dark:hover:bg-yellow-800/50"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
