"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WarningEscalationMeterProps {
  activeCount: number;
  threshold: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Position-in-sequence color ramp: the last two segments before threshold
 * intentionally borrow the hues this app already uses for "Suspended"
 * (orange) and "Banned" (destructive) status badges, so the color itself
 * previews the consequence rather than being an arbitrary tally color.
 */
function tierForPosition(position: number, threshold: number) {
  if (position >= threshold) {
    return {
      badgeVariant: "destructive" as const,
      softTint: "",
      segment: "bg-destructive",
      text: "text-destructive",
    };
  }
  if (position === threshold - 1) {
    return {
      badgeVariant: undefined,
      softTint:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      segment: "bg-orange-500",
      text: "text-orange-800 dark:text-orange-400",
    };
  }
  return {
    badgeVariant: undefined,
    softTint: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    segment: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-400",
  };
}

function microcopy(activeCount: number, threshold: number): string {
  if (activeCount >= threshold) {
    return `Suspension threshold reached (${activeCount} of ${threshold} warnings).`;
  }
  const remaining = threshold - activeCount;
  const last = remaining === 1 ? " One more will trigger automatic suspension." : "";
  return `${activeCount} of ${threshold} warnings on record.${last}`;
}

export function WarningEscalationMeter({
  activeCount,
  threshold,
  size = "md",
  className,
}: WarningEscalationMeterProps) {
  if (activeCount <= 0) {
    return null;
  }

  const currentTier = tierForPosition(Math.min(activeCount, threshold), threshold);
  const label = `${activeCount}/${threshold}`;

  if (size === "sm" || size === "md") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {currentTier.badgeVariant ? (
              <Badge variant={currentTier.badgeVariant} className={className}>
                {label}
              </Badge>
            ) : (
              <Badge className={cn(currentTier.softTint, className)}>{label}</Badge>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{microcopy(activeCount, threshold)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Warnings</span>
        {currentTier.badgeVariant ? (
          <Badge variant={currentTier.badgeVariant}>{label}</Badge>
        ) : (
          <Badge className={currentTier.softTint}>{label}</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: threshold }, (_, i) => i + 1).map((position) => (
          <div
            key={position}
            className={cn(
              "h-2.5 flex-1 rounded-full",
              position <= activeCount
                ? tierForPosition(position, threshold).segment
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", currentTier.text)}>
        {microcopy(activeCount, threshold)}
      </p>
    </div>
  );
}
