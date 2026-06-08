"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verificationService } from "@/services/verificationService";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(() =>
    token ? "loading" : "no-token"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyToken = async () => {
      try {
        const result = await verificationService.verifyEmail(token);
        setStatus("success");
        setMessage(result.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed");
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground">Verifying your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                  <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-green-600 dark:text-green-500">
                  Email Verified!
                </h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login...
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Login</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                  <XCircle className="h-16 w-16 text-red-600 dark:text-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-500">
                  Verification Failed
                </h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The verification link may be expired or invalid.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </>
          )}

          {status === "no-token" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <Mail className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Check Your Email</h2>
                <p className="text-muted-foreground">
                  We sent a verification link to your email address. Click the link to
                  verify your account.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or request a new link.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
