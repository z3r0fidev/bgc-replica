"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetService } from "@/services/passwordResetService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await passwordResetService.requestReset(email);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground">
                If an account exists for <span className="font-medium">{email}</span>,
                you will receive a password reset link shortly.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
                className="w-full"
              >
                Try another email
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Forgot password?</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
