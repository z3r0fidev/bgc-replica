"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WarningItem } from "@/types/admin";

interface WarningHistoryListProps {
  warnings: WarningItem[];
  threshold: number;
}

const BORDER_BY_TIER = [
  "border-amber-500/60",
  "border-orange-500/60",
  "border-destructive/60",
];

function borderClassForPosition(position: number, threshold: number): string {
  if (position >= threshold) return BORDER_BY_TIER[2];
  if (position === threshold - 1) return BORDER_BY_TIER[1];
  return BORDER_BY_TIER[0];
}

function iconChipClassForPosition(position: number, threshold: number): string {
  if (position >= threshold) {
    return "bg-destructive/10 text-destructive";
  }
  if (position === threshold - 1) {
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400";
  }
  return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function WarningHistoryList({ warnings, threshold }: WarningHistoryListProps) {
  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
        <p className="text-sm font-medium">No warnings on record</p>
        <p className="text-xs text-muted-foreground">This user has a clean record.</p>
      </div>
    );
  }

  // Items arrive newest-first; assign a chronological "N of threshold" label.
  const total = warnings.length;

  return (
    <div className="space-y-3">
      {warnings.map((warning, index) => {
        const position = total - index;
        return (
          <div
            key={warning.id}
            className={cn(
              "flex items-start gap-3 p-3 bg-muted/50 rounded-lg border-l-4",
              borderClassForPosition(position, threshold)
            )}
          >
            <div
              className={cn(
                "p-2 rounded-full shrink-0",
                iconChipClassForPosition(position, threshold)
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  Warning {position} of {threshold}
                </Badge>
                {warning.status !== "ACTIVE" && (
                  <Badge variant="secondary">{warning.status}</Badge>
                )}
                {warning.triggered_escalation && (
                  <Badge variant="destructive">Triggered Suspension</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDate(warning.created_at)}
                </span>
              </div>
              <p className="text-sm mt-1">By: {warning.admin_name || "System"}</p>
              <p className="text-sm text-muted-foreground mt-1">{warning.reason}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
