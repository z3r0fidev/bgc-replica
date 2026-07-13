"use client";

import { MilestoneStatus, FeatureUnlock } from "@/types/profile";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sprout, Compass, Star, Trophy, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestoneTrackerProps {
  milestones: MilestoneStatus[];
  currentMilestone: string;
  nextMilestone?: string;
  featureUnlocks: FeatureUnlock[];
  className?: string;
}

const milestoneIcons = {
  seedling: Sprout,
  compass: Compass,
  star: Star,
  trophy: Trophy,
};

export function MilestoneTracker({
  milestones,
  currentMilestone,
  nextMilestone,
  featureUnlocks,
  className,
}: MilestoneTrackerProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Milestone Badges */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center justify-between">
          <span>Milestones</span>
          {currentMilestone !== "None" && (
            <span className="text-xs text-muted-foreground">
              Current: <span className="font-medium text-primary">{currentMilestone}</span>
            </span>
          )}
        </h4>
        <div className="flex items-center justify-between gap-2">
          <TooltipProvider>
            {milestones.map((milestone) => {
              const Icon = milestoneIcons[milestone.badge_icon];
              return (
                <Tooltip key={milestone.level}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                        milestone.reached
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-full",
                          milestone.reached
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium">{milestone.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.threshold}% completion required
                    </p>
                    {milestone.reached && (
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" /> Achieved!
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        {nextMilestone && (
          <p className="text-xs text-muted-foreground text-center">
            Next: <span className="font-medium">{nextMilestone}</span>
          </p>
        )}
      </div>

      {/* Feature Unlocks */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Features</h4>
        <div className="space-y-1">
          {featureUnlocks.map((feature) => (
            <div
              key={feature.threshold}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md text-sm",
                feature.unlocked
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-muted/30 text-muted-foreground"
              )}
            >
              {feature.unlocked ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{feature.name}</p>
                <p className="text-xs opacity-80 truncate">{feature.description}</p>
              </div>
              <Badge
                variant={feature.unlocked ? "default" : "secondary"}
                className="ml-auto shrink-0 text-[10px]"
              >
                {feature.threshold}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
