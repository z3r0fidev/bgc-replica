"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Fingerprint,
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { twoFactorService } from "@/services/twoFactorService";
import { TOTPSetupResponse, TOTPStatusResponse } from "@/types/auth";

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<TOTPStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TOTPSetupResponse | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await twoFactorService.getStatus();
      setStatus(data);
    } catch {
      toast.error("Failed to load 2FA status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    setIsSubmitting(true);
    try {
      const data = await twoFactorService.setup();
      setSetupData(data);
      setShowSetupDialog(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Setup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnable = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);
    try {
      await twoFactorService.enable(verificationCode);
      toast.success("Two-factor authentication enabled!");
      setShowSetupDialog(false);
      setVerificationCode("");
      setSetupData(null);
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode) {
      toast.error("Please enter a verification code");
      return;
    }

    setIsSubmitting(true);
    try {
      await twoFactorService.disable(verificationCode);
      toast.success("Two-factor authentication disabled");
      setShowDisableDialog(false);
      setVerificationCode("");
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disable 2FA");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode) {
      toast.error("Please enter your 2FA code");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await twoFactorService.regenerateBackupCodes(verificationCode);
      setNewBackupCodes(data.backup_codes);
      setVerificationCode("");
      fetchStatus();
      toast.success("Backup codes regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate codes");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCodes = async (codes: string[]) => {
    await navigator.clipboard.writeText(codes.join("\n"));
    toast.success("All codes copied to clipboard");
  };

  const handleRegisterPasskey = async () => {
    toast.info("Passkey registration will be implemented here.");
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Security Settings</h1>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a
            verification code in addition to your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-full ${
                  status?.enabled
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {status?.enabled ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <ShieldOff className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">
                  {status?.enabled
                    ? `Enabled • ${status.backup_codes_remaining} backup codes remaining`
                    : "Use Google Authenticator, Authy, or similar"}
                </p>
              </div>
            </div>
            {status?.enabled ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBackupCodesDialog(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button onClick={handleSetup} disabled={isSubmitting}>
                {isSubmitting ? "Setting up..." : "Enable"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Passkeys Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Add a Passkey to your account for faster and more secure logins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Passkeys</p>
                <p className="text-sm text-muted-foreground">
                  Use FaceID, TouchID or hardware keys
                </p>
              </div>
            </div>
            <Button onClick={handleRegisterPasskey}>Register</Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the
              verification code to complete setup.
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={`data:image/png;base64,${setupData.qr_code}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret, -1)}
                  >
                    {copiedIndex === -1 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Backup Codes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Save these backup codes:
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAllCodes(setupData.backup_codes)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy all
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                  {setupData.backup_codes.map((code, i) => (
                    <code key={i} className="text-xs font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Store these codes securely. Each can only be used once.
                </p>
              </div>

              {/* Verification Input */}
              <div className="space-y-2">
                <Label htmlFor="code">Enter verification code</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnable} disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Enable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your authenticator code or a backup code to disable 2FA.
              This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification code</Label>
              <Input
                id="disable-code"
                placeholder="Enter code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setVerificationCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog
        open={showBackupCodesDialog}
        onOpenChange={(open) => {
          setShowBackupCodesDialog(open);
          if (!open) {
            setNewBackupCodes(null);
            setVerificationCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes
                ? "Save these new backup codes securely. Your old codes are now invalid."
                : "Regenerate backup codes if you've lost access to your existing ones."}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">New backup codes:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyAllCodes(newBackupCodes)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy all
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {newBackupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono">
                    {code}
                  </code>
                ))}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Each code can only be used once. Store them securely.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have {status?.backup_codes_remaining || 0} backup codes
                remaining. Enter your authenticator code to generate new ones.
              </p>
              <div className="space-y-2">
                <Label htmlFor="regen-code">Authenticator code</Label>
                <Input
                  id="regen-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBackupCodesDialog(false);
                setNewBackupCodes(null);
                setVerificationCode("");
              }}
            >
              {newBackupCodes ? "Done" : "Cancel"}
            </Button>
            {!newBackupCodes && (
              <Button
                onClick={handleRegenerateBackupCodes}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Generating..." : "Regenerate Codes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
