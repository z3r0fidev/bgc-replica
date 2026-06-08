"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blockService } from "@/services/blockService";
import { ReportReason } from "@/types/block";
import { AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSuccess?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "SPAM", label: "Spam or scam" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "FAKE_PROFILE", label: "Fake or misleading profile" },
  { value: "OTHER", label: "Other" },
];

export function ReportDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onReportSuccess,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await blockService.reportUser({
        user_id: userId,
        reason: selectedReason,
        details: details || undefined,
      });
      onOpenChange(false);
      onReportSuccess?.();
      // Reset form
      setSelectedReason(null);
      setDetails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedReason(null);
    setDetails("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Report {userName}
          </DialogTitle>
          <DialogDescription>
            Help us understand what&apos;s wrong. Your report is confidential.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Why are you reporting this user?</Label>
            <div className="grid gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => setSelectedReason(reason.value)}
                  className={`w-full text-left px-4 py-2 rounded-md border transition-colors ${
                    selectedReason === reason.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReason && (
            <div className="space-y-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                placeholder="Provide any additional context that might help us review this report..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
