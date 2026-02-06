"use client";

import { useEffect, useState } from "react";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { verificationService } from "@/services/verificationService";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const status = await verificationService.getVerificationStatus();
        setShowBanner(!status.email_verified);
      } catch {
        // If we can't check status, don't show banner
        setShowBanner(false);
      }
    };

    checkVerification();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {showBanner && (
        <EmailVerificationBanner onDismiss={() => setShowBanner(false)} />
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
