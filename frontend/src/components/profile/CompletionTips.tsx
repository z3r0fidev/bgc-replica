"use client";

import { CompletionTip } from "@/types/profile";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionTipsProps {
  tips: CompletionTip[];
  onTipClick?: (tip: CompletionTip) => void;
  className?: string;
}

const categoryColors = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  important: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  nice_to_have: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const categoryLabels = {
  critical: "High Impact",
  important: "Medium Impact",
  nice_to_have: "Nice to Have",
};

export function CompletionTips({ tips, onTipClick, className }: CompletionTipsProps) {
  if (tips.length === 0) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground", className)}>
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm font-medium">Your profile is looking great!</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-500" />
        Quick Wins
      </h4>
      <ul className="space-y-1">
        {tips.map((tip) => (
          <li key={tip.field}>
            <button
              onClick={() => onTipClick?.(tip)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-md",
                "hover:bg-muted/50 transition-colors text-left",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{tip.label}</span>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] shrink-0", categoryColors[tip.category])}
                >
                  {categoryLabels[tip.category]}
                </Badge>
                {tip.quick_win && (
                  <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                <span className="text-xs">+{tip.weight.toFixed(1)}%</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
